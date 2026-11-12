import {createHmac} from 'node:crypto';
export function deliveryConfiguration(env){
 if(!env.MARKETT_ALERT_WEBHOOK_URL||!env.MARKETT_ALERT_WEBHOOK_TOKEN||!env.MARKETT_ALERT_DESTINATION)return null;
 const u=new URL(env.MARKETT_ALERT_WEBHOOK_URL);if(u.protocol!=='https:'||u.username||u.password||u.port||u.hostname==='localhost'||/^[\d.]+$/.test(u.hostname)||env.MARKETT_ALERT_WEBHOOK_TOKEN.length<32)throw Error('INVALID_ALERT_DELIVERY_CONFIGURATION');
 return {url:u.href,token:env.MARKETT_ALERT_WEBHOOK_TOKEN,destination:env.MARKETT_ALERT_DESTINATION};
}
export async function deliverNotification(notification,{env=process.env,send=fetch}={}){
 let config;try{config=deliveryConfiguration(env);}catch{return {status:'blocked',stage:'channel-unconfigured',errorCode:'INVALID_ALERT_DELIVERY_CONFIGURATION'};}
 if(!config)return {status:'blocked',stage:'channel-unconfigured',errorCode:'INDEPENDENT_OWNER_DELIVERY_NOT_CONFIGURED'};
 const body=JSON.stringify({...notification,destination:config.destination}),signature=createHmac('sha256',config.token).update(body).digest('hex');
 try{
  const r=await send(config.url,{method:'POST',headers:{'Content-Type':'application/json','x-markett-alert-signature':signature,'idempotency-key':notification.id},body,redirect:'error',signal:AbortSignal.timeout(15000)});
  const result=await r.json().catch(()=>null);
  // Queue acceptance, HTTP200 alone and desktop settings cannot establish owner delivery.
  const opaque=v=>typeof v==='string'&&/^[A-Za-z0-9:_-]{1,160}$/.test(v);
  if(r.ok&&r.status===202&&result?.queued===true)return {status:'pending',stage:'queued',providerReceiptRef:opaque(result.queueId)?result.queueId:null,errorCode:'OWNER_DELIVERY_NOT_YET_VERIFIED'};
  if(r.ok&&result?.accepted===true&&result?.delivered!==true)return {status:'pending',stage:'provider-accepted',providerReceiptRef:opaque(result.providerReceiptId)?result.providerReceiptId:null,errorCode:'OWNER_DELIVERY_NOT_YET_VERIFIED'};
  if(!r.ok||r.status===202||result?.delivered!==true||!opaque(result.deliveryId))return {status:'blocked',errorCode:'OWNER_DELIVERY_RECEIPT_UNVERIFIED'};
  return {status:'delivered',stage:result.acknowledged===true&&opaque(result.acknowledgementId)?'acknowledged':'owner-delivered',deliveryRef:result.deliveryId,acknowledgementRef:result.acknowledged===true&&opaque(result.acknowledgementId)?result.acknowledgementId:null};
 }catch{return {status:'blocked',errorCode:'OWNER_DELIVERY_TRANSPORT_FAILED'};}
}
