import {randomUUID,createHash} from 'node:crypto';
export async function readMonitor(db,{synthetic=false}={}){
 const incidents=(await db.query('SELECT payload FROM portfolio_monitor.incidents WHERE synthetic=$1 ORDER BY first_seen LIMIT 2000',[synthetic])).rows.map(r=>r.payload);
 const run=(await db.query('SELECT payload FROM portfolio_monitor.runs WHERE synthetic=$1 ORDER BY observed_at DESC LIMIT 1',[synthetic])).rows[0]?.payload??null;
 const n=(await db.query("SELECT status,created_at,delivery_ref,acknowledgement_ref,error_code,payload->>'deliveryStage' AS delivery_stage,payload->>'providerReceiptRef' AS provider_ref FROM portfolio_monitor.notifications WHERE synthetic=$1 ORDER BY created_at DESC LIMIT 1",[synthetic])).rows[0];
 return {connected:true,incidents,monitorRun:run,lastNotification:n?{status:n.status,stage:n.delivery_stage,providerReceiptRef:n.provider_ref,observedAt:new Date(n.created_at).toISOString(),deliveryRef:n.delivery_ref,acknowledgementRef:n.acknowledgement_ref,errorCode:n.error_code}:null};
}
export async function saveMonitor(db,state,run,{synthetic=false}={}){
 await db.query('BEGIN');try{
  await db.query("SELECT pg_advisory_xact_lock(hashtextextended('markett-monitor-notification-save',0))");
  await db.query('INSERT INTO portfolio_monitor.runs(id,observed_at,synthetic,payload) VALUES($1,$2,$3,$4::jsonb)',[run.id,run.observedAt,synthetic,JSON.stringify(run)]);
  if(state.length)await db.query("INSERT INTO portfolio_monitor.incidents(id,domain,status,synthetic,first_seen,last_seen,payload) SELECT x->>'id',x->>'domain',x->>'status',$2,(x->>'firstSeen')::timestamptz,(x->>'lastSeen')::timestamptz,x FROM jsonb_array_elements($1::jsonb) x ON CONFLICT(id) DO UPDATE SET status=EXCLUDED.status,last_seen=EXCLUDED.last_seen,payload=EXCLUDED.payload",[JSON.stringify(state),synthetic]);
  state=(await db.query('SELECT payload FROM portfolio_monitor.incidents WHERE synthetic=$1 ORDER BY first_seen',[synthetic])).rows.map(r=>r.payload);
  const signature=i=>createHash('sha256').update(JSON.stringify([i.id,i.status,i.severity,i.reason,i.nextAction,i.approvalAction,i.recovery?.proofRef??null])).digest('hex');
  const stateSignatures=state.map(signature).sort(),fingerprint=createHash('sha256').update(JSON.stringify(stateSignatures)).digest('hex');
  const prior=(await db.query("SELECT id,status,payload FROM portfolio_monitor.notifications WHERE synthetic=$1 AND payload->>'stateFingerprint'=$2 ORDER BY created_at DESC LIMIT 1",[synthetic,fingerprint])).rows[0];
  if(prior){await db.query('COMMIT');return {...prior.payload,id:prior.id,skipDelivery:true};}
  const previous=(await db.query('SELECT payload FROM portfolio_monitor.notifications WHERE synthetic=$1 ORDER BY created_at DESC LIMIT 1',[synthetic])).rows[0]?.payload;const notified=new Set(previous?.stateSignatures??[]);
  const notification={stateSignatures,stateFingerprint:fingerprint,id:randomUUID(),runId:run.id,synthetic,label:synthetic?'SYNTHETIC PRIVATE FAILURE/RECOVERY TEST':'ACTUAL PORTFOLIO OPERATING ALERT',observedAt:run.observedAt,open:state.filter(i=>i.status==='open'&&!notified.has(signature(i))),recovered:state.filter(i=>i.status==='recovered'&&!notified.has(signature(i)))};
  await db.query("INSERT INTO portfolio_monitor.notifications(id,run_id,synthetic,status,payload) VALUES($1,$2,$3,'pending',$4::jsonb)",[notification.id,run.id,synthetic,JSON.stringify(notification)]);await db.query('COMMIT');return notification;
 }catch(e){await db.query('ROLLBACK');throw e;}
}
export async function recordDelivery(db,id,result){
 await db.query('BEGIN');try{
  await db.query('INSERT INTO portfolio_monitor.delivery_attempts(notification_id,outcome,delivery_ref,error_code) VALUES($1,$2,$3,$4)',[id,result.stage??result.status,result.deliveryRef??null,result.errorCode??null]);
  await db.query('UPDATE portfolio_monitor.notifications SET status=$2,delivery_ref=$3,acknowledgement_ref=$4,error_code=$5,payload=payload || $6::jsonb WHERE id=$1',[id,result.status,result.deliveryRef??null,result.acknowledgementRef??null,result.errorCode??null,JSON.stringify({deliveryStage:result.stage??result.status,providerReceiptRef:result.providerReceiptRef??null})]);await db.query('COMMIT');
 }catch(e){await db.query('ROLLBACK');throw e;}
}

