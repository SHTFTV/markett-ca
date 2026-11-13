"""Explicit same-publisher HTML adapters; retain dates only from article metadata."""
import datetime,hashlib,html,json,re,urllib.parse
import collector

def collect(source,now):
    url=source['officialCandidateUrl'];host=collector.safe(url).hostname
    hosts={host,host.removeprefix('www.'),'www.'+host.removeprefix('www.')}
    raw,effective=collector.get(url,hosts);text=raw.decode('utf8','replace')
    titles=re.findall(r'<title[^>]*>(.*?)</title>',text,re.I|re.S)
    identity=collector.identity_match(source,' '.join(titles))
    receipt={'id':source['id'],'name':source['name'],'status':'html-index-fetched','checkedAt':now,
             'websiteUrl':effective,'websiteSha256':hashlib.sha256(raw).hexdigest(),
             'identityEvidence':{'verified':identity,'websiteTitle':' '.join(titles)[:300]},
             'adapter':'explicit-same-host-html-index','feeds':[],'errors':[]}
    links=[]
    for href,title in re.findall(r'<a[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>',text,re.I|re.S):
        href=urllib.parse.urljoin(effective,html.unescape(href))
        try:
            if collector.safe(href).hostname not in hosts:continue
        except ValueError:continue
        if re.search(source['articlePathPattern'],urllib.parse.urlsplit(href).path):
            if href not in [u for u,_ in links]:links.append((href,html.unescape(re.sub('<[^>]+>',' ',title)).strip()))
    # Explicit source indexes sometimes feature older pinned articles. Inspect a
    # bounded set and sort by actual source metadata rather than first link order.
    items=[]
    for href,title in links[:8]:
        try:
            data,final=collector.get(href,hosts);body=data.decode('utf8','replace')
            metadata={}
            for tag in re.findall(r'<meta\b[^>]+>',body,re.I):
                attrs=dict(re.findall(r'([\w:-]+)=["\']([^"\']*)["\']',tag))
                key=attrs.get('property')or attrs.get('name')or attrs.get('itemprop')
                if key:metadata[key]=html.unescape(attrs.get('content',''))
            dates=[metadata.get('article:published_time'),metadata.get('datePublished'),metadata.get('date')]
            dates+=re.findall(r'"datePublished"\s*:\s*"([^"]+)"',body)
            dates+=re.findall(r'<time\b[^>]*datetime=["\']([^"\']+)["\']',body,re.I)
            stamp=None
            for value in dates:
                if not value:continue
                try:
                    d=datetime.datetime.fromisoformat(value.replace('Z','+00:00'))
                    if not d.tzinfo:d=d.replace(tzinfo=datetime.timezone.utc)
                    if d<=datetime.datetime.fromisoformat(now):stamp=d.isoformat();break
                except ValueError:pass
            items.append({'id':hashlib.sha256(final.encode()).hexdigest(),'sourceId':source['id'],
                         'title':metadata.get('og:title')or title,'url':final,'sourcePublishedAt':stamp,
                         'sourcePageSha256':hashlib.sha256(data).hexdigest(),'indexUrl':effective,
                         'publicationEligible':False,'requires':'Exact facts, originality, site policy, prior-publication dedupe and per-asset rights review'})
        except Exception as exc:receipt['errors'].append({'url':href,'reason':str(exc)[:180]})
    receipt['items']=len(items)
    if not identity:receipt['status']='identity-unverified'
    return receipt,items
