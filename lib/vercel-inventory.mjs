export function freshness(snapshot,now=Date.now()){
 const age=now-Date.parse(snapshot?.checkedAt);return Number.isFinite(age)&&age>=0&&age<=1800000?'fresh':'stale';
}
const custom=d=>typeof d?.name==='string'&&!d.name.endsWith('.vercel.app');
export function productionSites(snapshot){
 const sites=new Map();
 for(const p of snapshot?.projects??[]){
  if(p.latestDeployment?.readyState!=='READY'||p.latestDeployment?.target!=='production')continue;
  for(const d of p.domainBindings??[]){if(!custom(d)||d.redirect||d.gitBranch||d.verified!==true)continue;const domain=d.apexName??d.name.replace(/^www\./,'');
   const row=sites.get(domain)??{domain,productionHosts:[],projectIds:[],projectNames:[],mappingCheckedAt:p.mappingCheckedAt??snapshot.checkedAt};
   if(!row.productionHosts.includes(d.name))row.productionHosts.push(d.name);if(!row.projectIds.includes(p.id)){row.projectIds.push(p.id);row.projectNames.push(p.name);}sites.set(domain,row);
  }
 }
 return [...sites.values()].sort((a,b)=>a.domain.localeCompare(b.domain));
}
export function inventoryView(snapshot,{now=Date.now(),refreshStatus='blocked-no-runtime-read-credential',lastAttemptAt=new Date(now).toISOString()}={}){
 const projects=[...new Map((snapshot?.projects??[]).map(p=>[p.id,p])).values()],sites=productionSites({...snapshot,projects});
 return {schemaVersion:2,checkedAt:snapshot?.checkedAt??null,assembledAt:new Date(now).toISOString(),source:snapshot?.source??'unknown',freshness:freshness(snapshot,now),lastVerifiedProjectCount:snapshot?.checkedAt?(snapshot.projectCount??projects.length):null,currentProviderCountVerified:refreshStatus==='provider-refreshed'&&freshness(snapshot,now)==='fresh',canonicalProductionSiteCount:sites.length,productionSites:sites,definition:'Unique canonical custom-domain sites with verified production bindings and READY production deployment evidence; redirect-only aliases and preview-only projects excluded. Public routing checked separately.',refresh:{status:refreshStatus,lastAttemptAt,intervalMinutes:15,credentialConfigured:refreshStatus!=='blocked-no-runtime-read-credential',nativeExecutionVerified:false,durableRefreshVerified:false,nextAction:refreshStatus==='blocked-no-runtime-read-credential'?'Install an explicitly approved server-only Vercel API credential. Direct signed-in browser access works but is not unattended authentication. Team personal tokens grant read/write access; no read-only scope is implied.':refreshStatus==='provider-unavailable'?'Inspect provider access and retry. Retained snapshot remains dated; API failure is not provider approval waiting.':'Live provider read completed. Verify a native cron invocation, durable receipt and independent alert delivery separately.'},pagination:snapshot?.pagination??null,projects:projects.filter(p=>p.domainBindings?.length).map(p=>({id:p.name,name:p.name,domains:p.domains,domainBindings:p.domainBindings,repository:p.repository??null,latestDeployment:p.latestDeployment?{readyState:p.latestDeployment.readyState,target:p.latestDeployment.target}:null,mappingCheckedAt:p.mappingCheckedAt}))};
}
async function get(fetcher,url,token){const r=await fetcher(url,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('provider-unavailable');return r.json();}
export async function readProviderProjects({token,teamId,fetcher=fetch}){
 const projects=new Map();let from=null;const cursors=new Set(),pageCounts=[];
 for(let page=0;page<20;page++){
  const url=new URL('https://api.vercel.com/v9/projects');url.searchParams.set('teamId',teamId);url.searchParams.set('limit','100');if(from)url.searchParams.set('from',String(from));
  const data=await get(fetcher,url,token);if(!Array.isArray(data.projects))throw Error('provider-unavailable');pageCounts.push(data.projects.length);
  for(const p of data.projects){if(typeof p.id==='string'&&typeof p.name==='string')projects.set(p.id,{id:p.id,name:p.name,updatedAt:p.updatedAt??null,repository:p.link?.type==='github'&&p.link?.org&&p.link?.repo?'https://github.com/'+encodeURIComponent(p.link.org)+'/'+encodeURIComponent(p.link.repo):null});}
  from=data.pagination?.next;if(!from)break;if(cursors.has(from)||page===19)throw Error('provider-unavailable');cursors.add(from);
 }
 const rows=[...projects.values()];let cursor=0;
 async function worker(){while(cursor<rows.length){const p=rows[cursor++],bindings=[];let since=null;const seen=new Set();
  for(let page=0;page<20;page++){const u=new URL('https://api.vercel.com/v9/projects/'+encodeURIComponent(p.id)+'/domains');u.searchParams.set('teamId',teamId);u.searchParams.set('production','true');u.searchParams.set('limit','100');if(since)u.searchParams.set('until',String(since));const data=await get(fetcher,u,token);if(!Array.isArray(data.domains))throw Error('provider-unavailable');for(const d of data.domains)if(custom(d))bindings.push({name:d.name,apexName:d.apexName??d.name.replace(/^www\./,''),verified:d.verified===true,redirect:typeof d.redirect==='string'?d.redirect:null,gitBranch:d.gitBranch??null});since=data.pagination?.next;if(!since)break;if(seen.has(since)||page===19)throw Error('provider-unavailable');seen.add(since);}
  p.domainBindings=bindings;p.domains=bindings.map(d=>d.name);p.mappingCheckedAt=new Date().toISOString();p.mappingStatus='current-provider-domain-read';p.latestDeployment=null;
  if(bindings.length){const u=new URL('https://api.vercel.com/v6/deployments');for(const [k,v]of Object.entries({teamId,projectId:p.id,target:'production',state:'READY',limit:'1'}))u.searchParams.set(k,v);const data=await get(fetcher,u,token);if(!Array.isArray(data.deployments))throw Error('provider-unavailable');const d=data.deployments[0];if(d)p.latestDeployment={id:d.uid??d.id,readyState:d.readyState??d.state,target:d.target,createdAt:d.createdAt??d.created??null};}
 }}
 await Promise.all(Array.from({length:6},worker));
 return {checkedAt:new Date().toISOString(),source:'Authenticated Vercel API: complete project, production-domain and READY deployment reads',pagination:{pageCounts,returnedEntries:pageCounts.reduce((a,b)=>a+b,0),duplicates:pageCounts.reduce((a,b)=>a+b,0)-rows.length,exhausted:true},projects:rows};
}
// Current domain bindings are authoritative. Never graft older mappings onto a new project census.
export function mergeProjectDetails(current){return current;}
