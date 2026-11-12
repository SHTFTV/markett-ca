export function freshness(snapshot,now=Date.now()){
 const age=now-Date.parse(snapshot?.checkedAt);return Number.isFinite(age)&&age>=0&&age<=86400000?'fresh':'stale';
}
export function inventoryView(snapshot,{now=Date.now(),refreshStatus='blocked-no-runtime-read-credential',lastAttemptAt=new Date(now).toISOString()}={}){
 const seen=new Map((snapshot?.projects??[]).map(p=>[p.id,p])),projects=[...seen.values()];
 return {schemaVersion:1,checkedAt:snapshot?.checkedAt??null,assembledAt:new Date(now).toISOString(),source:snapshot?.source??'unknown',freshness:freshness(snapshot,now),lastVerifiedProjectCount:snapshot?.checkedAt&&Array.isArray(snapshot.projects)?seen.size:null,currentProviderCountVerified:refreshStatus==='provider-refreshed',refresh:{status:refreshStatus,lastAttemptAt,intervalMinutes:15,credentialConfigured:refreshStatus!=='blocked-no-runtime-read-credential',nextAction:refreshStatus==='blocked-no-runtime-read-credential'?'Configure an approved server-only Vercel read credential; connected chat access is not server runtime access.':refreshStatus==='provider-unavailable'?'Inspect provider read access and retry; last verified snapshot remains dated.':'Retain provider pagination and check timestamps.'},pagination:snapshot?.pagination??null,projects};
}
export async function readProviderProjects({token,teamId,fetcher=fetch}){
 const projects=new Map();let from=null;const cursors=new Set(),pageCounts=[];
 for(let page=0;page<20;page++){
  const url=new URL('https://api.vercel.com/v9/projects');url.searchParams.set('teamId',teamId);url.searchParams.set('limit','100');if(from)url.searchParams.set('from',String(from));
  const r=await fetcher(url,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('provider-unavailable');const data=await r.json();if(!Array.isArray(data.projects))throw Error('provider-unavailable');pageCounts.push(data.projects.length);
  for(const p of data.projects){if(typeof p.id!=='string'||typeof p.name!=='string')continue;projects.set(p.id,{id:p.id,name:p.name,updatedAt:p.updatedAt??null});}
  from=data.pagination?.next;if(!from)return {checkedAt:new Date().toISOString(),source:'Vercel read-only runtime API',pagination:{pageCounts,returnedEntries:pageCounts.reduce((a,b)=>a+b,0),duplicates:pageCounts.reduce((a,b)=>a+b,0)-projects.size,exhausted:true},projects:[...projects.values()]};
  if(cursors.has(from))throw Error('provider-unavailable');cursors.add(from);
 }throw Error('provider-unavailable');
}
export function mergeProjectDetails(current,snapshot){
 const old=new Map((snapshot.projects??[]).map(p=>[p.id,p]));return {...current,projects:current.projects.map(p=>{const detail=old.get(p.id);return {...detail,...p,domains:detail?.domains??[],repository:detail?.repository??null,latestDeployment:detail?.latestDeployment??null,mappingCheckedAt:snapshot.checkedAt,mappingStatus:detail?'dated-provider-details':'unknown — new project details not yet recovered'};})};
}
