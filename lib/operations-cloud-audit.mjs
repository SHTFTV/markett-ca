import {createHash} from 'node:crypto';
import {authenticate,accept} from './operations-events.mjs';
import {configuration} from './operations-transport.mjs';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
function eventId(operation,domain,stage){const hex=createHash('sha256').update(operation+'\n'+domain+'\n'+stage).digest('hex');return hex.slice(0,8)+'-'+hex.slice(8,12)+'-4'+hex.slice(13,16)+'-8'+hex.slice(17,20)+'-'+hex.slice(20,32);}
export async function cloudAudit(req,res,{connect,auditSite,env=process.env,now=Date.now}={}){
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');let db,executionStarted=false;
 if(req.method!=='POST'){res.statusCode=405;res.end(JSON.stringify({error:'METHOD_NOT_ALLOWED'}));return;}
 try{
  const config=configuration(env);let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>16384)throw Error('REQUEST_TOO_LARGE');}
  const actor=authenticate(raw,req.headers,config.keys,now()),input=JSON.parse(raw);
  if(!uuid.test(input.operationId??'')||!Array.isArray(input.domains)||input.domains.length<1||input.domains.length>25||new Set(input.domains).size!==input.domains.length)throw Error('INVALID_AUDIT_BATCH');
  if(!['task_started','task_completed','task_blocked'].every(t=>actor.types.includes(t))||input.domains.some(d=>!actor.domains.includes(d)))throw Error('SCOPE_DENIED');
  db=await connect(config);const canonical=new Set((await db.query('SELECT domain FROM portfolio_worker.sites')).rows.map(r=>r.domain));
  if(input.domains.some(d=>!canonical.has(d)))throw Error('UNKNOWN_CANONICAL_SITE');
  const lease=await db.query('SELECT pg_try_advisory_lock(hashtextextended($1,0)) AS acquired',[input.operationId]);
  if(lease.rows[0].acquired!==true)throw Error('AUDIT_BATCH_ALREADY_RUNNING');
  executionStarted=true;
  // One DB connection, serialized transactions; parallel network requests never interleave BEGIN/COMMIT.
  let writes=Promise.resolve(),next=0;const outcomes=[];
  const persist=event=>{const operation=writes.then(()=>accept(db,event,actor,now()));writes=operation.catch(()=>{});return operation;};
  await Promise.all(Array.from({length:Math.min(input.domains.length,5)},async()=>{
   for(;;){const index=next++;if(index>=input.domains.length)break;const domain=input.domains[index],id=eventId(input.operationId,domain,'result');
    const old=await writes.then(()=>db.query('SELECT cursor,public_data FROM portfolio_worker.operation_events WHERE event_id=$1',[id]));
    if(old.rows.length){outcomes.push({...old.rows[0].public_data,cursor:String(old.rows[0].cursor),replayed:true});continue;}
    const startedId=eventId(input.operationId,domain,'started');
    const started=await writes.then(()=>db.query('SELECT cursor FROM portfolio_worker.operation_events WHERE event_id=$1',[startedId]));
    if(!started.rows.length)await persist({eventId:startedId,domain,type:'task_started',status:'running',taskKey:'homepage-http-check',observedAt:new Date(now()).toISOString()});
    const result=await auditSite(domain),success=result.http?.status===200&&!result.http?.error;
    const receipt=await persist({eventId:id,domain,type:success?'task_completed':'task_blocked',status:success?'verified':'blocked',taskKey:'homepage-http-check',issueCode:success?'none':'verification',observedAt:new Date(now()).toISOString(),httpStatus:result.http?.status??null,requestSucceeded:success,trigger:'manual-request'});
    outcomes.push({domain,httpStatus:result.http?.status??null,requestSucceeded:success,cursor:receipt.cursor,acceptedAt:receipt.acceptedAt});
   }
  }));
  res.statusCode=200;res.end(JSON.stringify({trigger:'manual-request',cloudExecuted:true,publicationClaimed:false,operationId:input.operationId,completedChecks:outcomes.length,outcomes}));
 }catch(error){const known=['UNAUTHORIZED','SCOPE_DENIED','INVALID_AUDIT_BATCH','UNKNOWN_CANONICAL_SITE','REQUEST_TOO_LARGE','AUDIT_BATCH_ALREADY_RUNNING'];res.statusCode=error.message==='UNAUTHORIZED'?401:error.message==='SCOPE_DENIED'?403:error.message==='AUDIT_BATCH_ALREADY_RUNNING'?409:known.includes(error.message)?400:503;res.end(JSON.stringify({error:known.includes(error.message)?error.message:'CLOUD_AUDIT_FAILED',cloudExecuted:executionStarted,complete:false,publicationClaimed:false}));}
 finally{await db?.end?.();}
}
