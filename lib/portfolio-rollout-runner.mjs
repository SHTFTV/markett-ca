import {createHash} from 'node:crypto';
import {registry} from '../api/registry-data.js';
import {completionRecords as contracts} from '../api/completion-records.js';
import adapters from '../docs/rollout/adapters.json' with {type:'json'};
import coverage from '../docs/completion/sot-coverage.json' with {type:'json'};
import {projectReceipt} from '../scripts/rollout/receipt-projection.mjs';
import {matchPullDelivery} from '../scripts/rollout/pull-delivery.mjs';
import {syncQueue,claim,finish,stamp,PRIORITY} from './portfolio-rollout.mjs';
export async function runPortfolioRollout({storage,identity,kind='coordinator'}){
const path='portfolio-rollout-status.json',watchdogPath='portfolio-rollout-watchdog.json';
let sharedRoleEvaluator=null;try{sharedRoleEvaluator=(await import('./four-role-evidence.mjs')).evaluateFourRoles;}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;}

const now=Date.now(),{runId,trigger,runUrl,sourceCommit:sourceSha}=identity;
const read=storage.read,save=storage.write;const persist=()=>{};
if(kind==='watchdog'){
 const state=await read(path,{}),age=now-Date.parse(state.coordinator?.completedAt);
 const result={schemaVersion:1,checkedAt:new Date(now).toISOString(),runId,runUrl,trigger,coordinatorRunId:state.coordinator?.runId??null,status:age>=0&&age<=3600000?'fresh':'stale-or-missing',ownerDelivery:{status:'not-a-site-delivery-receipt',reason:'This management freshness check is not a site-owner alert delivery receipt; consume the site-specific independently verified authorized delivery route.'},independentSiteWatchdog:false};
 await save(watchdogPath,result);persist([watchdogPath],'Record independent portfolio coordinator freshness check');return result;
}
let state=syncQueue(registry,await read(path,{}),now);

state.registryDigest=createHash('sha256').update(JSON.stringify(registry.map(r=>r.domain))).digest('hex');
state.coordinator={runId,runUrl,trigger,sourceCommit:sourceSha,startedAt:new Date(now).toISOString(),completedAt:null,status:'running',scope:'Portfolio management and evidence adapters; never a replacement site publisher or a fifth site role.'};
for(const row of state.rows){const site=coverage.sites?.find(s=>s.domain===row.domain);row.source={repository:site?.canonicalRepository??null,sourceCommit:site?.sourceCommit??null,sotPath:site?.canonicalSotPath??null,requiredRuleVersion:site?.requiredRuleVersion??null};}
// Claim before doing work: persisted leases survive process termination/restart.
const selected=[];
const candidates=[...state.rows].sort((a,b)=>{const rank=r=>PRIORITY.includes(r.domain)?PRIORITY.indexOf(r.domain):999;return rank(a)-rank(b)||Number(!a.roles.some(t=>t.attempts===0))-Number(!b.roles.some(t=>t.attempts===0))||Date.parse(a.lastCheckAt??'1970-01-01')-Date.parse(b.lastCheckAt??'1970-01-01');});
const batchLimit=trigger==='push'?250:30;
for(const row of candidates){if(selected.length>=batchLimit)break;const claimed=row.roles.filter(t=>claim(row,t.role,runId,now));if(claimed.length)selected.push({row,tasks:claimed});}
await save(path,state);persist([path],'Lease bounded portfolio rollout batch');
async function verifyRun(receipt){
 const m=/^https:\/\/github\.com\/(SHTFTV\/[A-Za-z0-9_.-]+)\/actions\/runs\/(\d+)$/.exec(receipt.runRef??'');if(!m||m[1]!==receipt.repository)throw Error('RUNTIME_PROVIDER_VERIFICATION_MISSING');
 const headers={Accept:'application/vnd.github+json'};if(process.env.GITHUB_TOKEN)headers.Authorization='Bearer '+process.env.GITHUB_TOKEN;
 const res=await fetch('https://api.github.com/repos/'+m[1]+'/actions/runs/'+m[2],{headers,signal:AbortSignal.timeout(12000)});if(!res.ok)throw Error('RUNTIME_PROVIDER_ACCESS_UNAVAILABLE');const run=await res.json();if(run.conclusion!=='success'||run.status!=='completed'||run.head_sha!==(receipt.observerSourceCommit??receipt.sourceCommit)||(receipt.check==='role:worker'&&run.event!=='schedule'))throw Error('RUNTIME_RUN_MISMATCH');
 const current=await fetch('https://api.github.com/repos/'+m[1]+'/commits/main',{headers,signal:AbortSignal.timeout(12000)});if(!current.ok||(await current.json()).sha!==(receipt.deploymentSourceCommit??receipt.sourceCommit))throw Error('CURRENT_SOURCE_COMMIT_UNVERIFIED');
 const observed=Date.parse(receipt.observedAt);if(!(observed>=Date.parse(run.created_at)&&observed<=Date.parse(run.updated_at)+300000))throw Error('ROLE_RUN_TIME_MISMATCH');
 return {verified:true,runRef:receipt.runRef,sourceCommit:receipt.sourceCommit,observerSourceCommit:run.head_sha,deploymentSourceCommit:receipt.deploymentSourceCommit??receipt.sourceCommit,trigger:run.event,checkedAt:new Date().toISOString()};
}
async function get(url,domain){const u=new URL(url);if(u.protocol!=='https:'||u.hostname.replace(/^www\./,'')!==domain||u.username||u.password||u.port)throw Error('ADAPTER_SCOPE_INVALID');const r=await fetch(u,{redirect:'error',signal:AbortSignal.timeout(12000),headers:{Accept:'application/json'}});if(!r.ok)throw Error('SOURCE_HTTP_'+r.status);const raw=await r.text();if(raw.length>500000)throw Error('SOURCE_TOO_LARGE');return JSON.parse(raw);}
// Serial site processing preserves explicit priority. Per-site exceptions never stop others.
for(const {row,tasks} of selected){const adapter=adapters.sites?.[row.domain];let packet=null,probeError=null;
 try{if(adapter?.publisherStatusUrl){const p=await get(adapter.publisherStatusUrl,row.domain);row.probe={checkedAt:new Date().toISOString(),sourceUrl:adapter.publisherStatusUrl,status:typeof p.status==='string'&&/^[a-z-]{1,60}$/.test(p.status)?p.status:'unknown',trigger:['schedule','push','workflow_dispatch'].includes(p.event??p.sotLoad?.trigger)?(p.event??p.sotLoad?.trigger):null,runUrl:/^https:\/\/github\.com\/SHTFTV\/[A-Za-z0-9_.-]+\/actions\/runs\/\d+$/.test(p.runUrl??'')?p.runUrl:null,scope:'Actual publisher status only; does not certify any role.'};}
 if(adapter?.roleEvidenceUrl)packet=await get(adapter.roleEvidenceUrl,row.domain);
 if(adapter?.ownerAlertSourceUrl){const [source,reader]=await Promise.all([get(adapter.ownerAlertSourceUrl,row.domain),get('https://markett-ca.vercel.app/api/publication-activity','markett-ca.vercel.app')]);row.ownerDelivery=matchPullDelivery(row.domain,source,reader);}
 }catch(e){if(adapter?.ownerAlertSourceUrl)row.ownerDelivery={status:'unverified',observedAt:new Date().toISOString(),previousDeliveryRef:row.ownerDelivery?.deliveryRef??null,ownerReadVerified:false,reason:'Current source/reader observation unavailable; prior delivery does not clear this failure.'};probeError=/^[A-Z0-9_]{1,64}$/.test(e.message)?e.message:'ROLE_SOURCE_UNAVAILABLE';}
 for(const task of tasks){
 if(adapter?.format==='mining-four-roles-v1'){const key={worker:'publisher','visual-checker':'visual',supervisor:'supervisor','independent-watchdog':'watchdog'}[task.role],raw=packet?.roles?.[key];const clean=v=>typeof v==='string'&&!/sk-|bearer|password=|token=/i.test(v)?v.replace(/[\u0000-\u001f]/g,' ').slice(0,400):null;task.producerObservation=raw?{reportedStatus:clean(raw.status),ttlMs:1200000,observedAt:Number.isFinite(Date.parse(raw.checkedAt))?raw.checkedAt:null,runRef:/^https:\/\/github\.com\/SHTFTV\/theminingminute\.com\/actions\/runs\/\d+$/.test(raw.runUrl??'')?raw.runUrl:null,trigger:clean(raw.trigger),loadedRevision:raw.sot?.version??null,loadedHash:/^[a-f0-9]{64}$/.test(raw.sot?.sha256??'')?raw.sot.sha256:null,issues:Array.isArray(raw.issues)?raw.issues.map(clean).filter(Boolean).slice(0,8):[],executionProvider:'github-actions',scope:'Producer-reported role observation; shared acceptance and independent provider verification remain required.'}:null;}
 let receipt=projectReceipt(packet?.receipts?.find(r=>r.check==='role:'+task.role&&r.site===row.domain)??null);
 let attestationError=null;if(receipt&&!sharedRoleEvaluator)attestationError='SHARED_ROLE_VALIDATOR_NOT_YET_RELEASED';if(receipt&&sharedRoleEvaluator){const assessment=sharedRoleEvaluator(contracts.find(r=>r.contract?.site===row.domain)?.contract??{site:row.domain,repository:row.source.repository,sourceCommit:row.source.sourceCommit},packet.receipts);if(assessment.matrix.find(r=>r.role===task.role)?.status!=='passed')attestationError='CANONICAL_ROLE_STANDARD_NOT_PASSED';}if(receipt&&!attestationError){try{receipt={...receipt,runtimeAttestation:await verifyRun(receipt)};}catch(e){attestationError=e.message;}}
 const blocker=attestationError??probeError??(!row.source.repository?'Recover canonical site SOT/source, required integrations and sole runtime owner; registry ownership is not a built site.':!adapter?.roleEvidenceUrl?'Existing site owner must connect actual '+task.role+' execution adapter; no replacement publisher or activation attempted.':!receipt?(task.producerObservation?'Producer '+task.role+' reports '+task.producerObservation.reportedStatus+'. '+(task.producerObservation.issues.join('; ')||'Shared current source/runtime evidence contract remains incomplete.')+(task.role==='independent-watchdog'?' Same GitHub provider cannot prove external detection of GitHub scheduler silence.':''):'Actual '+task.role+' receipt missing from site adapter.'):null);
 finish(task,{runId,blocker,receipt},Date.now());}
 row.lastCheckAt=new Date().toISOString();
 // Checkpoint each site; final commit is bounded, failure recovery retains earlier leases.
 await save(path,state);
}
state.coordinator.completedAt=new Date().toISOString();state.coordinator.status='completed-with-evidence-gaps';state.coordinator.processedSites=selected.length;
const watchdog=await read(watchdogPath,{});state.summary={inventory:state.rows.length,approved:state.rows.filter(r=>stamp(r,{coordinator:state.coordinator,watchdog}).approved).length,blockedRoleTasks:state.rows.flatMap(r=>r.roles).filter(t=>t.status==='blocked').length,pendingRoleTasks:state.rows.flatMap(r=>r.roles).filter(t=>t.status==='pending').length,ownerDelivery:'Per-site authorized pull-route delivery is independently matched where integrated; other routes remain unknown.',continuousUptimeProven:false};
await save(path,state);persist([path],'Persist portfolio rollout results and retained blockers');return {coordinator:state.coordinator,summary:state.summary};

}
