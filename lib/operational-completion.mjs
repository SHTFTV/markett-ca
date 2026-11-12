import {resolveSourceBinding} from './publication-source-binding.mjs';
import {evaluateBuildStages} from './site-build-gate.mjs';
import {evaluatePageCoverage} from './page-quality-standard.mjs';
import {evaluateFourRoles} from './four-role-evidence.mjs';
// The only authority for whole-site completion. Publication/task success is a different scope.
export const STANDARD_VERSION = 2;
export const CHECKS = {
 source: ['githubCanonical','vercelLinked','exactCommit'],
 domain: ['productionHttps','redirects','canonical','sitemap'],
 editorial: ['branding','sources','contentRules','schema','imageRules'],
 desktop: ['rendered','home','article','cards','crops','readability'],
 phone: ['rendered','home','article','cards','crops','readability'],
 sot: ['durable','versioned','loadedEachJob','siteSpecific'],
 bot: ['dedicated','cloudDeployed','desktopIndependent','enabled'],
 connections: ['leastPrivilege','functionalTests'],
 unattended: ['successful','cloud','nativeSchedule'],
 state: ['durableQueue','receipts','idempotency','soleWriterLease'],
 recovery: ['retries','timeouts','watchdog','retainedFailures','recoveryTest','perItemIsolation','perFeedIsolation','sameRunHealthyProgress','boundedBackoff','noStarvation','durableFailureAlerts','globalOutageDistinguished'],
 alerts: ['independentChannel','failureInjected','delivered'],
 google: ['ownershipVerified','sitemapAccepted'],
 bing: ['ownershipVerified','sitemapAccepted'],
 ingestion: ['realSource','deduplication'],
 generation: ['sotApplied','factualVerification'],
 media: ['policyCompliant','actualImageQa'],
 publishing: ['singleWriter','published','liveVerified'],
 forms: ['submitted','storedPrivately','permissionsTested','receiptVerified'],
 indexing: ['officialInspection','requiredTargetMet'],
 launch: ['iamPublished','liveVerified']
};
export const CONDITIONAL = new Set(['ingestion','generation','media','publishing','forms','indexing','launch']);
const sha = v => typeof v==='string' && /^[a-f0-9]{40}$/.test(v);
const nonempty = v => typeof v==='string' && v.trim().length>0;
const ref = v => nonempty(v) && !/token=|password=|secret=|bearer\s/i.test(v);
export function evaluateCompletion(contract, evidence=[], {now=Date.now()}={}) {
 const blockers=[], matrix=[];let indexedPages=null;
 const fail=(id,reason)=>blockers.push({id,reason});
 if(!contract || contract.standardVersion!==STANDARD_VERSION)fail('contract','Missing or unsupported completion contract');
 const c=contract??{}, requirements=c.requirements??{};
 evidence=Array.isArray(evidence)?evidence.filter(e=>e&&typeof e==='object'):[];
 const flows=Array.isArray(c.promisedFlows)?c.promisedFlows.filter(f=>f&&typeof f==='object'):[];
 if(flows.length!==(c.promisedFlows?.length??0))fail('flows','Malformed promised flow');
 if(!nonempty(c.site)||!/^SHTFTV\/[\w.-]+$/.test(c.repository??'')||!sha(c.sourceCommit)||!ref(c.sotRef)||!c.sotRef.startsWith('https://github.com/'+c.repository+'/blob/'+c.sourceCommit+'/')||!ref(c.requirementsRef))fail('identity','Pinned site, repository, source commit, SOT and owner requirement references required');
 if(!Array.isArray(c.promisedFlows)||!c.promisedFlows.length)fail('flows','Explicit site-specific promised flows required');
 const flowChecks=new Set();
 for(const flow of flows){
  if(!nonempty(flow.id)||!nonempty(flow.description)||!ref(flow.sourceRef)||!Array.isArray(flow.checks)||!flow.checks.length)fail('flows','Every promised flow needs source and check coverage');
  for(const id of Array.isArray(flow.checks)?flow.checks:[]){flowChecks.add(id);if(!CHECKS[id])fail('flows','Unknown flow check '+id);if(requirements[id]?.applicable!==true)fail(id,'Promised flow cannot be excluded');}
 }
 for(const flow of flows){
  const proof=evidence.filter(e=>e.check==='flow:'+flow.id&&e.site===c.site&&e.repository===c.repository&&e.sourceCommit===c.sourceCommit).sort((a,b)=>(Date.parse(b.observedAt)||Infinity)-(Date.parse(a.observedAt)||Infinity))[0];
  if(!proof||proof.status!=='passed'||proof.synthetic!==false||proof.environment!=='production'||proof.assertions?.functional!==true||!ref(proof.proofRef)||!nonempty(proof.observer)||!Number.isFinite(Date.parse(proof.observedAt))||now-Date.parse(proof.observedAt)<0||now-Date.parse(proof.observedAt)>86400000)fail('flow:'+flow.id,'Dedicated current production functional receipt required for promised flow');
 }
 // Publishing promises carry the entire ingestion-to-live chain, not a convenient subset.
 if(flowChecks.has('publishing'))for(const id of ['ingestion','generation','media','publishing'])if(requirements[id]?.applicable!==true||!flowChecks.has(id))fail(id,'Publishing promise lacks full pipeline coverage');
 for(const [id,assertions] of Object.entries(CHECKS)){
  const r=requirements[id];let reason=null, receipt=null;
  if(!r||typeof r.applicable!=='boolean'||!ref(r.sourceRef))reason='Applicability and owning source required';
  else if(!r.applicable){if(!CONDITIONAL.has(id)||flowChecks.has(id)||!nonempty(r.reason))reason='Required check cannot be excluded without an explicit site-specific basis';}
  else if(!Number.isFinite(r.maxAgeHours)||r.maxAgeHours<=0||r.maxAgeHours>168)reason='Explicit freshness window of at most 168 hours required';
  else {
   const own=evidence.filter(e=>e.check===id&&e.site===c.site&&e.repository===c.repository&&e.sourceCommit===c.sourceCommit).sort((a,b)=>(Date.parse(b.observedAt)||Infinity)-(Date.parse(a.observedAt)||Infinity));
   receipt=own[0];
   if(!receipt)reason='No matching production receipt';
   else if(receipt.environment!=='production'||receipt.status!=='passed'||receipt.synthetic!==false||!ref(receipt.proofRef)||!nonempty(receipt.observer))reason='Actual attributable production proof required';
   else if(!Number.isFinite(Date.parse(receipt.observedAt))||now-Date.parse(receipt.observedAt)<0||now-Date.parse(receipt.observedAt)>r.maxAgeHours*3600000)reason='Receipt stale or invalid time';
   else if(assertions.some(k=>receipt.assertions?.[k]!==true))reason='Missing verified assertions: '+assertions.filter(k=>receipt.assertions?.[k]!==true).join(', ');
   else if(id==='sot'&&(!nonempty(receipt.approvedRevision)||receipt.loadedRevision!==receipt.approvedRevision||!/^([a-f0-9]{64})$/.test(receipt.approvedHash??'')||receipt.loadedHash!==receipt.approvedHash||receipt.sotSourceRef!==c.sotRef))reason='Latest approved canonical SOT revision/hash loading proof required';
   else if(id==='recovery'&&(!ref(receipt.isolationRunRef)||!ref(receipt.failureItemRef)||!ref(receipt.healthyItemRef)||!ref(receipt.retryRef)||!nonempty(receipt.failureRunId)||receipt.failureRunId!==receipt.healthyRunId))reason='Same-run failed/healthy item and bounded retry execution references required';
   else if(id==='unattended'&&(!['schedule','managed-scheduler'].includes(receipt.trigger)||!ref(receipt.runRef)))reason='Native unattended successful run proof required; manual, push and recovery do not qualify';
   else if(['desktop','phone'].includes(id)&&(!ref(receipt.renderRef)||!nonempty(receipt.viewport)))reason='Actual rendered artifact and viewport required';
   else if(id==='alerts'&&(!ref(receipt.deliveryRef)||!ref(receipt.failureRef)))reason='Independent failure and delivered notification receipts required';
   else if(id==='indexing'&&(!Number.isInteger(receipt.indexedPages)||receipt.indexedPages<0))reason='Unknown indexing cannot be converted to zero';
  }
  if(reason)fail(id,reason);
  if(id==='indexing'&&!reason&&r.applicable)indexedPages=receipt.indexedPages;
  matrix.push({id,applicable:r?.applicable??null,status:reason?'unproven':r.applicable?'passed':'not-applicable',reason,proofRef:receipt?.proofRef??null});
 }
 const buildGate=evaluateBuildStages(c,evidence,{now});for(const blocker of buildGate.blockers)fail('prebuild:'+blocker.id,blocker.reason);
 const latestArtifacts=new Map();for(const e of evidence.filter(e=>e.site===c.site&&e.repository===c.repository&&e.sourceCommit===c.sourceCommit&&(['source','domain','publishing','page-quality'].includes(e.check)||e.check?.startsWith('role:'))).sort((a,b)=>(Date.parse(b.observedAt)||Infinity)-(Date.parse(a.observedAt)||Infinity))){const key=e.check+':'+(e.pageUrl??'');if(!latestArtifacts.has(key))latestArtifacts.set(key,e);}const outputs=[...new Set([c.deploymentSourceCommit,...[...latestArtifacts.values()].map(e=>e.deploymentSourceCommit)].filter(Boolean))];const sourceBindings=(outputs.length?outputs:[c.sourceCommit]).map(deploymentSourceCommit=>resolveSourceBinding(c,evidence,{now,deploymentSourceCommit}));for(const binding of sourceBindings)if(binding.status==='unproven')fail('source-transaction',binding.reason);
 const pageQuality=evaluatePageCoverage(c,evidence,{now}),fourRoles=evaluateFourRoles(c,evidence,{now});for(const b of [...pageQuality.blockers,...fourRoles.blockers])fail(b.id,b.reason);
 const passed=id=>matrix.some(x=>x.id===id&&x.status==='passed');
 return {buildGate,sourceBindings,pageQuality,fourRoles,standardVersion:STANDARD_VERSION,site:c.site??null,evaluatedAt:new Date(now).toISOString(),sourceCommit:c.sourceCommit??null,frontend_live:passed('domain')?true:null,deployed:passed('source')?true:null,configured:passed('connections')?true:null,enabled:passed('bot')?true:null,operationally_complete:blockers.length===0,status:blockers.length?'incomplete':'done',indexing:{indexedPages},matrix,blockers};
}
