import {createHmac} from 'node:crypto';import {readFile,writeFile,mkdir} from 'node:fs/promises';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';import {project} from '../../lib/operations-events.mjs';
const EVENT_ID='784ab687-a022-47ec-b082-347fa4e7c4a8';
export async function replayIrrigation(event,{key=process.env.MARKETT_OPERATIONS_EVENT_KEY,send=fetch,now=Date.now()}={}){
 if(event?.eventId!==EVENT_ID||event.domain!=='irrigation.ltd'||event.taskKey!=='homepage-http-check')throw Error('RETAINED_EVENT_IDENTITY_MISMATCH');
 project(event,{id:'operations-audit',domains:['irrigation.ltd'],types:['task_completed','task_blocked']},now);
 const pending=reason=>({durable:false,event,reason,retryPending:true});
 if(typeof key!=='string'||key.length<32)return pending('AUDIT_KEY_NOT_CONFIGURED');
 const raw=JSON.stringify(event),timestamp=String(now),signature=createHmac('sha256',key).update(timestamp+'.'+raw).digest('hex');
 try{
  const r=await send('https://markett-ca.vercel.app/api/operations-events',{method:'POST',headers:{'Content-Type':'application/json','x-markett-worker':'operations-audit','x-markett-timestamp':timestamp,'x-markett-signature':signature},body:raw,signal:AbortSignal.timeout(15000)});
  const data=await r.json().catch(()=>null);
  if(!r.ok)return pending('HTTP_'+r.status+(data&&['SCOPE_DENIED','UNKNOWN_CANONICAL_SITE','UNAUTHORIZED','IDEMPOTENCY_CONFLICT'].includes(data.error)?'_'+data.error:''));
  if(data?.durable!==true||!/^\d+$/.test(data.cursor??''))return pending('RECEIPT_NOT_DURABLE');
  return {durable:true,eventId:EVENT_ID,cursor:data.cursor,replayedOriginalEvent:true};
 }catch{return pending('AUDIT_REPLAY_TRANSPORT_FAILED');}
}
export async function main(args=process.argv.slice(2)){
 const [input,output]=args;if(!input||!output)throw Error('Retained event file and output directory required');const event=JSON.parse(await readFile(input,'utf8'));
 const result=await replayIrrigation(event);await mkdir(output,{recursive:true});await writeFile(resolve(output,'irrigation-replay-receipt.json'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({durable:result.durable,eventId:event.eventId,reason:result.reason??null,cursor:result.cursor??null}));if(!result.durable)process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await main();
