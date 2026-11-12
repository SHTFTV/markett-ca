import {createHash} from 'node:crypto';
const time=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))?Date.parse(v):null;
const id=(domain,worker,cause)=>createHash('sha256').update([domain,worker,cause].join('\n')).digest('hex').slice(0,32);
export const workerContracts=[
 {domain:'theminingminute.com',worker:'mining-publisher',source:'public-receipt',repo:'theminingminute.com',warnMs:600000,staleMs:1200000},
 {domain:'loveourlistings.com',worker:'property-publisher',source:'public-receipt',repo:'loveourlistings.com',warnMs:43200000,staleMs:64800000},
 {domain:'industryarmymarketing.com',worker:'iam-publisher',source:'public-receipt',repo:'industryarmymarketing.com',warnMs:7200000,staleMs:10800000},
 ...['weddings.io','talc.tv','eyespyr.com','estimators.io','irrigation.ltd','naturopaths.io','fireproofing.tv'].map(domain=>({domain,worker:domain==='naturopaths.io'?'naturopaths-site-bot':domain+'-site-bot',source:'signed-heartbeat',warnMs:600000,staleMs:1800000,unregistered:true}))
];
const owners={'theminingminute.com':'Existing Mining sole publisher owner','loveourlistings.com':'Listings sole publisher owner','weddings.io':'Weddings publisher implementation owner','industryarmymarketing.com':'IAM finite campaign and publisher owner','talc.tv':'TALC implementation owner','eyespyr.com':'Existing MarkEtt provider confirmation owner','estimators.io':'Estimators application and runtime owner'};
export const standingHolds=[{domain:'eyespyr.com',worker:'eyespyr-source-production',cause:'source-production-link-unproven',evidenceAt:null,title:'EyeSpyR has no verified GitHub-to-production Vercel connection.',impact:'The canonical production source/deployment and required server workflow are unproven independently of database provisioning.',owner:'EyeSpyR backend implementation owner',nextAction:'Use the existing eye-spy-r Vercel project and attached EyeSpyR domains; verify its canonical GitHub connection and exact production commit. Do not create a duplicate project or infer the source link from a live frontend.'},{domain:'eyespyr.com',worker:'eyespyr-provider-provisioning',cause:'approval-hold',evidenceAt:null,title:'EyeSpyR database creation is awaiting provider confirmation.',impact:'The required database has not been created; dependent flows cannot be verified.',owner:'Existing MarkEtt owner / provider confirmation owner',nextAction:'Complete the existing exact approved Canada Central $10/month provider confirmation. Do not duplicate the project or purchase; verify actual creation before clearing this hold.'}];
function observation(domain,worker,cause,severity,title,evidenceAt,proofRef,nextAction,extra={}){return {id:id(domain,worker,cause),domain,worker,cause,severity,title,evidenceAt:evidenceAt??null,proofRef:proofRef??null,nextAction,owner:extra.owner??'Assigned site operating owner',impact:extra.impact??'Required operation is not currently proven healthy.',...extra};}
export function assessWorkers({events=[],publicReceipts=[],publicationEvents=[],contracts=workerContracts,holds=standingHolds,now=Date.now()}){
 const issues=[],recoveries=[];
 for(const c of contracts){
  const signed=events.filter(e=>e.domain===c.domain&&e.actorId===c.worker&&e.type==='heartbeat').sort((a,b)=>(time(b.observedAt)??0)-(time(a.observedAt)??0))[0];
  const external=publicReceipts.find(e=>e.domain===c.domain);let receipt=c.source==='public-receipt'?external:signed;
  const at=c.source==='public-receipt'?time(receipt?.lastRunAt):time(receipt?.observedAt);
  const ownRun=c.source!=='public-receipt'||(receipt?.runUrl?.startsWith('https://github.com/SHTFTV/'+c.repo+'/actions/runs/')&&receipt.workerExecuted===true);
  const age=at===null?null:now-at;
  const stale=age===null||age<0||age>c.staleMs||!ownRun;
  const warn=!stale&&age>c.warnMs;
  const cause='worker-heartbeat';
  if(stale||warn)issues.push(observation(c.domain,c.worker,cause,stale?'red':'orange',!receipt?'Required worker has no matching execution receipt.':!ownRun?'Worker execution is unproven; wrapper success does not establish health.':age===null?'Worker receipt time is unknown.':stale?'Worker-specific heartbeat is stale.':'Worker heartbeat is approaching its expected limit.',receipt?.lastRunAt??receipt?.observedAt,receipt?.runUrl??(signed?.cursor?'durable-event:'+signed.cursor:null),'Inspect this exact worker and its retained failures; verify a fresh affected execution. An HTTP check, stream keepalive or assigned identity is separate.',{owner:owners[c.domain]??'Assigned site implementation owner',blockedSince:receipt?.lastRunAt??receipt?.observedAt??null,evidenceAgeMs:age}));
  else recoveries.push({id:id(c.domain,c.worker,cause),verifiedAt:new Date(now).toISOString(),evidenceAt:receipt.lastRunAt??receipt.observedAt,proofRef:receipt.runUrl??'durable-event:'+receipt.cursor,kind:'matching-worker-execution'});
  if(external&&c.source==='public-receipt'){
   for(const hold of external.holds??[])issues.push(observation(c.domain,c.worker,'item-hold:'+hold.id,'red',hold.title??'Specific source/media item remains held.',external.lastRunAt,hold.proofRef,'Resolve this exact retained item: '+hold.reason+' Other items continue independently.',{owner:owners[c.domain]??'Assigned publisher owner',itemId:hold.id,retryStatus:hold.retryStatus,nextAttemptAt:hold.nextAttemptAt}));
   const failed=['failure','cancelled','timed_out','generation-failed','publication-failed','blocked-property-publication','prewriter-failed','writer-failed','source-unavailable','partial-failure','blocked','failed'].includes(external.status);
   if(failed)issues.push(observation(c.domain,c.worker,'worker-failure','red','The affected worker reports '+external.status+'.',external.lastRunAt,external.runUrl,'Repair the recorded worker stage and verify that affected flow. Other successful items do not clear held items.',{workerStatus:external.status}));
   else if(!stale&&external.workerExecuted===true&&['nothing-new','published','published-and-verified','success'].includes(external.status))recoveries.push({id:id(c.domain,c.worker,'worker-failure'),verifiedAt:new Date(now).toISOString(),evidenceAt:external.lastRunAt,proofRef:external.runUrl,kind:'matching-worker-execution'});
  }
 }
 // Actor + exact task key is the recovery boundary. A healthy feed cannot clear another failed feed.
 const latest=new Map(),failed=new Map();for(const e of events){if(!e.taskKey||!e.actorId)continue;const key=[e.domain,e.actorId,e.taskKey].join('\n');if((time(e.observedAt)??0)>(time(latest.get(key)?.observedAt)??0))latest.set(key,e);if(['task_blocked','publication_failed'].includes(e.type)||['blocked','failed'].includes(e.status))if((time(e.observedAt)??0)>(time(failed.get(key)?.observedAt)??0))failed.set(key,e);}
 for(const [key,e] of latest){
  const cause='task:'+e.taskKey,bad=failed.get(key),good=e.type==='task_completed'&&e.status==='verified'&&e.taskKey!=='source-discovery'&&(!bad||(time(e.observedAt)??0)>(time(bad.observedAt)??0));
  if(bad&&!good)issues.push(observation(bad.domain,bad.actorId,cause,'red','Retained '+bad.taskKey+' failure: '+(bad.issueCode??'unknown')+'.',bad.observedAt,'durable-event:'+bad.cursor,'Repair this exact actor/task and retain its failure until a newer verified result for the same task exists. Aggregate feed failures require feed-level recovery proof.',{issueCode:bad.issueCode??'unknown',taskKey:bad.taskKey}));
  else if(good)recoveries.push({id:id(e.domain,e.actorId,cause),verifiedAt:new Date(now).toISOString(),evidenceAt:e.observedAt,proofRef:'durable-event:'+e.cursor,kind:'matching-actor-task'});
 }
 for(const e of publicationEvents){if(e.status!=='failed'||e.resolvedAt||!String(e.id).includes(':hold:'))continue;const c=contracts.find(x=>x.domain===e.site);issues.push(observation(e.site,c?.worker??'existing-site-publisher','publication-hold:'+e.id,'red',String(e.title??'Retained article hold').slice(0,300),e.checkedAt??e.verifiedAt,e.runUrl??e.url,e.nextAction??'Repair this specific held article/source/media and verify its recovery. An unrelated publication does not clear this hold.',{blockedSince:e.blockedSince??null,impact:e.impact??'Specific item remains held while independent work continues.',owner:e.owner??owners[e.site]??'Assigned site publisher owner',itemId:String(e.id).slice(0,180)}));}
 for(const h of holds)issues.push(observation(h.domain,h.worker,h.cause,'red',h.title,h.evidenceAt,null,h.nextAction,h));
 return {issues,recoveries};
}
export function applyIncidentState(previous,{issues,recoveries},{now=Date.now(),synthetic=false}={}){
 const state=new Map(previous.map(x=>[x.id,{...x}]));const at=new Date(now).toISOString();
 for(const issue of issues){const old=state.get(issue.id);state.set(issue.id,{...old,...issue,status:'open',firstSeen:old?.firstSeen??at,lastSeen:at,synthetic,recovery:null});}
 for(const recovery of recoveries){const old=state.get(recovery.id);if(!old||old.status!=='open'||issues.some(i=>i.id===recovery.id))continue;
  if(!recovery.proofRef||time(recovery.evidenceAt)===null||time(recovery.evidenceAt)<(time(old.evidenceAt)??time(old.firstSeen)??0))continue;
  state.set(old.id,{...old,status:'recovered',lastSeen:at,recovery});
 }
 // Disappearance, acknowledgement, assignment, retry and unrelated success NEVER resolve an incident.
 return [...state.values()];
}
export function mergeMonitorOverview(overview,{incidents=[],monitorRun=null,connected=false,activationEnabled=null,deliveryConfigured=false,lastNotification=null}={},now=Date.now()){
 const active=incidents.filter(x=>x.status==='open'&&!x.synthetic),age=monitorRun?now-Date.parse(monitorRun.observedAt):null;
 const monitoring={connected,activationEnabled,lastRunAt:monitorRun?.observedAt??null,status:activationEnabled===false?'disabled':!connected||age===null||!Number.isFinite(age)||age>900000?'red':age>600000?'orange':'current',deliveryConfigured,deliveryStatus:lastNotification?.stage??lastNotification?.status??(deliveryConfigured?'unverified':'not-configured'),deliveryRef:lastNotification?.deliveryRef??null,acknowledgementRef:lastNotification?.acknowledgementRef??null,scopeGaps:monitorRun?.scopeGaps??[],selfFailure:activationEnabled===false||!connected||age===null||!Number.isFinite(age)||age>900000||lastNotification?.status!=='delivered',definition:'Monitor execution, worker health, provider delivery and owner acknowledgement are separate proofs.'};
 const rows=overview.rows.map(r=>{const own=active.filter(a=>a.domain===r.domain),freshIssues=own.map(a=>({cause:a.cause,title:a.title,checkedAt:a.evidenceAt,blockedSince:a.firstSeen,owner:a.owner,impact:a.impact,nextAction:a.nextAction,recovery:'Unresolved; acknowledgement or another successful operation does not clear this issue.',incidentId:a.id,notificationStatus:monitoring.deliveryStatus}));return {...r,issues:[...r.issues,...freshIssues],status:r.status==='excluded'?'excluded':own.some(a=>a.severity==='red')?'red':r.status==='red'?'red':own.length?'orange':r.status,activeIncidents:own};});
 return {...overview,rows,monitoring,notificationDelivery:monitoring.deliveryRef?'Delivery receipt recorded; owner acknowledgement '+(monitoring.acknowledgementRef?'recorded':'unverified')+'.':'Owner notification delivery UNVERIFIED: '+monitoring.deliveryStatus+'.',counts:{...overview.counts,needsAttention:rows.filter(r=>r.status==='red').length,delayed:rows.filter(r=>r.status==='orange').length,activeIncidents:active.length}};
}
