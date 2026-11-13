"""Independent metadata intake. Publication holds never gate source discovery.

No publication, model, image or production-write capability is implemented here.
SQLite commits each result separately so a failed source/site cannot roll back peers.
"""
import concurrent.futures, datetime, hashlib, json, sqlite3, time
from pathlib import Path
import collector

def canonical_url(value):
    from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode
    p = collector.safe(value)
    query = [(k,v) for k,v in parse_qsl(p.query, keep_blank_values=True)
             if not k.lower().startswith('utm_') and k.lower() not in ('fbclid','gclid')]
    return urlunsplit((p.scheme,p.netloc.lower(),p.path or '/',urlencode(sorted(query)),''))

def connect(path):
    db = sqlite3.connect(path)
    db.executescript('''
      CREATE TABLE IF NOT EXISTS source_state(site TEXT, source TEXT, attempt INTEGER DEFAULT 0,
        next_attempt REAL DEFAULT 0, receipt TEXT, PRIMARY KEY(site,source));
      CREATE TABLE IF NOT EXISTS items(site TEXT, source TEXT, fingerprint TEXT, record TEXT,
        first_seen TEXT, PRIMARY KEY(site,fingerprint));
      CREATE TABLE IF NOT EXISTS publication_holds(site TEXT PRIMARY KEY, reason TEXT);
      CREATE TABLE IF NOT EXISTS runs(id TEXT PRIMARY KEY, started TEXT, completed TEXT, trigger TEXT);
    ''')
    return db

def guarded_probe(source, now):
    try:
        if source.get('articlePathPattern'):
            import html_index
            return html_index.collect(source,now)
        return collector.probe(source, {}, now)
    except Exception as exc:
        # probe validates candidate URL before its own try block. Catch that and
        # all parser/adapter exceptions at the future boundary, not at batch level.
        return {'id':source.get('id','unknown'),'name':source.get('name','Unknown'),
                'status':'error','checkedAt':now,'items':0,'feeds':[],
                'errors':[{'stage':'adapter','reason':type(exc).__name__+': '+str(exc)[:180]}]}, []

def run(config, db_path, output, probe=guarded_probe, clock=time.time):
    output = Path(output); output.mkdir(parents=True, exist_ok=True)
    db = connect(db_path)
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    run_id = now
    import os
    trigger=os.environ.get('GITHUB_EVENT_NAME','local-real-fetch')
    db.execute('INSERT INTO runs VALUES(?,?,NULL,?)',(run_id,now,trigger))
    db.commit()
    results=[]; futures={}
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        for site in config['sites']:
            # Holds are recorded for the handoff only. They are deliberately not
            # queried as a prerequisite for read-only discovery.
            if site.get('publicationHold'):
                db.execute('INSERT OR REPLACE INTO publication_holds VALUES(?,?)',
                           (site['site'],site['publicationHold']))
            for source in site['sources']:
                config_sha=hashlib.sha256(json.dumps(source,sort_keys=True).encode()).hexdigest()
                prior=db.execute('SELECT attempt,next_attempt,receipt FROM source_state WHERE site=? AND source=?',
                                 (site['site'],source['id'])).fetchone()
                if prior and json.loads(prior[2]).get('configSha256')!=config_sha:prior=None
                if prior and prior[1]>clock():
                    results.append({'site':site['site'],'sourceId':source['id'],'status':'backoff',
                                    'nextAttemptEpoch':prior[1],'previousReceipt':json.loads(prior[2])})
                    continue
                futures[pool.submit(probe,source,now)]=(site,source,prior)
        db.commit()
        for future in concurrent.futures.as_completed(futures):
            site,source,prior=futures[future]
            try: receipt,items=future.result()
            except Exception as exc:
                receipt={'status':'error','errors':[{'stage':'future','reason':type(exc).__name__}]};items=[]
            receipt.update(site=site['site'],sourceId=source['id'],runId=run_id)
            receipt['configSha256']=hashlib.sha256(json.dumps(source,sort_keys=True).encode()).hexdigest()
            receipt['newItems']=0
            for item in items:
                try:
                    url=canonical_url(item['url']);fingerprint=hashlib.sha256(url.encode()).hexdigest()
                    item.update(canonicalSourceUrl=url,sourceName=source['name'],publicationEligible=False)
                    cur=db.execute('INSERT OR IGNORE INTO items VALUES(?,?,?,?,?)',
                        (site['site'],source['id'],fingerprint,json.dumps(item),now))
                    receipt['newItems']+=cur.rowcount
                except Exception as exc:
                    receipt.setdefault('itemErrors',[]).append(type(exc).__name__+': '+str(exc)[:100])
            failures=0 if receipt.get('status') in ('fetched','html-index-fetched') else (prior[0] if prior else 0)+1
            next_attempt=0 if not failures else clock()+min(21600,300*2**min(failures-1,6))
            db.execute('INSERT OR REPLACE INTO source_state VALUES(?,?,?,?,?)',
                       (site['site'],source['id'],failures,next_attempt,json.dumps(receipt)))
            db.commit()
            results.append(receipt)
            print(site['site'],source['name'],receipt.get('status'),receipt['newItems'],flush=True)
    db.execute('UPDATE runs SET completed=? WHERE id=?',
               (datetime.datetime.now(datetime.timezone.utc).isoformat(),run_id));db.commit()
    report={'runId':run_id,'trigger':trigger,'scheduledContinuityVerified':False,
            'providerRunUrl':('https://github.com/'+os.environ['GITHUB_REPOSITORY']+'/actions/runs/'+os.environ['GITHUB_RUN_ID']) if os.environ.get('GITHUB_RUN_ID') else None,
            'publicationCount':0,'sources':results,'sites':[]}
    for site in config['sites']:
        items=[json.loads(x[0]) for x in db.execute('SELECT record FROM items WHERE site=?',(site['site'],))]
        dated=[i for i in items if i.get('sourcePublishedAt') and i['sourcePublishedAt']<=now]
        latest=max(dated,key=lambda i:i['sourcePublishedAt']) if dated else None
        handoff={**site,'observedAt':now,'sourceReceipts':[r for r in results if r['site']==site['site']],
                 'queuedMetadataItems':len(items),'latestDatedDiscoveryItem':latest,
                 'livePublicationVerified':False,'publicationEligible':False,
                 'nextAction':'Existing sole writer validates exact facts, original writing, site policy, duplicates and media rights; retains all production holds.',
                 'scheduledContinuityVerified':False}
        (output/(site['site']+'.json')).write_text(json.dumps(handoff,indent=2)+'\n')
        report['sites'].append({'site':site['site'],'queuedMetadataItems':len(items),'latest':latest})
        print('SITE_RECEIPT '+json.dumps({'site':site['site'],'queuedMetadataItems':len(items),
              'latest':latest,'livePublicationVerified':False}),flush=True)
    (output/'discovery-report.json').write_text(json.dumps(report,indent=2)+'\n')
    db.close();return report

if __name__=='__main__':
    import argparse
    p=argparse.ArgumentParser();p.add_argument('--config',required=True);p.add_argument('--db',required=True);p.add_argument('--output',required=True)
    args=p.parse_args();run(json.loads(Path(args.config).read_text()),args.db,args.output)
