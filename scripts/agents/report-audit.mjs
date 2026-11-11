import {createHmac,randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
export async function reportAudit(report,{key=process.env.MARKETT_OPERATIONS_EVENT_KEY,send=fetch,origin='https://markett-ca.vercel.app',now=Date.now}={}){
 if(!key)throw Error('OPERATIONS_AUDIT_TRANSPORT_KEY_MISSING');
 const receipts=[];
 for(const site of report.sites){
  const success=site.http?.status===200&&!site.http?.error;
  const body=JSON.stringify({eventId:randomUUID(),domain:site.domain,type:success?'task_completed':'task_blocked',status:success?'verified':'blocked',taskKey:'homepage-http-check',issueCode:success?'none':'verification',observedAt:site.checkedAt});
  const timestamp=String(now()),signature=createHmac('sha256',key).update(timestamp+'.'+body).digest('hex');
  const response=await send(origin+'/api/operations-events',{method:'POST',headers:{'Content-Type':'application/json','x-markett-worker':'operations-audit','x-markett-timestamp':timestamp,'x-markett-signature':signature},body,signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('OPERATIONS_AUDIT_RECEIPT_HTTP_'+response.status);
  const receipt=await response.json();if(receipt.durable!==true||!/^\d+$/.test(receipt.cursor??''))throw Error('OPERATIONS_AUDIT_RECEIPT_NOT_DURABLE');receipts.push({domain:site.domain,cursor:receipt.cursor});
 }
 return {accepted:receipts.length,receipts};
}
if(process.argv[1]?.endsWith('/report-audit.mjs')){
 const path=process.argv[2];if(!path)throw Error('Actual audit report path required');
 const result=await reportAudit(JSON.parse(await readFile(path,'utf8')));console.log(JSON.stringify({durableAuditEvents:result.accepted,publicationClaimed:false}));
}
