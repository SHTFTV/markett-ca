// Public read-only projection. Fixed public sources; never load private operating records.
const SOURCES=[
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
const timestamp=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))&&Date.parse(v)<=Date.now()+300000?v:null;
function miningReceipt(input){
 const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Date.parse(v)<=Date.now()+300000?v:null;
 let featuredImageUrl=null;try{const u=new URL(input.featuredImageUrl);if(u.protocol==='https:'&&u.hostname==='theminingminute.com'&&!u.username&&!u.password&&!u.port&&u.pathname.startsWith('/source-media/'))featuredImageUrl=u.href;}catch{}
 const runUrl=typeof input.runUrl==='string'&&/^https:\/\/github\.com\/SHTFTV\/theminingminute\.com\/actions\/runs\/\d+$/.test(input.runUrl)?input.runUrl:null;
 return {sourceDate:date(input.sourceDate),sourceEventDate:date(input.sourceEventDate),sourceEventDateStatus:date(input.sourceEventDate)?'Verified source event date':'Not independently established',featuredImageStatus:input.featuredImageStatus==='verified'&&featuredImageUrl?'verified':input.featuredImageStatus==='blocked'?'blocked':'unknown',featuredImageUrl,runUrl};
}
export function sanitizeEvent(source,input){
 if(!input||!['done','failed'].includes(input.status)||input.site!==source.site)return null;
 const title=String(input.title??'').replace(/<[^>]*>/g,'').replace(/[\u0000-\u001f]/g,' ').trim().slice(0,180);if(!title)return null;
 const publishedAt=timestamp(input.publishedAt),verifiedAt=timestamp(input.verifiedAt),checkedAt=timestamp(input.checkedAt??input.verifiedAt);let url=null;
 if(input.status==='done'){
  if(!publishedAt||!verifiedAt)return null;
  try{const u=new URL(input.url);if(u.protocol!=='https:'||u.username||u.password||u.port||u.hostname.replace(/^www\./,'')!==source.site)return null;url=u.href;}catch{return null;}
 }else if(!checkedAt)return null;
 const mining=source.site==='theminingminute.com'?miningReceipt(input):{};
 return {...mining,id:source.site+':'+String(input.id??url??checkedAt).replace(/[\u0000-\u001f]/g,'').slice(0,220),site:source.site,brand:source.brand,title,publishedAt:input.status==='done'?publishedAt:null,verifiedAt:input.status==='done'?verifiedAt:null,checkedAt:checkedAt??verifiedAt,url,status:input.status};
}
async function json(source,fetcher){
 let url=source.url;for(let hop=0;hop<3;hop++){
  const response=await fetcher(url,{redirect:'manual',signal:AbortSignal.timeout(7000),headers:{accept:'application/json'}});
  if([301,302,307,308].includes(response.status)){const next=new URL(response.headers.get('location'),url);if(next.protocol!=='https:'||next.hostname.replace(/^www\./,'')!==source.site)throw new Error('unavailable');url=next.href;continue;}
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
export async function activity(fetcher=fetch){
 const results=await Promise.all(SOURCES.map(async source=>{try{const data=await json(source,fetcher);const events=(Array.isArray(data.events)?data.events:[]).slice(-500).map(x=>sanitizeEvent(source,x)).filter(Boolean);const monitor=miningMonitor(source,data);if(monitor)events.push(monitor);return {site:source.site,brand:source.brand,status:'connected',checkedAt:new Date().toISOString(),events};}catch(e){console.warn('Public publication log',source.site,e.message==='not-connected'?'not-connected':'unavailable');return {site:source.site,brand:source.brand,status:e.message==='not-connected'?'not-connected':'unavailable',checkedAt:new Date().toISOString(),events:[]};}}));
 const unique=new Map();for(const source of results)for(const e of source.events)unique.set(e.id,e);
 const events=[...unique.values()].sort((a,b)=>Date.parse(b.verifiedAt??b.checkedAt)-Date.parse(a.verifiedAt??a.checkedAt));
 return {schemaVersion:1,live:true,checkedAt:new Date().toISOString(),counts:{done:events.filter(e=>e.status==='done').length,failed:events.filter(e=>e.status==='failed').length},events:events.slice(0,500),sources:results.map(({events,...s})=>s),privacy:'Public publication results only; no private SOPs, prompts, credentials, approval links or internal logs.'};
}
export default {async fetch(request){if(request.method!=='GET')return new Response('Method not allowed',{status:405,headers:{Allow:'GET'}});try{return Response.json(await activity(),{headers:{'Cache-Control':'public, max-age=0, s-maxage=10','X-Content-Type-Options':'nosniff'}});}catch{console.error('Public publication projection failed');return Response.json({live:false,error:'Publication status temporarily unavailable'},{status:503});}}};

