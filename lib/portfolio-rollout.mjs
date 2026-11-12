// Shared by API and browser: evaluate at read time, never trust a saved green bit.
export const ROLES=['worker','visual-checker','supervisor','independent-watchdog'];
export const LABELS=['Working / publishing bot','Visual checker','Supervisor','Independent watchdog / owner alerts'];
export const PRIORITY=['theminingminute.com','loveourlistings.com','weddings.io'];
export const TTL={worker:7200000,'visual-checker':86400000,supervisor:1800000,'independent-watchdog':1800000};
export const fresh=(at,ttl,now=Date.now())=>Number.isFinite(Date.parse(at))&&now>=Date.parse(at)&&now-Date.parse(at)<=ttl;
export function ordered(registry){return [...registry].sort((a,b)=>{const rank=d=>PRIORITY.includes(d)?PRIORITY.indexOf(d):-1;const x=rank(a.domain),y=rank(b.domain);return (x<0?999:x)-(y<0?999:y)||a.domain.localeCompare(b.domain);});}
export function syncQueue(registry,previous={},now=Date.now()){
 const old=new Map((previous.rows??[]).map(r=>[r.domain,r]));
 const rows=ordered(registry).map(site=>{const prior=old.get(site.domain);return {domain:site.domain,registryKind:site.registryKind,firstSeenAt:prior?.firstSeenAt??new Date(now).toISOString(),lastCheckAt:prior?.lastCheckAt??null,source:prior?.source??null,probe:prior?.probe??null,roles:ROLES.map(role=>{const task=prior?.roles?.find(r=>r.role===role);return task??{role,status:'pending',attempts:0,nextAttemptAt:new Date(now).toISOString(),lease:null,blocker:'No verified role adapter / actual execution receipt connected.'};})};});
 // Retain removed domains as retired; never erase their failures/history silently.
 const retired=[...(previous.retired??[]),...(previous.rows??[]).filter(r=>!registry.some(s=>s.domain===r.domain)).map(r=>({...r,retiredAt:new Date(now).toISOString(),retirementReason:'Absent from current canonical registry; retained for reconciliation, not silently dropped.'}))];
 return {...previous,schemaVersion:1,inventoryCount:rows.length,rows,retired};
}
export function claim(row,role,runId,now=Date.now()){
 const task=row.roles.find(t=>t.role===role);if(!task)return false;
 if(task.lease&&Date.parse(task.lease.expiresAt)>now)return false;
 if(Date.parse(task.nextAttemptAt)>now)return false;
 task.lease={runId,claimedAt:new Date(now).toISOString(),expiresAt:new Date(now+600000).toISOString()};task.status='running';return true;
}
export function finish(task,{runId,blocker=null,receipt=null},now=Date.now()){
 if(task.lease?.runId!==runId||Date.parse(task.lease.expiresAt)<now)throw Error('LEASE_LOST');
 task.attempts++;task.lastAttemptAt=new Date(now).toISOString();task.status=blocker?'blocked':'evidence-received';task.blocker=blocker;task.receipt=receipt;task.lease=null;
 // A retained blocker cools down rather than starving the remaining sites.
 task.nextAttemptAt=new Date(now+Math.min(6*3600000,60000*2**Math.min(task.attempts,9))).toISOString();
}
export function stamp(row,{now=Date.now(),coordinator=null,watchdog=null,ownerDelivery=null}={}){
 const result=ROLES.map((role,i)=>{const t=row?.roles?.find(t=>t.role===role),r=t?.receipt;const fail=reason=>({role,name:LABELS[i],ok:false,at:r?.observedAt??t?.lastAttemptAt??null,detail:reason,next:reason,url:r?.proofRef??null,expiresAt:null});
  if(t?.status!=='evidence-received'||!r)return fail(t?.blocker??'Actual site-specific role execution receipt is missing.');
  if(r.site!==row.domain||r.status!=='passed'||r.environment!=='production'||r.synthetic!==false||!r.actorId||!r.runRef||!r.proofRef||!r.sourceCommit||r.sourceCommit!==row.source?.sourceCommit||r.repository!==row.source?.repository)return fail('Role receipt must match this site, its current source commit and actual production execution.');
  if(r.runtimeAttestation?.verified!==true||r.runtimeAttestation.sourceCommit!==r.sourceCommit||r.runtimeAttestation.runRef!==r.runRef)return fail('Actual provider run verification is missing or does not match source/run.');
  if(!fresh(r.observedAt,Math.min(TTL[role],r.ttlMs??TTL[role]),now))return fail('Role evidence expired or has an invalid/future timestamp; run the role again.');
  if(r.holds?.length||r.unresolvedFailures?.length||r.approvalHeld===true)return fail('Resolve the retained exact item/integration/approval blocker and verify recovery.');
  if(role==='worker'&&!(r.trigger==='schedule'&&r.unattendedRunVerified===true&&r.loadedRevision&&/^[a-f0-9]{64}$/.test(r.loadedHash??'')&&r.failureIsolationRef&&r.boundedRetryRef&&r.deduplicationRef&&r.writerLeaseRef&&r.liveResultRef))return fail('Verify native unattended execution, current SOT load, durable deduplication/lease, same-run failure isolation, bounded retry and live result.');
  if(role==='visual-checker'&&!(r.desktopRenderRef&&r.phoneRenderRef&&r.pageUrls?.length&&r.actualImagesCardsReadabilityChecked===true&&r.pageQualityPassed===true))return fail('Inspect actual live pages/images/cards at desktop and phone sizes; attach exact-page rendered quality results.');
  const worker=row.roles.find(t=>t.role==='worker')?.receipt,supervisor=row.roles.find(t=>t.role==='supervisor')?.receipt;
  if(role==='supervisor'&&!(r.checkedWorkerRunRef===worker?.runRef&&r.actualRunResultHeartbeatChecked===true&&r.failureDetectionRef))return fail('Supervisor must inspect the current worker run/result/heartbeat and prove failure detection.');
  if(role==='independent-watchdog'&&!(r.checkedSupervisorRunRef===supervisor?.runRef&&r.actorId!==supervisor?.actorId&&r.schedulerIdentity&&r.schedulerIdentity!==supervisor?.schedulerIdentity&&r.schedulerIdentity!==worker?.schedulerIdentity&&r.workerAndSupervisorSilentDetection===true&&r.failureInjectionRef&&r.recoveryRef&&r.ownerDeliveryRef&&ownerDelivery?.status==='delivered'&&ownerDelivery.deliveryRef===r.ownerDeliveryRef&&fresh(ownerDelivery.observedAt,TTL[role],now)))return fail('Independent watchdog must detect current supervisor silence, prove recovery and match a genuine delivered owner-alert receipt from the authorized central delivery integration.');
  return {role,name:LABELS[i],ok:true,at:r.observedAt,detail:'Actual production role evidence verified for '+r.sourceCommit,next:'Retain fresh execution and dependency evidence.',url:r.proofRef,expiresAt:new Date(Date.parse(r.observedAt)+Math.min(TTL[role],r.ttlMs??TTL[role])).toISOString()};});
 const chainFresh=coordinator?.trigger==='schedule'&&watchdog?.trigger==='schedule'&&fresh(coordinator?.completedAt,3600000,now)&&fresh(watchdog?.checkedAt,1800000,now)&&watchdog?.coordinatorRunId===coordinator?.runId&&watchdog?.status==='fresh';
 const hosting=row?.hosting;const hostingVerified=hosting?.provider==='vercel'&&hosting?.repository===row.source?.repository&&hosting?.sourceCommit===row.source?.sourceCommit&&hosting?.publicDomain===row.domain&&!!hosting?.projectId&&!!hosting?.deploymentRef&&hosting?.actualDomainVerified===true&&fresh(hosting?.checkedAt,86400000,now);
 const approved=result.every(r=>r.ok)&&chainFresh&&hostingVerified;
 return {approved,color:approved?'green':'red',roles:result,hostingVerified,hostingGap:hostingVerified?null:'Verify canonical GitHub source, exact Vercel production project/commit, live domain routing and preserved required flows; legacy migration remains incomplete until proven.',coordinatorFresh:chainFresh,expiresAt:approved?new Date(Math.min(...result.map(r=>Date.parse(r.expiresAt)),Date.parse(coordinator.completedAt)+3600000,Date.parse(watchdog.checkedAt)+1800000)).toISOString():null};
}

export function withRollout(overview,state,watchdog,ownerDelivery=null,now=Date.now()){const byDomain=new Map((state.rows??[]).map(r=>[r.domain,r]));return {...overview,fourRolesRollout:{coordinator:state.coordinator,watchdog,inventoryCount:state.inventoryCount,registryDigest:state.registryDigest,summary:state.summary,ownerDelivery},rows:overview.rows.map(row=>{const entry=byDomain.get(row.domain)??{domain:row.domain,roles:[]};return {...row,fourRolesQueue:entry,fourRoles:stamp(entry,{now,coordinator:state.coordinator,watchdog,ownerDelivery})};})};}
