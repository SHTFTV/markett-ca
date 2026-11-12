import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
const types=new Set(['site_registered','task_created','task_started','task_blocked','task_completed','publication_failed','publication_verified','heartbeat']);
const issues=new Set(['none','source','image','writer','credential','deployment','verification','overdue','approval','backend','unknown']);
const statuses=new Set(['queued','running','blocked','failed','verified','unknown','healthy-no-news']);
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export function authenticate(raw,headers,keys,now=Date.now()){
 const actor=headers['x-markett-worker'],ts=headers['x-markett-timestamp'],sig=headers['x-markett-signature'],key=keys[actor];
 if(!key||key.disabled||!/^\d{13}$/.test(ts??'')||Math.abs(now-Number(ts))>300000)throw Error('UNAUTHORIZED');
 const expected=createHmac('sha256',key.secret).update(ts+'.'+raw).digest('hex');
 if(!/^[a-f0-9]{64}$/.test(sig??'')||!timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))throw Error('UNAUTHORIZED');
 return {id:actor,domains:key.domains,types:key.types};
}
export function project(input,actor,now=Date.now()){
 if(!input||typeof input!=='object'||!uuid.test(input.eventId??'')||!types.has(input.type)||!statuses.has(input.status)||!issues.has(input.issueCode??'none'))throw Error('INVALID_EVENT');
 if(!actor.types.includes(input.type)||!actor.domains.includes(input.domain))throw Error('SCOPE_DENIED');
 const at=Date.parse(input.observedAt);if(!Number.isFinite(at)||at>now+300000||at<now-86400000)throw Error('INVALID_EVENT_TIME');
 const row={domain:input.domain,type:input.type,status:input.status,observedAt:new Date(at).toISOString(),issueCode:input.issueCode??'none'};
 if(['task_blocked','publication_failed'].includes(input.type)){for(const key of ['publicReason','publicNextAction','publicApprovalAction']){const value=input[key];if(typeof value==='string'&&value.length<=600&&!/sk-|bearer|token=|password=|secret=|[\w.+-]+@[\w.-]+\.[a-z]{2}/i.test(value))row[key]=value.replace(/<[^>]*>/g,'').replace(/[\u0000-\u001f]/g,' ');}}
 if(input.taskKey!==undefined){if(!/^[a-z0-9][a-z0-9-]{0,79}$/.test(input.taskKey))throw Error('INVALID_TASK');row.taskKey=input.taskKey;}
 if(input.taskKey==='homepage-http-check'&&Object.hasOwn(input,'httpStatus')){
  if(input.httpStatus!==null&&(!Number.isInteger(input.httpStatus)||input.httpStatus<100||input.httpStatus>599))throw Error('INVALID_HTTP_CHECK');
  row.checkKind='homepage-http';row.httpStatus=input.httpStatus;
  if(typeof input.requestSucceeded==='boolean'){row.requestSucceeded=input.requestSucceeded;row.retryPending=input.requestSucceeded===false;}
  if(['manual-request','github-push','github-schedule','github-dispatch'].includes(input.trigger))row.trigger=input.trigger;
 }
 if(input.type==='publication_verified'){
  const url=new URL(input.articleUrl);if(url.protocol!=='https:'||url.hostname.replace(/^www\./,'')!==input.domain||url.username||url.password||url.port||url.search||url.hash)throw Error('INVALID_ARTICLE_URL');
  if(input.status!=='verified'||input.httpStatus!==200||!input.canonicalVerified||!input.discoveryVerified||!input.imageVerified||!input.desktopVerified||!input.phoneVerified)throw Error('INCOMPLETE_PUBLICATION_RECEIPT');
  const published=Date.parse(input.publishedAt);if(!Number.isFinite(published)||published>now+300000||published<at-86400000*366)throw Error('INVALID_PUBLICATION_TIME');
  row.articleUrl=url.href;row.publishedAt=new Date(published).toISOString();
  row.evidence='Scoped publisher reports live checks passed';
 }
 return row;
}
export async function accept(db,input,actor,now=Date.now()){
 const publicData=project(input,actor,now),hash=createHash('sha256').update(JSON.stringify(publicData)).digest('hex');
 await db.query('BEGIN');
 try{
  // Serialize accepted inserts before allocating a cursor, so replay order follows commit order.
  await db.query('SELECT pg_advisory_xact_lock(741920115)');
  const {rows:sites}=await db.query('SELECT id FROM portfolio_worker.sites WHERE domain=$1',[input.domain]);
  if(sites.length!==1)throw Error('UNKNOWN_CANONICAL_SITE');
  await db.query('INSERT INTO portfolio_worker.operation_events(event_id,site_id,actor_id,input_hash,public_data) VALUES($1,$2,$3,$4,$5::jsonb) ON CONFLICT(event_id) DO NOTHING',[input.eventId,sites[0].id,actor.id,hash,JSON.stringify(publicData)]);
  const {rows}=await db.query('SELECT cursor,accepted_at,input_hash,actor_id FROM portfolio_worker.operation_events WHERE event_id=$1',[input.eventId]);
  if(rows[0].input_hash!==hash||rows[0].actor_id!==actor.id)throw Error('IDEMPOTENCY_CONFLICT');
  await db.query('COMMIT');return {cursor:String(rows[0].cursor),acceptedAt:rows[0].accepted_at,durable:true};
 }catch(e){await db.query('ROLLBACK');throw e;}
}
export async function replay(db,after='0',limit=200){
 if(!/^\d{1,18}$/.test(after)||!Number.isInteger(limit)||limit<1||limit>500)throw Error('INVALID_CURSOR');
 const {rows}=await db.query('SELECT cursor,accepted_at,public_data FROM portfolio_worker.operation_events WHERE cursor>$1 ORDER BY cursor LIMIT $2',[after,limit]);
 return rows.map(r=>({cursor:String(r.cursor),acceptedAt:r.accepted_at,...r.public_data}));
}

