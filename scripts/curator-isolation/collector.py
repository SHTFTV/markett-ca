"""Bounded public source metadata collection inside the existing sole publisher.
No model calls, transcripts, media downloads or article publication.
"""
import unicodedata
import concurrent.futures,datetime,email.utils,hashlib,html.parser,http.client,ipaddress,json,os,re,socket,ssl,time,urllib.parse,xml.etree.ElementTree as ET
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def safe(url):
 p=urllib.parse.urlsplit(url)
 if p.scheme!='https' or p.username or p.password or p.port or not p.hostname:raise ValueError('PUBLIC_HTTPS_REQUIRED')
 return p
def get(url,hosts,redirects=0):
 p=safe(url)
 if p.hostname not in hosts:raise ValueError('UNAPPROVED_REDIRECT_HOST')
 addresses=socket.getaddrinfo(p.hostname,443,type=socket.SOCK_STREAM)
 if not addresses or any(not ipaddress.ip_address(a[4][0]).is_global for a in addresses):raise ValueError('NON_PUBLIC_ADDRESS')
 class Pinned(http.client.HTTPSConnection):
  def connect(self):
   raw=socket.create_connection(addresses[0][4][:2],timeout=12);self.sock=ssl.create_default_context().wrap_socket(raw,server_hostname=p.hostname)
 c=Pinned(p.hostname,timeout=12)
 try:
  c.request('GET',p.path+('?' +p.query if p.query else ''),headers={'User-Agent':'TheMiningMinute-CreatorDiscovery/1.0 (+https://theminingminute.com/editorial/)','Accept':'application/rss+xml,application/atom+xml,text/html;q=0.8','Accept-Encoding':'identity'})
  r=c.getresponse()
  if r.status in (301,302,303,307,308):
   if redirects>=3:raise ValueError('REDIRECT_LIMIT')
   return get(urllib.parse.urljoin(url,r.getheader('Location','')),hosts,redirects+1)
  if r.status!=200:raise ValueError('HTTP_'+str(r.status))
  data=r.read(16777217)
  if len(data)>16777216:raise ValueError('BODY_LIMIT_16MIB')
  return data,url
 finally:c.close()
class Links(html.parser.HTMLParser):
 def __init__(self,base):super().__init__();self.base=base;self.feeds=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='link' and 'alternate' in a.get('rel','') and a.get('type') in ('application/rss+xml','application/atom+xml') and a.get('href') and 'comment' not in (a.get('title','')+' '+a['href']).lower():self.feeds.append(urllib.parse.urljoin(self.base,a['href']))
def parse(data,feed,source):
 if re.search(br'<!DOCTYPE|<!ENTITY',data,re.I):raise ValueError('XML_ENTITY_BLOCKED')
 root=ET.fromstring(data);atom='{http://www.w3.org/2005/Atom}'
 if root.tag not in ('rss',atom+'feed'):raise ValueError('NOT_RSS_OR_ATOM')
 nodes=root.findall('./channel/item') or root.findall(atom+'entry');items=[]
 for n in nodes[:30]:
  title=n.findtext('title') or n.findtext(atom+'title') or '';url=n.findtext('link')
  if not url:
   link=next((x for x in n.findall(atom+'link') if x.get('rel','alternate')=='alternate'),None);url=link.get('href') if link is not None else None
  stamp=n.findtext('pubDate') or n.findtext(atom+'published');date=None
  if stamp:
   try:date=email.utils.parsedate_to_datetime(stamp)
   except (ValueError,TypeError):
    try:date=datetime.datetime.fromisoformat(stamp.replace('Z','+00:00'))
    except ValueError:pass
  if not title or not url:continue
  try:safe(url)
  except ValueError:continue
  if date and (not date.tzinfo or date>datetime.datetime.now(datetime.timezone.utc)+datetime.timedelta(minutes=5)):continue
  key=hashlib.sha256(url.encode()).hexdigest()
  items.append({'id':key,'sourceId':source['id'],'title':title[:350],'url':url,'sourcePublishedAt':date.isoformat() if date else None,'feedUrl':feed,'publicationEligible':False,'requires':'Exact source facts, accessible authorized text/transcript, attribution, duplicate and media/rights review'})
 return items
def identity_match(source,value):
 terms=source.get('identityTerms',[source['name'].split('/')[0].strip()]);norm=lambda v:re.sub('[^a-z0-9]','',unicodedata.normalize('NFKD',v).encode('ascii','ignore').decode().lower());return all(norm(t) in norm(value) for t in terms)
def probe(source,previous,now):
 base={'id':source['id'],'name':source['name'],'checkedAt':now,'items':0,'feeds':[],'errors':[]}
 if not source.get('enabled'):return {**base,'status':'identity-unresolved','reason':source.get('identityState')},[]
 prior=previous.get(source['id'],{})
 if prior.get('nextAttemptEpoch',0)>time.time():return {**prior,'status':'backoff','lastAttemptStatus':prior.get('status')},[]
 url=source.get('officialCandidateUrl');host=safe(url).hostname;hosts={host,host.removeprefix('www.'),'www.'+host.removeprefix('www.')};feeds=list(source.get('feedUrls',[]));allitems=[]
 try:
  raw,effective=get(url,hosts);parser=Links(effective);parser.feed(raw.decode('utf8','replace'));feeds+=parser.feeds
  if not feeds and ('wp-content' in raw.decode('utf8','replace') or 'substack' in raw.decode('utf8','replace').lower()):feeds.append(urllib.parse.urljoin(effective,'/feed/'))
  titles=re.findall(r'<title[^>]*>(.*?)</title>',raw.decode('utf8','replace'),re.I|re.S);base['identityEvidence']={'verified':identity_match(source,' '.join(titles)),'method':'Expected source identity terms in actual first-party page title or feed publisher metadata; not verified personal credentials','websiteTitle':' '.join(titles)[:300]}
  base.update(websiteFetched=True,websiteUrl=effective,websiteSha256=hashlib.sha256(raw).hexdigest())
 except Exception as e:base['errors'].append({'stage':'website','reason':str(e)[:180]})
 for feed in list(dict.fromkeys(feeds))[:3]:
  try:
   feedhost=safe(feed).hostname
   if feedhost not in hosts:
    catalog_bound=any(b.get('feedUrl')==feed and b.get('directoryRecord','').startswith('https://podcasts.apple.com/') for b in source.get('feedBindings',[]))
    if not catalog_bound and (feed not in parser.feeds or feedhost not in {'anchor.fm','feeds.megaphone.fm','feeds.simplecast.com','feeds.buzzsprout.com','feeds.libsyn.com','feeds.soundcloud.com','rss.hiivinternal.com','feeds.kitces.com'}):raise ValueError('CROSS_HOST_FEED_REQUIRES_VERIFIED_BINDING')
    hosts.add(feedhost)
    base.setdefault('officialDeclaredFeedBindings',[]).append({'officialUrl':base.get('websiteUrl') or url,'feedUrl':feed,'proof':'Actual alternate feed link in fetched official candidate page; not a media reuse grant'})
   raw,effective=get(feed,hosts);xml=ET.fromstring(raw);channel=xml.find('channel');channel=channel if channel is not None else xml;publisher=' '.join([channel.findtext('title') or channel.findtext('{http://www.w3.org/2005/Atom}title') or '',channel.findtext('{http://www.itunes.com/dtds/podcast-1.0.dtd}author') or '']);identity=base.setdefault('identityEvidence',{'verified':False});identity['verified']=identity.get('verified',False) or identity_match(source,publisher);identity.setdefault('feedPublisherMetadata',[]).append(publisher[:300]);items=parse(raw,effective,source);allitems+=items;base['feeds'].append({'url':effective,'status':'success','items':len(items),'sha256':hashlib.sha256(raw).hexdigest()})
  except Exception as e:base['errors'].append({'stage':'feed','url':feed,'reason':str(e)[:180]})
 allitems=list({i['id']:i for i in allitems}.values());base['items']=len(allitems);base['status']='fetched' if base['feeds'] else 'feed-discovery-pending' if base.get('websiteFetched') else 'error'
 if not base['feeds']:
  failures=prior.get('failures',0)+1;base.update(failures=failures,nextAttemptEpoch=time.time()+min(21600,300*2**min(failures-1,6)))
 return base,allitems
def run(root=ROOT):
 cfg=json.loads((root/'operations/creator-sources.json').read_text());out=root/'operations/creator-collection.json';queuefile=root/'operations/creator-discovery-queue.json'
 previous=json.loads(out.read_text()) if out.exists() else {};queue=json.loads(queuefile.read_text()) if queuefile.exists() else {'items':[]};seen={hashlib.sha256(i['url'].encode()).hexdigest():{**i,'id':hashlib.sha256(i['url'].encode()).hexdigest()} for i in queue['items']};now=datetime.datetime.now(datetime.timezone.utc).isoformat();prior={r['id']:r for r in previous.get('sources',[])}
 with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:results=list(pool.map(lambda s:probe(s,prior,now),cfg['sources']))
 added=0
 for _,items in results:
  for item in items:
   if item['id'] not in seen:seen[item['id']]={**item,'discoveredAt':now};added+=1
 sources=[r for r,_ in results];report={'schemaVersion':1,'site':cfg['site'],'checkedAt':now,'runRef':('https://github.com/'+os.environ.get('GITHUB_REPOSITORY','SHTFTV/theminingminute.com')+'/actions/runs/'+os.environ['GITHUB_RUN_ID']) if os.environ.get('GITHUB_RUN_ID') else None,'trigger':os.environ.get('GITHUB_EVENT_NAME','local-real-fetch'),'sourceListSha256':hashlib.sha256((root/'operations/creator-sources.json').read_bytes()).hexdigest(),'sources':sources,'summary':{'candidates':len(sources),'sourcesFetchedThisRun':sum(r['status']=='fetched' for r in sources),'successfulFeedFetches':sum(len(r['feeds']) for r in sources),'itemsFetchedThisRun':sum(r['items'] for r in sources if r['status']=='fetched'),'newUniqueItems':added,'queuedMetadataItems':len(seen),'uniqueFeedEndpointsFetched':len({f['url'] for r in sources for f in r.get('feeds',[])}),'publicationCount':0},'scope':'Actual public metadata discovery; identity, editorial facts, transcript and media rights require per-item review. Existing sole publisher retains publication authority.'}
 out.write_text(json.dumps(report,indent=2)+'\n');queuefile.write_text(json.dumps({'site':cfg['site'],'updatedAt':now,'items':list(seen.values())[-5000:]},indent=2)+'\n');print(json.dumps(report['summary']));return report
if __name__=='__main__':run()
