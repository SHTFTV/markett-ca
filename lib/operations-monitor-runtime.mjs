import {randomUUID,timingSafeEqual} from 'node:crypto';
import {authenticate} from './operations-events.mjs';import {configuration} from './operations-transport.mjs';
import {assessWorkers,applyIncidentState,workerContracts,standingHolds} from './operations-monitor-model.mjs';
import {readMonitor,saveMonitor,recordDelivery} from './operations-monitor-store.mjs';
import {deliverNotification,deliveryConfiguration} from './operations-notification-delivery.mjs';
import {evaluateBuildStages} from './site-build-gate.mjs';
const equal=(a,b)=>typeof a==='string'&&typeof b==='string'&&Buffer.byteLength(a)===Buffer.byteLength(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
export function cronAuthorized(req,env){return !!env.CRON_SECRET&&equal(req.headers.authorization,'Bearer '+env.CRON_SECRET);}
export async function monitorEvents(db){return (await db.query("WITH latest AS (SELECT DISTINCT ON(site_id,actor_id,COALESCE(public_data->>'taskKey','@heartbeat')) actor_id,cursor,public_data FROM portfolio_worker.operation_events ORDER BY site_id,actor_id,COALESCE(public_data->>'taskKey','@heartbeat'),cursor DESC), failures AS (SELECT DISTINCT ON(site_id,actor_id,public_data->>'taskKey') actor_id,cursor,public_data FROM portfolio_worker.operation_events WHERE public_data->>'type' IN ('task_blocked','publication_failed') ORDER BY site_id,actor_id,public_data->>'taskKey',cursor DESC) SELECT * FROM latest UNION SELECT * FROM failures")).rows.map(r=>({...r.public_data,actorId:r.actor_id,cursor:String(r.cursor)}));}
export function prerequisiteIssues(records){return records.flatMap(r=>evaluateBuildStages(r.contract,r.evidence).blockers.map(b=>({id:'prebuild:'+r.contract.site+':'+b.id,domain:r.contract.site,worker:'site-build-prerequisites',cause:b.id,severity:'red',title:'Dependent build prerequisite unproven: '+b.id,impact:'Substantial dependent build is gated; independent work may continue.',owner:'Assigned site implementation owner',nextAction:b.reason,evidenceAt:null,proofRef:r.contract.requirementsRef})));}
export async function reconcileMonitor(db,{publicReceipts=[],records=[],scope=null,synthetic=false,env=process.env,now=Date.now()}={}){
 const lock=await db.query('SELECT pg_try_advisory_lock(hashtextextended($1,0)) AS acquired',['markett-operations-monitor:'+synthetic]);if(lock.rows[0]?.acquired!==true)throw Error('MONITOR_ALREADY_RUNNING');
 const before=await readMonitor(db,{synthetic});const at=new Date(now).toISOString();let assessment,scopeGaps=[];
 if(synthetic){
  const worker='private-synthetic-drill',taskKey='private-drill-item',domain='markett.ca',cursor='synthetic-private';
  const event={domain,actorId:worker,taskKey,type:'task_blocked',status:'blocked',issueCode:'verification',observedAt:at,cursor};
  const failed=assessWorkers({events:[event],contracts:[],holds:[],now});
  const first=applyIncidentState([],failed,{now,synthetic:true}).map(i=>({...i,id:'synthetic:'+randomUUID(),originalId:i.id}));
  const row=first[0];assessment={issues:[],recoveries:[]};
  const acknowledged={...row,acknowledgedAt:at};const retained=applyIncidentState([acknowledged],{issues:[],recoveries:[]},{now,synthetic:true});if(retained[0].status!=='open')throw Error('PRIVATE_DRILL_ACK_CLEARED_FAILURE');
  // Preserve both durable failure and verified recovery, privately and clearly labelled.
  const run={id:randomUUID(),observedAt:at,status:'private-synthetic-failure',scopeGaps:[],synthetic:true};const notification=await saveMonitor(db,first,run,{synthetic:true});await recordDelivery(db,notification.id,await deliverNotification(notification,{env}));
  const recovery={id:row.id,verifiedAt:new Date(now+1).toISOString(),evidenceAt:new Date(now+1).toISOString(),proofRef:'private-synthetic:matching-item-recovery',kind:'matching-actor-task'};
  const recovered=applyIncidentState(retained,{issues:[],recoveries:[recovery]},{now:now+1,synthetic:true});
  const finalRun={id:randomUUID(),observedAt:new Date(now+1).toISOString(),status:'private-synthetic-recovery',scopeGaps:[],synthetic:true};const last=await saveMonitor(db,recovered,finalRun,{synthetic:true});const delivery=await deliverNotification(last,{env});await recordDelivery(db,last.id,delivery);
  return {synthetic:true,private:true,failureRetained:row.status==='open',acknowledgementDidNotClear:true,matchingRecoveryVerified:recovered[0].status==='recovered',notification:delivery.status,deliveryError:delivery.errorCode??null,runId:finalRun.id};
 }
 const events=await monitorEvents(db);assessment=assessWorkers({events,publicReceipts,now});assessment.issues.push(...prerequisiteIssues(records));
 let deliveryConfigured=false;try{deliveryConfigured=!!deliveryConfiguration(env);}catch{}
 if(!deliveryConfigured||before.lastNotification?.status!=='delivered')assessment.issues.push({id:'monitor:owner-delivery',domain:'markett.ca',worker:'operations-monitor',cause:'owner-delivery',severity:'red',title:'Independent owner notification delivery is not yet verified.',impact:'Detected failures cannot yet be proven delivered to the owner outside this dashboard.',owner:'MarkEtt delivery integration owner',nextAction:'Connect an approved independent owner delivery ingress in production using MARKETT_ALERT_WEBHOOK_URL, MARKETT_ALERT_WEBHOOK_TOKEN and MARKETT_ALERT_DESTINATION. Require actual delivery/acknowledgement receipts; local Codex ACTIVE settings are not cloud delivery.',evidenceAt:null});
 if(deliveryConfigured&&before.lastNotification?.status==='delivered'&&before.lastNotification.deliveryRef)assessment.recoveries.push({id:'monitor:owner-delivery',verifiedAt:at,evidenceAt:before.lastNotification.observedAt,proofRef:before.lastNotification.deliveryRef,kind:'actual-owner-delivery-receipt'});
 if(scope){scopeGaps=[...new Set(assessment.issues.filter(i=>!scope.includes(i.domain)).map(i=>i.domain))];assessment.issues=assessment.issues.filter(i=>scope.includes(i.domain));assessment.recoveries=assessment.recoveries.filter(i=>before.incidents.some(p=>p.id===i.id&&scope.includes(p.domain)));}
 const state=applyIncidentState(before.incidents,assessment,{now});const run={id:randomUUID(),observedAt:at,status:!deliveryConfigured?'delivery-blocked':state.some(i=>i.status==='open')?'attention':'healthy',scopeGaps,synthetic:false,openIncidents:state.filter(i=>i.status==='open').length};
 const notification=await saveMonitor(db,state,run);const delivery=await deliverNotification(notification,{env});await recordDelivery(db,notification.id,delivery);
 return {...run,notification:delivery.status,deliveryError:delivery.errorCode??null,deliveryRef:delivery.deliveryRef??null,acknowledgementRef:delivery.acknowledgementRef??null};
}
export async function handleMonitor(req,res,{connect,collect,records,env=process.env,now=Date.now()}={}){
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');let db;
 if(env.MARKETT_DURABLE_MONITOR_ENABLED!=='true'){res.statusCode=503;res.end(JSON.stringify({error:'DURABLE_MONITOR_ACTIVATION_PENDING',monitorHealthy:false,ownerDeliveryVerified:false}));return;}
 try{
  const cfg=configuration(env);let synthetic=false,scope=null;
  if(req.method==='GET'){if(!cronAuthorized(req,env))throw Error('UNAUTHORIZED');}
  else if(req.method==='POST'){let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>4096)throw Error('INVALID_MONITOR_REQUEST');}const actor=authenticate(raw,req.headers,cfg.keys,now),input=JSON.parse(raw);if(actor.id!=='operations-audit'||!actor.types.includes('task_completed')||!actor.types.includes('task_blocked'))throw Error('SCOPE_DENIED');if(!['reconcile','private-synthetic-drill'].includes(input.kind))throw Error('INVALID_MONITOR_REQUEST');synthetic=input.kind==='private-synthetic-drill';scope=actor.domains;if(synthetic&&!scope.includes('markett.ca'))throw Error('SCOPE_DENIED');}
  else{res.statusCode=405;res.end(JSON.stringify({error:'METHOD_NOT_ALLOWED'}));return;}
  db=await connect(cfg);const publicReceipts=synthetic?[]:await collect();const result=await reconcileMonitor(db,{publicReceipts,records,scope,synthetic,env,now});res.statusCode=200;res.end(JSON.stringify(result));
 }catch(e){const known=['UNAUTHORIZED','SCOPE_DENIED','INVALID_MONITOR_REQUEST','MONITOR_ALREADY_RUNNING'];res.statusCode=e.message==='UNAUTHORIZED'?401:e.message==='SCOPE_DENIED'?403:e.message==='MONITOR_ALREADY_RUNNING'?409:known.includes(e.message)?400:503;res.end(JSON.stringify({error:known.includes(e.message)?e.message:'MONITOR_UNAVAILABLE',monitorHealthy:false,ownerDeliveryVerified:false}));}
 finally{await db?.end?.();}
}
