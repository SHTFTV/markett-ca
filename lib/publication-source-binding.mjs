const sha=x=>typeof x==='string'&&/^[a-f0-9]{40}$/.test(x);
const path=x=>typeof x==='string'&&x.length>0&&!x.startsWith('/')&&!x.includes('..')&&!/[\s*?\\]/.test(x);
const within=(file,scope)=>scope.endsWith('/')?file.startsWith(scope):file===scope;
export function resolveSourceBinding(contract,evidence=[],{now=Date.now(),deploymentSourceCommit}={}){
 const c=contract??{},runtime=c.runtimeSourceCommit??c.sourceCommit,output=deploymentSourceCommit??c.deploymentSourceCommit??runtime;
 const fail=reason=>({status:'unproven',runtimeSourceCommit:runtime??null,deploymentSourceCommit:output??null,reason,transactionRef:null});
 if(!sha(runtime)||c.sourceCommit!==runtime||!sha(output))return fail('Explicit40-hex runtime/source alias and deployment source identity required');
 if(runtime===output)return {status:'same-commit',runtimeSourceCommit:runtime,deploymentSourceCommit:output,transactionRef:null};
 if(c.publicationMode!=='source-writing')return fail('Different output commit requires a declared source-writing publication transaction');
 const allowed=c.publicationWritePaths,protectedPaths=c.runtimeProtectedPaths;
 if(!Array.isArray(allowed)||!allowed.length||allowed.some(p=>!path(p))||!Array.isArray(protectedPaths)||!protectedPaths.length||protectedPaths.some(p=>!path(p)))return fail('Exact sourced publication-output allowlist and protected runtime/SOT paths required');
 const r=evidence.filter(e=>e.check==='publication-transaction'&&e.site===c.site&&e.repository===c.repository&&e.sourceCommit===runtime&&e.runtimeSourceCommit===runtime&&e.deploymentSourceCommit===output).sort((a,b)=>(Date.parse(b.observedAt)||Infinity)-(Date.parse(a.observedAt)||Infinity))[0];
 const age=now-Date.parse(r?.observedAt),base='https://github.com/'+c.repository;
 if(!r||r.status!=='passed'||r.environment!=='production'||r.synthetic!==false||!(age>=0&&age<=86400000)||r.compareBaseCommit!==runtime||r.compareHeadCommit!==output||r.compareRef!==base+'/compare/'+runtime+'...'+output||!r.proofRef||r.providerVerified!==true||r.ancestryVerified!==true)return fail('Fresh actual GitHub ancestry/compare and verified Vercel deployment transaction receipt required');
 if(!/^https:\/\/github\.com\/SHTFTV\/[^/]+\/actions\/runs\/\d+$/.test(r.workerRunRef??'')||!r.workerRunRef.startsWith(base+'/actions/runs/')||r.workerRunHeadSha!==runtime||r.vercelDeploymentGitSha!==output||!r.vercelDeploymentRef||!c.vercelProjectId||r.vercelProjectId!==c.vercelProjectId)return fail('Actual site worker run head must be runtime A and actual declared-project deployment Git SHA must be output B');
 if(!Array.isArray(r.changedPaths)||!r.changedPaths.length||r.changedPaths.some(p=>!path(p)||!allowed.some(a=>within(p,a))||protectedPaths.some(a=>within(p,a))||/^(?:\.github\/|package(?:-lock)?\.json$|pnpm-lock\.yaml$|yarn\.lock$|vercel\.json$)/.test(p)))return fail('Actual A→B changed paths include undeclared output or protected runtime/config/SOT changes');
 let sotPath=null;try{const u=new URL(c.sotRef),prefix='/'+c.repository+'/blob/'+runtime+'/';if(u.hostname==='github.com'&&u.pathname.startsWith(prefix))sotPath=u.pathname.slice(prefix.length);}catch{}
 if(!sotPath||r.changedPaths.includes(sotPath)||!/^[a-f0-9]{64}$/.test(r.loadedSotHash??'')||r.loadedSotHash!==r.approvedSotHashBeforeCommit||r.loadedSotHash!==r.approvedSotHashAfterCommit)return fail('Canonical SOT and actual loaded/approved policy hash must remain unchanged across the content transaction');
 return {status:'linked-content-transaction',runtimeSourceCommit:runtime,deploymentSourceCommit:output,transactionRef:r.proofRef,compareRef:r.compareRef,workerRunRef:r.workerRunRef,deploymentRef:r.vercelDeploymentRef,loadedSotHash:r.loadedSotHash,changedPaths:r.changedPaths};
}
