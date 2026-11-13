// Public read-only projection. Fixed public sources; never load private operating records.
const SOURCES=[
 {site:'builders.ltd',brand:'Builders.ltd',url:'https://builders-ltd.vercel.app/api/alerts/',format:'site-role-alerts-v1'},
 {site:'insurancebrokers.io',brand:'InsuranceBrokers',url:'https://insurancebrokers.io/publication-results.json'},
 {site:'financialadvisors.io',brand:'FinancialAdvisors',url:'https://financialadvisors.io/publication-results.json'},
 {site:'gasfitter.ca',brand:'Gasfitter.ca',url:'https://www.gasfitter.ca/publication-results.json'},
 {site:'kitchencabinets.io',brand:'KitchenCabinets.io',url:'https://kitchencabinets.io/operations/editorial-release.json',format:'kitchen-editorial-v1'},
 {site:'industryarmymarketing.com',brand:'Industry Army Marketing',url:'https://www.industryarmymarketing.com/publication-results.json'},
 {site:'beewarm.ca',brand:'BeeWarm',url:'https://beewarm.ca/publication-results.json'},
 {site:'plowwow.com',brand:'PlowWow',url:'https://www.plowwow.com/publication-results.json'},
 {site:'videographers.io',brand:'Videographers',url:'https://videographers.io/publication-results.json'},
 {site:'theminingminute.com',brand:'The Mining Minute',url:'https://theminingminute.com/publication-results.json'},
 {site:'plow.news',brand:'Plow News',url:'https://www.plow.news/publication-results.json'},
 {site:'loveourlistings.com',brand:'Love Our Listings',url:'https://www.loveourlistings.com/publication-results.json'},
 {site:'naturalgasgenerators.ca',brand:'Natural Gas Generators',url:'https://naturalgasgenerators.ca/publication-results.json'},
 {site:'hotwatertankinstallation.ca',brand:'Hot Water Tank Installation',url:'https://hotwatertankinstallation.ca/publication-results.json'},
 {site:'plowinstallations.com',brand:'Plow Installations',url:'https://www.plowinstallations.com/publication-results.json'},
];
const publicText=(v,max=300)=>typeof v==='string'&&!/sk-|bearer|token=|password=/i.test(v)?v.replace(/<[^>]*>/g,'').replace(/[\u0000-\u001f]/g,' ').trim().slice(0,max):null;
const publicUrl=v=>{try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!u.search&&!u.hash?u.href:null;}catch{return null;}};
const timestamp=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))&&Date.parse(v)<=Date.now()+300000?v:null;
function miningReceipt(input){
 const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Date.parse(v)<=Date.now()+300000?v:null;
 let featuredImageUrl=null;try{const u=new URL(input.featuredImageUrl);if(u.protocol==='https:'&&u.hostname==='theminingminute.com'&&!u.username&&!u.password&&!u.port&&u.pathname.startsWith('/source-media/'))featuredImageUrl=u.href;}catch{}
 const runUrl=typeof input.runUrl==='string'&&/^https:\/\/github\.com\/SHTFTV\/theminingminute\.com\/actions\/runs\/\d+$/.test(input.runUrl)?input.runUrl:null;
 return {sourceDate:date(input.sourceDate),sourceEventDate:date(input.sourceEventDate),sourceEventDateStatus:date(input.sourceEventDate)?'Verified source event date':'Not independently established',featuredImageStatus:input.featuredImageStatus==='verified'&&featuredImageUrl?'verified':input.featuredImageStatus==='blocked'?'blocked':'unknown',featuredImageUrl,runUrl};
}
export function roleAlertInputs(source,data){
 if(data?.site!==source.site||!Array.isArray(data.events))return [];
 return data.events.filter(e=>e?.status==='failed'&&typeof e.id==='string'&&/^[A-Za-z0-9:._-]{1,180}$/.test(e.id)&&(!e.site||e.site===source.site)).map(e=>{const canary=e.canary===true&&e.synthetic===true;return {id:(canary?'role-canary:':'role-alert:')+e.id,site:source.site,status:'failed',title:e.title,checkedAt:e.at??e.checkedAt,runUrl:e.runUrl,incidentId:canary?null:e.id,probeRunId:canary?e.probeRunId??e.id:null,receiptState:canary?'controlled-role-alert-canary':'source-reported-role-alert',cause:canary?'Controlled delivery test; not an actual publication or production outage':null};});
}
export function sanitizeEvent(source,input){
 if(!input||input.withdrawn===true||input.correction===true||input.contentType==='correction'||['withdrawn','draft','held','blocked'].includes(input.publicationStatus)||!['done','failed'].includes(input.status)||input.site!==source.site)return null;
 const title=String(input.title??'').replace(/<[^>]*>/g,'').replace(/[\u0000-\u001f]/g,' ').trim().slice(0,180);if(!title)return null;
 const publishedAt=timestamp(input.publishedAt),verifiedAt=timestamp(input.verifiedAt),checkedAt=timestamp(input.checkedAt??input.verifiedAt);let url=null;
 if(input.status==='done'){
  if(!publishedAt||!verifiedAt||Date.parse(publishedAt)>Date.now())return null;
  try{const u=new URL(input.url);if(u.protocol!=='https:'||u.username||u.password||u.port||u.hostname.replace(/^www\./,'')!==source.site||u.search||u.hash)return null;url=u.href;}catch{return null;}
 }else if(!checkedAt)return null;
 const image=publicUrl(input.featuredImageUrl??input.imageUrl),imageType=['source-photo','photo','website-screenshot','ai-illustration','illustration'].includes(input.featuredImageType)?input.featuredImageType:'unknown';
 const receipt={featuredImageUrl:image,featuredImageCredit:publicText(input.featuredImageCredit??input.imageCredit,600),featuredImageType:imageType,featuredImageStatus:input.featuredImageStatus==='verified'&&image?'verified':input.featuredImageStatus==='blocked'?'blocked':'unknown',sotVersion:publicText(String(input.sotVersion??''),40)||null,policyVersion:publicText(String(input.policyVersion??''),40)||null,runTrigger:['schedule','push','workflow_dispatch','user-authorized-manual'].includes(input.runTrigger)?input.runTrigger:'unknown',receiptState:publicText(input.receiptState,100)??'publisher-reported-verification'};
 const mining=source.site==='theminingminute.com'?miningReceipt(input):{};
 const rawId=String(input.id??url??checkedAt).replace(/[\u0000-\u001f]/g,'').slice(0,220),id=rawId.startsWith(source.site+':')?rawId:source.site+':'+rawId;
 return {...receipt,...mining,id,site:source.site,brand:source.brand,title,publishedAt:input.status==='done'?publishedAt:null,verifiedAt:input.status==='done'?verifiedAt:null,checkedAt:checkedAt??verifiedAt,url,status:input.status,cause:publicText(input.cause,400),impact:publicText(input.impact,300),owner:publicText(input.owner,100),nextAction:publicText(input.nextAction,500),blockedSince:timestamp(input.blockedSince),claimedRecoveryAt:timestamp(input.resolvedAt),resolvedAt:null,recoveryVerified:false,sourceUrl:publicUrl(input.sourceUrl),runUrl:source.site==='theminingminute.com'?mining.runUrl:publicUrl(input.runUrl)};
}
export function kitchenEditorialEvents(source,data){
 if(source.site!=='kitchencabinets.io'||data?.schemaVersion!==1||data.site!==source.site||!Array.isArray(data.posts))return [];
 return data.posts.filter(p=>p.state==='published-manual'&&p.publicationTrigger==='authorized-manual-launch'&&p.canonicalUrl===p.url&&/^kitchencabinets\.io:original:[a-z0-9-]+$/.test(p.id)&&/^[a-f0-9]{64}$/.test(p.contentHash)&&/^https:\/\/github\.com\/SHTFTV\/kitchencabinets\.io\/commit\/[a-f0-9]{40}$/.test(p.runRef)).map(p=>{
  const image=publicUrl(p.imageUrl);if(!image||new URL(image).hostname!==source.site||!new URL(image).pathname.startsWith('/images/editorial/'))return null;
  const e=sanitizeEvent(source,{id:p.id,site:source.site,title:p.title,url:p.url,status:'done',publishedAt:p.publishedAt,verifiedAt:p.verifiedAt,featuredImageUrl:image,featuredImageCredit:p.imageCredit,featuredImageType:p.imageType==='original-labelled-planning-illustration'?'illustration':'unknown',featuredImageStatus:'unknown',sotVersion:data.siteSotRevision,policyVersion:data.sharedStandardVersion,runTrigger:'user-authorized-manual',runUrl:p.runRef,receiptState:'source-reported-manual-launch'});
  return e?{...e,sourceUrl:source.url,contentHash:p.contentHash,nativeScheduleVerified:false,centralReaderDeliveryVerified:false,sharedStandardLiveBindingVerified:false}:null;
 }).filter(Boolean);
}
async function json(source,fetcher){
 let url=source.url;for(let hop=0;hop<3;hop++){
  const response=await fetcher(url,{redirect:'manual',signal:AbortSignal.timeout(7000),headers:{accept:'application/json'}});
  if([301,302,307,308].includes(response.status)){const next=new URL(response.headers.get('location'),url);if(next.protocol!=='https:'||(next.hostname.replace(/^www\./,'')!==source.site&&next.hostname!==new URL(source.url).hostname))throw new Error('unavailable');url=next.href;continue;}
  if(!response.ok)throw new Error(response.status===404?'not-connected':'unavailable');
  const reader=response.body.getReader();let bytes=0;const chunks=[];while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>2097152){await reader.cancel();throw new Error('unavailable');}chunks.push(value);}
  const data=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.byteLength;}return JSON.parse(new TextDecoder().decode(data));
 }throw new Error('unavailable');
}
export function miningMonitor(source,data,now=new Date()){
 if(source.site!=='theminingminute.com')return null;
 const observed=timestamp(data.monitor?.lastAutomaticRunAt),age=observed?(now.getTime()-Date.parse(observed))/60000:Infinity;
 if(age<=20)return null;
 return sanitizeEvent(source,{id:'monitor:automatic-discovery',site:source.site,status:'failed',checkedAt:now.toISOString(),title:observed?'Mining Minute automatic discovery stalled — no scheduled intake in 20 minutes; repair the existing GitHub workflow.':'Mining Minute automatic discovery has no verified heartbeat — inspect the existing GitHub workflow.',runUrl:data.monitor?.lastAutomaticRunUrl});
}
export async function iamLatest(fetcher=fetch){
 const source={site:'industryarmymarketing.com',brand:'Industry Army Marketing'},checkedAt=new Date().toISOString();
 try{
  const r=await fetcher('https://www.industryarmymarketing.com/rss.xml',{redirect:'error',signal:AbortSignal.timeout(7000)});if(!r.ok)throw Error();
  const xml=await r.text();if(xml.length>2097152||!xml.includes('<rss'))throw Error();
  const value=(item,key)=>(item.match(new RegExp('<'+key+'>([\\s\\S]*?)</'+key+'>'))?.[1]??'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&amp;/g,'&').replace(/&apos;/g,"'").replace(/&quot;/g,'"');
  const items=[...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m=>({title:value(m[1],'title'),url:value(m[1],'link'),date:Date.parse(value(m[1],'pubDate'))})).filter(x=>Number.isFinite(x.date)&&x.date<=Date.now()).sort((a,b)=>b.date-a.date);
  const latest=items[0];if(!latest)throw Error();
  const event=sanitizeEvent(source,{id:latest.url,site:source.site,status:'done',title:latest.title,url:latest.url,publishedAt:new Date(latest.date).toISOString(),verifiedAt:checkedAt});if(!event)throw Error();
  const page=await fetcher(event.url,{redirect:'error',signal:AbortSignal.timeout(7000)});if(!page.ok||!page.headers.get('content-type')?.includes('text/html'))throw Error();
  const html=await page.text();if(html.length>2097152||!html.includes(new URL(event.url).pathname))throw Error();
  return {...source,status:'connected',checkedAt,events:[event]};
 }catch{return {...source,status:'unavailable',checkedAt,events:[]};}
}
export async function activity(fetcher=fetch,{includeArchive=true,limit=500}={}){
 const results=await Promise.all(SOURCES.map(async source=>{try{const data=await json(source,fetcher);const events=source.format==='kitchen-editorial-v1'?kitchenEditorialEvents(source,data):(source.format==='site-role-alerts-v1'?roleAlertInputs(source,data):(Array.isArray(data.events)?data.events:[])).slice(-500).map(x=>sanitizeEvent(source,x)).filter(Boolean);const monitor=miningMonitor(source,data);if(monitor)events.push(monitor);return {site:source.site,brand:source.brand,status:'connected',checkedAt:new Date().toISOString(),events};}catch(e){console.warn('Public publication log',source.site,e.message==='not-connected'?'not-connected':'unavailable');return {site:source.site,brand:source.brand,status:e.message==='not-connected'?'not-connected':'unavailable',checkedAt:new Date().toISOString(),events:[]};}}));
 if(!results.some(s=>s.site==='industryarmymarketing.com'&&s.status==='connected'))results.push(await iamLatest(fetcher));
 let archive={connected:false,events:[]};if(includeArchive&&fetcher===fetch){try{archive=await (await import('../lib/publication-receipt-store.mjs')).readPublications({limit});}catch{}}
 const unique=new Map();for(const e of archive.events??[]){const source=SOURCES.find(s=>s.site===e.site);const clean=source&&sanitizeEvent(source,e);if(clean)unique.set(clean.site+'|'+clean.url,clean);}
 for(const source of results)for(const e of source.events){const key=e.status==='done'?e.site+'|'+e.url:e.id;const old=unique.get(key);if(!old||Date.parse(e.verifiedAt??e.checkedAt)>=Date.parse(old.verifiedAt??old.checkedAt))unique.set(key,e);}
 const all=[...unique.values()],publications=all.filter(e=>e.status==='done').sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)||a.site.localeCompare(b.site)||a.url.localeCompare(b.url)).slice(0,limit),attempts=all.filter(e=>e.status==='failed').sort((a,b)=>Date.parse(b.checkedAt)-Date.parse(a.checkedAt)).slice(0,limit);
 const events=[...publications,...attempts].sort((a,b)=>Date.parse(b.verifiedAt??b.checkedAt)-Date.parse(a.verifiedAt??a.checkedAt));
 let nextPublicationCursor=null;if(publications.length===limit){try{nextPublicationCursor=(await import('../lib/publication-receipt-store.mjs')).publicationCursor(publications.at(-1));}catch{}}
 return {schemaVersion:2,live:true,checkedAt:new Date().toISOString(),counts:{done:publications.length,failed:attempts.length},events,publications,nextPublicationCursor,archive:{connected:archive.connected,scope:'Append-only source publication receipts; source publication and image verification remain distinct.'},sources:results.map(({events,...s})=>s),privacy:'Public publication results only; no private SOPs, prompts, credentials, approval links or internal logs.'};
}

export default {async fetch(request){
 if(request.method!=='GET')return new Response('Method not allowed',{status:405,headers:{Allow:'GET'}});
 try{const cursor=new URL(request.url).searchParams.get('before');if(cursor){const {readPublications,decodePublicationCursor}=await import('../lib/publication-receipt-store.mjs');try{decodePublicationCursor(cursor);}catch{return Response.json({error:'Invalid publication cursor'},{status:400});}const archive=await readPublications({limit:200,cursor});if(!archive.connected)return Response.json({error:'Publication archive unavailable'},{status:503});const events=archive.events.map(e=>{const source=SOURCES.find(s=>s.site===e.site);return source?sanitizeEvent(source,e):null;}).filter(Boolean);return Response.json({schemaVersion:2,checkedAt:new Date().toISOString(),publications:events,events,sources:[],nextPublicationCursor:archive.nextCursor,scope:'durable-archive-page'},{headers:{'Cache-Control':'no-store'}});}return Response.json(await activity(),{headers:{'Cache-Control':'public, max-age=0, s-maxage=10','X-Content-Type-Options':'nosniff'}});}catch{console.error('Public publication projection failed');return Response.json({live:false,error:'Publication status temporarily unavailable'},{status:503});}
}};

