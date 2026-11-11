const sources=[
 {domain:'theminingminute.com',url:'https://theminingminute.com/publishing-status.json'},
 {domain:'loveourlistings.com',url:'https://loveourlistings.com/publishing-status.json'},
 {domain:'industryarmymarketing.com',url:'https://www.industryarmymarketing.com/iam-publishing-status.json'},
];
const bounded=(value,max=120)=>typeof value==='string'?value.slice(0,max):null;
const date=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))?new Date(value).toISOString():null;
const statuses=new Set(['success','failure','cancelled','timed_out','generation-failed','publication-failed','nothing-new','published','built-for-publication','blocked-property-publication','source-unavailable','unknown','prewriter-failed','writer-failed']);
const events=new Set(['schedule','workflow_dispatch','push','repository_dispatch']);
const safeStages=new Set(['Install browser and image verifier','Install matching verifier package (browsers and system dependencies are pinned in image)','One source-to-verified-publication transaction','Runtime regressions','Initialize containers','Run actions/checkout@v4','Run actions/setup-python@v5']);
export function project(domain,data,observedAt){
 const candidate=bounded(data.runUrl,300);let runUrl=null;
 if(candidate){try{const u=new URL(candidate);if(u.protocol==='https:'&&u.hostname==='github.com'&&/^\/SHTFTV\/[A-Za-z0-9_.-]+\/actions\/runs\/\d+$/.test(u.pathname)&&!u.search&&!u.hash)runUrl=u.href;}catch{}}
 const errors=Array.isArray(data.failedSteps)?data.failedSteps.filter(x=>typeof x==='string').map(x=>safeStages.has(x)?x:'Unrecognised workflow stage').slice(0,5):[];
 const rawStatus=data.jobResult||data.status,status=statuses.has(rawStatus)?rawStatus:'unknown';
 const event=events.has(data.event)?data.event:null;
 const count=Number.isSafeInteger(data.verifiedPublicationCount)&&data.verifiedPublicationCount>=0?data.verifiedPublicationCount:null;
 return {domain,observedAt,sourceTimestamp:date(data.checkedAt)||date(data.updatedAt),lastRunAt:date(data.startedAt)||date(data.lastRunAt),
  status,event,runUrl,
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
