import {authenticate,accept,replay} from './events.mjs';
export function configuration(env){
 if(!env.MARKETT_EVENT_DATABASE_URL||!env.MARKETT_EVENT_WORKER_KEYS)throw Error('EVENT_BACKEND_NOT_CONFIGURED');
 const url=new URL(env.MARKETT_EVENT_DATABASE_URL);
 if(!['postgres:','postgresql:'].includes(url.protocol)||!url.hostname||url.searchParams.get('sslmode')==='disable')throw Error('INVALID_DATABASE_CONFIGURATION');
 const keys=JSON.parse(env.MARKETT_EVENT_WORKER_KEYS);
 if(!Object.keys(keys).length||Object.values(keys).some(k=>typeof k.secret!=='string'||k.secret.length<32||!Array.isArray(k.domains)||!Array.isArray(k.types)))throw Error('INVALID_WORKER_SCOPES');
 return {connectionString:env.MARKETT_EVENT_DATABASE_URL,keys,ssl:{rejectUnauthorized:true}};
}
export async function ingest(req,res,{connect,env=process.env,now=Date.now}={}){
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');
 if(req.method!=='POST'){res.statusCode=405;res.end(JSON.stringify({error:'METHOD_NOT_ALLOWED'}));return;}
 let db;
 try{
  const cfg=configuration(env);let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>16384)throw Error('EVENT_TOO_LARGE');}
  const actor=authenticate(raw,req.headers,cfg.keys,now());
  const event=JSON.parse(raw);db=await connect(cfg);const receipt=await accept(db,event,actor,now());
  res.statusCode=201;res.end(JSON.stringify(receipt));
 }catch(e){const known=['UNAUTHORIZED','SCOPE_DENIED','UNKNOWN_CANONICAL_SITE','IDEMPOTENCY_CONFLICT','INCOMPLETE_PUBLICATION_RECEIPT','EVENT_TOO_LARGE','INVALID_EVENT','INVALID_EVENT_TIME','INVALID_TASK','INVALID_ARTICLE_URL','INVALID_PUBLICATION_TIME'];
  res.statusCode=e.message==='UNAUTHORIZED'?401:e.message==='SCOPE_DENIED'?403:e.message==='IDEMPOTENCY_CONFLICT'?409:known.includes(e.message)?400:503;
  res.end(JSON.stringify({error:known.includes(e.message)?e.message:'EVENT_BACKEND_UNAVAILABLE',durable:false}));
 }finally{await db?.end?.();}
}
export async function stream(req,res,{connect,env=process.env,keepaliveMs=15000,lifetimeMs=240000}={}){
 res.setHeader('Cache-Control','no-store, no-transform');res.setHeader('Content-Type','text/event-stream');res.setHeader('X-Content-Type-Options','nosniff');
 let db,timer,expiry,closed=false,cursor=String(req.headers['last-event-id']??new URL(req.url,'https://markett.invalid').searchParams.get('after')??'0'),draining=false,again=false;
 const close=async()=>{if(closed)return;closed=true;clearInterval(timer);clearTimeout(expiry);await db?.end?.();res.end();};
 const send=(event,data,id)=>{if(!closed)res.write((id?'id: '+id+'\n':'')+'event: '+event+'\ndata: '+JSON.stringify(data)+'\n\n');};
 const drain=async()=>{if(draining){again=true;return;}draining=true;try{do{again=false;let rows;do{rows=await replay(db,cursor,200);for(const row of rows){send('operation',row,row.cursor);cursor=row.cursor;}}while(rows.length===200);}while(again);}catch{send('unavailable',{connected:false,reason:'EVENT_REPLAY_UNAVAILABLE'});await close();}finally{draining=false;}};
 try{
  const cfg=configuration(env);db=await connect(cfg);db.on('notification',()=>void drain());db.on('error',()=>{send('unavailable',{connected:false,reason:'DATABASE_DISCONNECTED'});void close();});
  // Dedicated direct/session connection; transaction-pool URLs cannot preserve LISTEN.
  await db.query('LISTEN markett_operations');
  res.on('close',()=>void close());await drain();if(closed)return;
  send('connection',{connected:true,replayCursor:cursor,at:new Date().toISOString(),scope:'Committed scoped-worker events only; existing publishers not connected until receipt integration proven'});
  timer=setInterval(()=>send('heartbeat',{connected:true,cursor,at:new Date().toISOString()}),keepaliveMs);
  expiry=setTimeout(()=>{send('reconnect',{after:cursor});void close();},lifetimeMs);
 }catch{res.statusCode=503;send('unavailable',{connected:false,reason:'EVENT_BACKEND_NOT_CONNECTED'});await close();}
}
