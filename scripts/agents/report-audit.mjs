import {createHmac,randomUUID} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {dirname,join} from 'node:path';
export async function reportAudit(report,{key=process.env.MARKETT_OPERATIONS_EVENT_KEY,send=fetch,origin='https://markett-ca.vercel.app',now=Date.now,pause=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds))}={}){
 if(!key)throw Error('OPERATIONS_AUDIT_TRANSPORT_KEY_MISSING');
 const receipts=[],pending=[];let transportRetries=0;
 for(const site of report.sites){
  const success=site.http?.status===200&&!site.http?.error;
  const trigger={push:'github-push',schedule:'github-schedule',workflow_dispatch:'github-dispatch'}[process.env.GITHUB_EVENT_NAME];
  const body=JSON.stringify({eventId:randomUUID(),domain:site.domain,type:success?'task_completed':'task_blocked',status:success?'verified':'blocked',taskKey:'homepage-http-check',issueCode:success?'none':'verification',observedAt:site.checkedAt,httpStatus:site.http?.status??null,requestSucceeded:success,...(trigger?{trigger}:{})});
  // Retry only transient transport failures. The event body/ID stays unchanged so
  // an accepted write with a lost response reuses the backend's durable receipt.
  for(let attempt=1;attempt<=3;attempt++){
   const timestamp=String(now()),signature=createHmac('sha256',key).update(timestamp+'.'+body).digest('hex');
   let retryable=true;
   try{
    const response=await send(origin+'/api/operations-events',{method:'POST',headers:{'Content-Type':'application/json','x-markett-worker':'operations-audit','x-markett-timestamp':timestamp,'x-markett-signature':signature},body,signal:AbortSignal.timeout(15000)});
    if(!response.ok){retryable=response.status===429||(response.status>=500&&response.status<=599);throw Error('OPERATIONS_AUDIT_RECEIPT_HTTP_'+response.status);}
    const receipt=await response.json();
    if(receipt.durable!==true||!/^\d+$/.test(receipt.cursor??'')){retryable=false;throw Error('OPERATIONS_AUDIT_RECEIPT_NOT_DURABLE');}
    receipts.push({domain:site.domain,cursor:receipt.cursor});break;
   }catch(error){
    if(retryable&&attempt<3){transportRetries++;await pause(250*2**(attempt-1));continue;}
    pending.push({domain:site.domain,event:JSON.parse(body),reason:/^OPERATIONS_AUDIT_RECEIPT_[A-Z0-9_]+$/.test(error.message)?error.message:'OPERATIONS_AUDIT_TRANSPORT_FAILED',attempts:attempt,retryPending:true});break;
   }
  }
 }
 return {accepted:receipts.length,receipts,failed:pending.length,pending,transportRetries};
}
if(process.argv[1]?.endsWith('/report-audit.mjs')){
 const path=process.argv[2];if(!path)throw Error('Actual audit report path required');
 const result=await reportAudit(JSON.parse(await readFile(path,'utf8')));
 await writeFile(join(dirname(path),'operations-receipt-pending.json'),JSON.stringify({checkedAt:new Date().toISOString(),pending:result.pending,note:'Actual check report remains beside this file; no credential/signature persisted. Restore transport and replay original event IDs; never mark pending receipts accepted.'},null,2)+'\n');
 console.log(JSON.stringify({durableAuditEvents:result.accepted,pendingReceipts:result.failed,transportRetries:result.transportRetries,publicationClaimed:false}));
 if(result.failed)throw Error('OPERATIONS_AUDIT_RECEIPTS_PENDING: artifact retained; independent domains continued');
}
