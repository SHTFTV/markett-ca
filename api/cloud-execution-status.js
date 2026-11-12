import {createHash} from 'node:crypto';
const sources=[
 {domain:'theminingminute.com',url:'https://theminingminute.com/publishing-status.json'},
 {domain:'loveourlistings.com',url:'https://www.loveourlistings.com/publishing-status.json'},
 {domain:'industryarmymarketing.com',url:'https://www.industryarmymarketing.com/iam-publishing-status.json'},
];
const bounded=(value,max=120)=>typeof value==='string'?value.slice(0,max):null;
const date=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))?new Date(value).toISOString():null;
const statuses=new Set(['success','failure','cancelled','timed_out','generation-failed','publication-failed','nothing-new','published','published-and-verified','built-for-publication','blocked-property-publication','source-unavailable','unknown','prewriter-failed','writer-failed']);
const events=new Set(['schedule','workflow_dispatch','push','repository_dispatch']);
const safeStages=new Set(['Install browser and image verifier','Install matching verifier package (browsers and system dependencies are pinned in image)','One source-to-verified-publication transaction','Runtime regressions','Initialize containers','Run actions/checkout@v4','Run actions/setup-python@v5']);
export function project(domain,data,observedAt){
 const candidate=bounded(data.runUrl??data.lastAutomaticRunUrl,300);let runUrl=null;
 if(candidate){try{const u=new URL(candidate);if(u.protocol==='https:'&&u.hostname==='github.com'&&/^\/SHTFTV\/[A-Za-z0-9_.-]+\/actions\/runs\/\d+$/.test(u.pathname)&&!u.search&&!u.hash)runUrl=u.href;}catch{}}
 const errors=Array.isArray(data.failedSteps)?data.failedSteps.filter(x=>typeof x==='string').map(x=>safeStages.has(x)?x:'Unrecognised workflow stage').slice(0,5):[];
 const workerStatus=statuses.has(data.status)?data.status:'unknown',jobStatus=statuses.has(data.jobResult)?data.jobResult:null;
 const status=['failure','cancelled','timed_out'].includes(jobStatus)?jobStatus:workerStatus;
 const rawEvent=data.event??data.sotLoad?.trigger;const event=events.has(rawEvent)?rawEvent:null;
 const count=Number.isSafeInteger(data.verifiedPublicationCount)&&data.verifiedPublicationCount>=0?data.verifiedPublicationCount:null;
 const holds=[...(Array.isArray(data.publicationBlocks)?data.publicationBlocks:[]),...(Array.isArray(data.collectionHealth?.heldItems)?data.collectionHealth.heldItems:[])].slice(0,100).map(h=>{const raw=String(h.sourceUrl??h.url??h.propertyId??h.title??'unknown');let proofRef=null;try{const u=new URL(raw);if(u.protocol==='https:'&&!u.username&&!u.password&&!u.search&&!u.hash)proofRef=u.href;}catch{}const reason=String(h.reason??'Item verification hold');return {id:createHash('sha256').update(raw).digest('hex').slice(0,24),title:bounded(h.title,180),reason:/sk-|bearer|token=|password=/i.test(reason)?'Source reports a retained item hold; inspect its private evidence':reason.slice(0,400),proofRef,retryStatus:bounded(h.retryStatus,60),nextAttemptAt:date(h.nextAttemptAt)};});
 return {holds,health:data.health==='degraded'||data.collectionHealth?.status==='partial-failure'?'degraded':null,domain,observedAt,sourceTimestamp:date(data.checkedAt)||date(data.updatedAt),lastRunAt:date(data.startedAt)||date(data.lastRunAt),
  sopVersion:Number.isSafeInteger(data.sopVersion??data.sotLoad?.version)?(data.sopVersion??data.sotLoad.version):null,sopSha256:/^[a-f0-9]{64}$/.test(data.sopSha256??data.sotLoad?.sha256??'')?(data.sopSha256??data.sotLoad.sha256):null,status,event,runUrl,jobStatus,workerStatus,workerExecuted:data.workerExecuted===true||data.writerExecuted===true||['nothing-new','published','published-and-verified','generation-failed','publication-failed','blocked-property-publication'].includes(workerStatus),
  writerExecuted:typeof data.writerExecuted==='boolean'?data.writerExecuted:null,
  verifiedPublicationCount:count,
  scheduledExecutionObserved:data.scheduledExecutionObserved===true&&event==='schedule'&&!!runUrl,
  automaticPublicationVerified:data.automaticPublicationVerified===true&&event==='schedule'&&status==='success'&&count>0&&data.writerExecuted===true&&!!runUrl,
  failedSteps:errors};
}
export async function collect(fetcher=fetch){
 return Promise.all(sources.map(async source=>{const observedAt=new Date().toISOString();try{
  const r=await fetcher(source.url,{redirect:'error',signal:AbortSignal.timeout(10000),headers:{Accept:'application/json'}});
  if(!r.ok)throw Error('Source HTTP '+r.status);const text=await r.text();if(text.length>500000)throw Error('Source response too large');
  return project(source.domain,JSON.parse(text),observedAt);
 }catch{return {domain:source.domain,observedAt,status:'source-unavailable',automaticPublicationVerified:false,scheduledExecutionObserved:false,error:'Public execution receipt unavailable; status is unknown, not complete'};}}));
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET'){res.status(405).json({error:'Method not allowed'});return;}
 res.status(200).json({schemaVersion:1,observedAt:new Date().toISOString(),sources:await collect()});
}
