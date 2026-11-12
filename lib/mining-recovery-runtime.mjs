import {createHash,randomUUID,timingSafeEqual} from 'node:crypto';
import {recoverMiningPublisher} from './mining-publisher-recovery.mjs';
const DOMAIN='theminingminute.com';
const ACTOR='mining-publisher-recovery';
export async function runRecovery({db,token,fetchImpl=fetch,now=Date.now()}) {
 const insert=async(publicData,id=randomUUID())=>{
  const data=JSON.stringify(publicData),hash=createHash('sha256').update(data).digest('hex');
  const result=await db.query('INSERT INTO portfolio_worker.operation_events(event_id,site_id,actor_id,input_hash,public_data) SELECT $1,id,$2,$3,$4::jsonb FROM portfolio_worker.sites WHERE domain=$5 ON CONFLICT(event_id) DO NOTHING RETURNING cursor',[id,ACTOR,hash,data,DOMAIN]);
  if(result.rows.length!==1)throw Error('RECOVERY_EVENT_NOT_COMMITTED');
 };
 const record=async e=>insert({domain:DOMAIN,type:e.status==='red'?'task_blocked':'task_started',status:e.status==='red'?'blocked':'running',observedAt:new Date(now).toISOString(),issueCode:e.status==='red'?'overdue':'none',taskKey:'mining-publisher-recovery'});
 const withLease=async(key,ttl,fn)=>{
  await db.query('BEGIN');
  try {
   // Existing private event store is the durable lease ledger. No new schema or grants.
   await db.query('SELECT pg_advisory_xact_lock(741920116)');
   const existing=await db.query("SELECT cursor FROM portfolio_worker.operation_events WHERE actor_id=$1 AND public_data->>'taskKey'='mining-publisher-recovery-lease' AND accepted_at>clock_timestamp()-interval '10 minutes' ORDER BY cursor DESC LIMIT 1",[ACTOR]);
   if(existing.rows.length){await db.query('ROLLBACK');return {status:'lease-active'};}
   await insert({domain:DOMAIN,type:'task_started',status:'running',observedAt:new Date(now).toISOString(),issueCode:'none',taskKey:'mining-publisher-recovery-lease'});
   await db.query('COMMIT');
  }catch(e){await db.query('ROLLBACK');throw e;}
  return fn();
 };
 const github=async(method,path,body)=>{
  if(!path.startsWith('/repos/SHTFTV/theminingminute.com/actions/workflows/mining-publisher.yml/'))throw Error('RECOVERY_SCOPE_DENIED');
  const response=await fetchImpl('https://api.github.com'+path,{method,headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error('RECOVERY_GITHUB_HTTP_'+response.status);
  return response.status===204?{status:204}:response.json();
 };
 return recoverMiningPublisher({github,withLease,record,now});
}
export function authorized(req,secret) {
 const actual=Buffer.from(req.headers.authorization??''),expected=Buffer.from('Bearer '+secret);
 return typeof secret==='string'&&secret.length>=32&&actual.length===expected.length&&timingSafeEqual(actual,expected);
}
