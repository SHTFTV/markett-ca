import {projectReceipt} from './receipt-projection.mjs';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {registry} from '../../api/registry-data.js';
import {syncQueue,claim,finish,stamp,PRIORITY} from '../../lib/portfolio-rollout.mjs';
const path='portfolio-rollout-status.json',watchdogPath='portfolio-rollout-watchdog.json';
const read=async(p,fallback)=>{try{return JSON.parse(await readFile(p,'utf8'));}catch(e){if(e.code==='ENOENT')return fallback;throw e;}};
let sharedRoleEvaluator=null;try{sharedRoleEvaluator=(await import('../../lib/four-role-evidence.mjs')).evaluateFourRoles;}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;}
const adapters=await read('docs/rollout/adapters.json',{}),coverage=await read('docs/completion/sot-coverage.json',{});
const now=Date.now(),runId=process.env.GITHUB_RUN_ID??'local-preparation',trigger=process.env.GITHUB_EVENT_NAME??'local-preparation',runUrl=process.env.GITHUB_RUN_ID?'https://github.com/'+process.env.GITHUB_REPOSITORY+'/actions/runs/'+runId:null;
const save=async(p,data)=>writeFile(p,JSON.stringify(data,null,2)+'\n');
function persist(paths,message){if(process.env.ROLLOUT_COMMIT!=='true')return;execFileSync('git',['add','--',...paths]);if(execFileSync('git',['diff','--cached','--name-only'],{encoding:'utf8'}).trim()){execFileSync('git',['commit','-m',message],{stdio:'inherit'});execFileSync('git',['push','origin','HEAD:main'],{stdio:'inherit'});}}
if(process.argv.includes('--watchdog')){
 const state=await read(path,{}),age=now-Date.parse(state.coordinator?.completedAt);
 const result={schemaVersion:1,checkedAt:new Date(now).toISOString(),runId,runUrl,trigger,coordinatorRunId:state.coordinator?.runId??null,status:age>=0&&age<=3600000?'fresh':'stale-or-missing',ownerDelivery:{status:'blocked',reason:'No authorized cloud-callable owner-delivery integration is configured; a dashboard row / GitHub run is not delivery.'},independentSiteWatchdog:false};
 await save(watchdogPath,result);persist([watchdogPath],'Record independent portfolio coordinator freshness check');console.log(JSON.stringify(result));process.exit(0);
}
let state=syncQueue(registry,await read(path,{}),now);
const sourceSha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
state.registryDigest=createHash('sha256').update(JSON.stringify(registry.map(r=>r.domain))).digest('hex');
state.coordinator={runId,runUrl,trigger,sourceCommit:sourceSha,startedAt:new Date(now).toISOString(),completedAt:null,status:'running',scope:'Portfolio management and evidence adapters; never a replacement site publisher or a fifth site role.'};
for(const row of state.rows){const site=coverage.sites?.find(s=>s.domain===row.domain);row.source={repository:site?.canonicalRepository??null,sourceCommit:site?.sourceCommit??null,sotPath:site?.canonicalSotPath??null,requiredRuleVersion:site?.requiredRuleVersion??null};}
if(process.argv.includes('--initialize')){state.coordinator.status='prepared-not-executed';state.coordinator.completedAt=null;await save(path,state);await save(watchdogPath,{schemaVersion:1,status:'missing',checkedAt:null});console.log(JSON.stringify({inventory:state.rows.length,approved:0,runtimeExecuted:false}));process.exit(0);}
// Claim before doing work: persisted leases survive process termination/restart.
const selected=[];
const candidates=[...state.rows].sort((a,b)=>{const rank=r=>PRIORITY.includes(r.domain)?PRIORITY.indexOf(r.domain):999;return rank(a)-rank(b)||Number(!a.roles.some(t=>t.attempts===0))-Number(!b.roles.some(t=>t.attempts===0))||Date.parse(a.lastCheckAt??'1970-01-01')-Date.parse(b.lastCheckAt??'1970-01-01');});
for(const row of candidates){if(selected.length>=30)break;const claimed=row.roles.filter(t=>claim(row,t.role,runId,now));if(claimed.length)selected.push({row,tasks:claimed});}
await save(path,state);persist([path],'Lease bounded portfolio rollout batch');
async function verifyRun(receipt){
 const m=/^https:\/\/github\.com\/(SHTFTV\/[A-Za-z0-9_.-]+)\/actions\/runs\/(\d+)$/.exec(receipt.runRef??'');if(!m||m[1]!==receipt.repository)throw Error('RUNTIME_PROVIDER_VERIFICATION_MISSING');
 const headers={Accept:'application/vnd.github+json'};if(process.env.GITHUB_TOKEN)headers.Authorization='Bearer '+process.env.GITHUB_TOKEN;
 const res=await fetch('https://api.github.com/repos/'+m[1]+'/actions/runs/'+m[2],{headers,signal:AbortSignal.timeout(12000)});if(!res.ok)throw Error('RUNTIME_PROVIDER_ACCESS_UNAVAILABLE');const run=await res.json();if(run.conclusion!=='success'||run.status!=='completed'||run.head_sha!==receipt.sourceCommit||(receipt.check==='role:worker'&&run.event!=='schedule'))throw Error('RUNTIME_RUN_MISMATCH');
 const current=await fetch('https://api.github.com/repos/'+m[1]+'/commits/main',{headers,signal:AbortSignal.timeout(12000)});if(!current.ok||(await current.json()).sha!==receipt.sourceCommit)throw Error('CURRENT_SOURCE_COMMIT_UNVERIFIED');
 const observed=Date.parse(receipt.observedAt);if(!(observed>=Date.parse(run.created_at)&&observed<=Date.parse(run.updated_at)+300000))throw Error('ROLE_RUN_TIME_MISMATCH');
 return {verified:true,runRef:receipt.runRef,sourceCommit:run.head_sha,trigger:run.event,checkedAt:new Date().toISOString()};
}
async function get(url,domain){const u=new URL(url);if(u.protocol!=='https:'||u.hostname.replace(/^www\./,'')!==domain||u.username||u.password||u.port)throw Error('ADAPTER_SCOPE_INVALID');const r=await fetch(u,{redirect:'error',signal:AbortSignal.timeout(12000),headers:{Accept:'application/json'}});if(!r.ok)throw Error('SOURCE_HTTP_'+r.status);const raw=await r.text();if(raw.length>500000)throw Error('SOURCE_TOO_LARGE');return JSON.parse(raw);}
// Serial site processing preserves explicit priority. Per-site exceptions never stop others.
for(const {row,tasks} of selected){const adapter=adapters.sites?.[row.domain];let packet=null,probeError=null;
 try{if(adapter?.publisherStatusUrl){const p=await get(adapter.publisherStatusUrl,row.domain);row.probe={checkedAt:new Date().toISOString(),sourceUrl:adapter.publisherStatusUrl,status:typeof p.status==='string'&&/^[a-z-]{1,60}$/.test(p.status)?p.status:'unknown',trigger:['schedule','push','workflow_dispatch'].includes(p.event??p.sotLoad?.trigger)?(p.event??p.sotLoad?.trigger):null,runUrl:/^https:\/\/github\.com\/SHTFTV\/[A-Za-z0-9_.-]+\/actions\/runs\/\d+$/.test(p.runUrl??'')?p.runUrl:null,scope:'Actual publisher status only; does not certify any role.'};}
 if(adapter?.roleEvidenceUrl)packet=await get(adapter.roleEvidenceUrl,row.domain);
 }catch(e){probeError=/^[A-Z0-9_]{1,64}$/.test(e.message)?e.message:'ROLE_SOURCE_UNAVAILABLE';}
 for(const task of tasks){let receipt=projectReceipt(packet?.receipts?.find(r=>r.check==='role:'+task.role&&r.site===row.domain)??null);
 let attestationError=null;if(receipt&&!sharedRoleEvaluator)attestationError='SHARED_ROLE_VALIDATOR_NOT_YET_RELEASED';if(receipt&&sharedRoleEvaluator){const assessment=sharedRoleEvaluator({site:row.domain,repository:row.source.repository,sourceCommit:row.source.sourceCommit},packet.receipts);if(assessment.matrix.find(r=>r.role===task.role)?.status!=='passed')attestationError='CANONICAL_ROLE_STANDARD_NOT_PASSED';}if(receipt&&!attestationError){try{receipt={...receipt,runtimeAttestation:await verifyRun(receipt)};}catch(e){attestationError=e.message;}}
 const blocker=attestationError??probeError??(!row.source.repository?'Recover canonical site SOT/source, required integrations and sole runtime owner; registry ownership is not a built site.':!adapter?.roleEvidenceUrl?'Existing site owner must connect actual '+task.role+' execution adapter; no replacement publisher or activation attempted.':!receipt?'Actual '+task.role+' receipt missing from site adapter.':null);
 finish(task,{runId,blocker,receipt},Date.now());}
 row.lastCheckAt=new Date().toISOString();
 // Checkpoint each site; final commit is bounded, failure recovery retains earlier leases.
 await save(path,state);
}
state.coordinator.completedAt=new Date().toISOString();state.coordinator.status='completed-with-evidence-gaps';state.coordinator.processedSites=selected.length;
const watchdog=await read(watchdogPath,{});state.summary={inventory:state.rows.length,approved:state.rows.filter(r=>stamp(r,{coordinator:state.coordinator,watchdog}).approved).length,blockedRoleTasks:state.rows.flatMap(r=>r.roles).filter(t=>t.status==='blocked').length,pendingRoleTasks:state.rows.flatMap(r=>r.roles).filter(t=>t.status==='pending').length,ownerDelivery:'unconfigured; genuine delivered receipt required',continuousUptimeProven:false};
await save(path,state);persist([path],'Persist portfolio rollout results and retained blockers');console.log(JSON.stringify({coordinator:state.coordinator,summary:state.summary}));
