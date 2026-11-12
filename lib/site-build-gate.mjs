import {resolveSourceBinding} from './publication-source-binding.mjs';
export const BUILD_STANDARD_VERSION=2;
const text=v=>typeof v==='string'&&v.trim().length>0;
function proof(contract,evidence,check,assertions,now){
 const own=evidence.filter(e=>e&&e.check===check&&e.site===contract.site&&e.repository===contract.repository&&e.sourceCommit===contract.sourceCommit).sort((a,b)=>(Date.parse(b.observedAt)||Infinity)-(Date.parse(a.observedAt)||Infinity));const e=own[0];
 if(!e)return {passed:false,reason:'Current matching actual production receipt missing',proofRef:null};
 if(e.synthetic!==false||e.environment!=='production'||e.status!=='passed'||!text(e.proofRef)||!text(e.observer))return {passed:false,reason:'Saved configuration, fixture or connector login is not a production test',proofRef:e.proofRef??null};
 const at=Date.parse(e.observedAt);if(!Number.isFinite(at)||now-at<0||now-at>86400000)return {passed:false,reason:'Production access/workflow evidence stale or invalid',proofRef:e.proofRef};
 const missing=assertions.filter(k=>e.assertions?.[k]!==true);return {passed:!missing.length,reason:missing.length?'Missing actual verified assertions: '+missing.join(', '):null,proofRef:e.proofRef};
}
export function evaluateBuildStages(contract,evidence=[],{now=Date.now()}={}){
 const c=contract??{},rows=[],missing=[];const fail=(id,reason)=>missing.push({id,reason});
 if(c.standardVersion!==2)fail('build-contract','Version2 staged build contract required');
 const source=proof(c,evidence,'source',['githubCanonical','vercelLinked','exactCommit'],now);const sourceReceipt=evidence.filter(e=>e?.check==='source'&&e.site===c.site&&e.repository===c.repository&&e.sourceCommit===c.sourceCommit).sort((a,b)=>(Date.parse(b.observedAt)||Infinity)-(Date.parse(a.observedAt)||Infinity))[0];source.sourceBinding=resolveSourceBinding(c,evidence,{now,deploymentSourceCommit:sourceReceipt?.deploymentSourceCommit});if(source.passed&&source.sourceBinding.status==='unproven'){source.passed=false;source.reason=source.sourceBinding.reason;}rows.push({id:'canonical-source-production',...source});if(!source.passed)fail('canonical-source-production',source.reason);
 const integrations=Array.isArray(c.requiredIntegrations)?c.requiredIntegrations:[];
 if(!integrations.length)fail('required-integrations','Explicit actual program integration inventory required; no vacuous access pass');
 const seen=new Set();for(const integration of integrations){
  if(!text(integration.id)||seen.has(integration.id)||!text(integration.description)||!text(integration.sourceRef)){fail('required-integrations','Every required integration needs unique identity, actual purpose and owning requirements source');continue;}seen.add(integration.id);
  const r=proof(c,evidence,'access:'+integration.id,['scopedAccess','productionFunctionalTest','actualExecution','resultVerified'],now);rows.push({id:'access:'+integration.id,...r});if(!r.passed)fail('access:'+integration.id,r.reason);
 }
 for(const flow of c.promisedFlows??[]){if(!Array.isArray(flow.requiredIntegrationIds)){fail('integration-coverage:'+flow.id,'Each actual promised flow must explicitly declare its required integration IDs');continue;}for(const id of flow.requiredIntegrationIds)if(!seen.has(id))fail('integration-coverage:'+flow.id,'Promised required integration omitted from access inventory: '+id);}
 const flow=c.minimalProductionFlow;
 if(!flow||!text(flow.id)||!text(flow.description)||!text(flow.sourceRef))fail('minimal-production-workflow','Explicit site-program minimal production workflow required');
 const minimal=proof(c,evidence,'minimal-production-workflow',['actualExecution','sourceToProduction','requiredAccessValidated','durableReceipt','resultVerified'],now);
 const receipt=evidence.filter(e=>e?.check==='minimal-production-workflow'&&e.site===c.site&&e.repository===c.repository&&e.sourceCommit===c.sourceCommit).sort((a,b)=>(Date.parse(b.observedAt)||Infinity)-(Date.parse(a.observedAt)||Infinity))[0];
 if(!receipt||receipt.flowId!==flow?.id)minimal.passed=false,minimal.reason='Minimal production receipt must bind this exact required flow';
 rows.push({id:'minimal-production-workflow',...minimal});if(!minimal.passed)fail('minimal-production-workflow',minimal.reason);
 return {version:2,stages:rows,blockers:missing,dependentBuildAllowed:missing.length===0,fullCompletionSeparate:true,order:['canonical-source-production','required-production-access','minimal-production-workflow','substantial-dependent-build','full-operational-verification']};
}
export function authorizeBuildWork(contract,evidence,workId,options={}){
 const gate=evaluateBuildStages(contract,evidence,options),work=contract?.workUnits?.find(w=>w.id===workId);
 if(!work||!text(work.sourceRef)||!text(work.description)||!['independent','source-setup','access-setup','minimal-production-test','dependent-build'].includes(work.kind))return {allowed:false,reason:'Explicitly sourced work unit and dependency class required',gate};
 if(['independent','source-setup'].includes(work.kind))return {allowed:true,scope:'Independent work only; no dependent build, activation, new access or purchase inferred',gate};
 if(work.kind==='access-setup')return {allowed:gate.stages.find(s=>s.id==='canonical-source-production')?.passed===true,scope:'Only scoped required access setup/test after verified source-production link; no dependent content build',gate};
 if(work.kind==='minimal-production-test')return {allowed:!gate.blockers.some(b=>b.id!=='minimal-production-workflow'),scope:'Only the declared minimal real production workflow; no substantial dependent build',gate};
 return {allowed:gate.dependentBuildAllowed,scope:'Dependent build only after all prior production prerequisites pass',gate};
}
