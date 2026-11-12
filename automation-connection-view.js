const fresh=(at,now,ttl=1200000)=>Number.isFinite(Date.parse(at))&&now-Date.parse(at)>=-300000&&now-Date.parse(at)<=ttl;
export function automationConnection(row,now=Date.now()){
 const q=row?.fourRolesQueue,roles=row?.fourRoles?.roles??[],delivery=q?.ownerDelivery;
 const systemIssues=(row?.issues??[]).filter(i=>!/(?:item-hold|publication-hold|source-images|image-qa)/.test(i.cause??''));
 const missing=[];
 for(const id of ['worker','visual-checker','supervisor','independent-watchdog']){const r=roles.find(x=>x.role===id);if(!r?.ok||!fresh(r.at,now)||!fresh(r.sourceCheckAt,now))missing.push({reason:r?.detail??id+' has no accepted fresh receipt',owner:'Existing '+id+' owner',action:r?.next??'Verify the existing role against the current canonical SOT and actual runtime',at:r?.at??null});}
 if(!row?.fourRoles?.approved||!q?.source?.sotPath||!row?.fourRoles?.coordinatorFresh)missing.push({reason:'Shared canonical SOT acceptance is missing or stale',owner:'Existing Four Roles owner',action:'Reconcile all four accepted role receipts against the same current canonical SOT',at:q?.lastCheckAt??null});
 if(!row?.operationally_complete||!row?.fourRoles?.hostingVerified||!fresh(row?.completion?.checkedAt,now))missing.push({reason:'Required production dependencies and service connections are not all verified',owner:'Existing site implementation owner',action:'Verify actual required connections and retain matching production receipts',at:row?.completion?.checkedAt??null});
 if(!delivery?.ownerReadVerified||delivery?.incidentDeliveryVerified!==true||delivery?.recoveryDeliveryVerified!==true||!fresh(delivery.observedAt,now))missing.push({reason:'Bot → coordinator → human incident and recovery delivery is not verified',owner:'Existing alert delivery owner',action:'Verify actual incident and recovery delivery; chat acceptance is separate from direct human acknowledgement',at:delivery?.observedAt??null});
 for(const i of systemIssues)missing.push({reason:i.title,owner:i.owner??'Existing site operating owner',action:i.nextAction??'Inspect this exact fault and verify matching recovery',at:i.checkedAt??null});
 return {green:missing.length===0,checkedAt:new Date(now).toISOString(),faults:missing,itemHolds:(row?.issues??[]).filter(i=>!systemIssues.includes(i)),lastPublication:row?.lastPublication??null,freshness:row?.contentFreshness??null};
}
const time=v=>v&&Number.isFinite(Date.parse(v))?new Date(v).toLocaleString('en-US',{timeZone:'America/Los_Angeles'})+' Pacific':'unknown';
const node=(tag,value,p)=>{const n=document.createElement(tag);n.textContent=value;p.append(n);return n;};
export function connectionButton(parent,row){
 const state=automationConnection(row),wrap=node('div','',parent),button=node('button',(state.green?'● Fully connected for automation':'● Automation needs attention')+' · inspect',wrap);button.style.cssText='display:block;margin:12px 0;padding:12px;font-size:16px;border:2px solid '+(state.green?'#8fe3ae':'#ff939b')+';color:'+(state.green?'#8fe3ae':'#ff939b');button.type='button';button.setAttribute('aria-expanded','false');
 const body=node('div','',wrap);body.hidden=true;button.onclick=()=>{body.hidden=!body.hidden;button.setAttribute('aria-expanded',String(!body.hidden));};
 node('p','Connection evaluated '+time(state.checkedAt)+'. Receipt freshness cap:20 minutes. Green requires all four roles, canonical SOT, dependencies and actual alert delivery.',body);
 node('p','Last publication: '+time(state.lastPublication?.publishedAt),body);
 if(state.freshness?.attention)node('p','Over two hours / unknown: '+state.freshness.reason+' · reason evidence '+time(state.freshness.reasonEvidenceAt)+' · last successful worker run '+time(state.freshness.lastSuccessfulRunAt),body);
 for(const f of state.faults){node('strong',f.reason,body);node('p','Owner: '+f.owner+' · evidence '+time(f.at)+' · Action: '+f.action,body);}
 node('p',state.itemHolds.length+' separate editorial/image item holds; these do not alone establish a system-wide outage.',body);
 return wrap;
}
async function miningConnections(){const anchor=document.getElementById('priority-fifteen');if(!anchor)return;let host=document.getElementById('mining-automation-connections');if(!host){host=document.createElement('section');host.id='mining-automation-connections';anchor.after(host);}try{const r=await fetch('/api/command-center-status',{cache:'no-store'});if(!r.ok)throw Error();const d=await r.json();host.replaceChildren();node('h2','Mining sites · automation connections',host);for(const domain of ['theminingminute.com','minews.tv']){node('h3',domain,host);const row=[...(d.rows??[]),...(d.migrationBacklog??[])].find(x=>x.domain===domain);connectionButton(host,row);}}catch{host.replaceChildren();node('h2','Mining sites · automation connections',host);node('p','● RED · current connection evidence unavailable; no healthy state inferred.',host);}}
if(typeof document!=='undefined'){miningConnections();setInterval(miningConnections,60000);}
