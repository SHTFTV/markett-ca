// Additive scoped actor. Never inspect, copy, or replace existing actors' secrets.
export function workerScopes(env){
 const keys=JSON.parse(env.MARKETT_EVENT_WORKER_KEYS);
 if(!keys||typeof keys!=='object'||Array.isArray(keys))throw Error('INVALID_WORKER_SCOPES');
 if(env.MARKETT_NATUROPATHS_EVENT_KEY!==undefined){
  const secret=env.MARKETT_NATUROPATHS_EVENT_KEY;
  if(typeof secret!=='string'||secret.length<32||secret.trim()!==secret)throw Error('INVALID_NATUROPATHS_EVENT_KEY');
  if(Object.hasOwn(keys,'naturopaths-site-bot'))throw Error('DUPLICATE_WORKER_ACTOR');
  keys['naturopaths-site-bot']={secret,domains:['naturopaths.io'],types:['task_completed','task_blocked','heartbeat']};
 }
 return keys;
}
