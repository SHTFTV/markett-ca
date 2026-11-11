export function mergeOperationalEvidence(overview,snapshot){
 const rows=overview.rows.map(row=>{
  const check=snapshot.website.find(x=>x.domain===row.domain),tasks=snapshot.tasks.filter(x=>x.domain===row.domain),publication=snapshot.publication.find(x=>x.domain===row.domain)??null;
  const next={...row,operationTasks:tasks,latestSignedPublicationReceipt:publication};
  if(check&&Date.parse(check.observedAt)>=(Date.parse(row.httpCheck?.at)||0)){
   next.baselineHttpCheck=row.httpCheck??null;
   next.httpCheck={at:check.observedAt,acceptedAt:check.acceptedAt,outcome:check.httpStatus===200?'checked':'unavailable',httpStatus:check.httpStatus,requestSucceeded:check.requestSucceeded,source:'durable-cloud-http-check',trigger:check.trigger??'unknown'};
   if(check.httpStatus!==200||check.requestSucceeded!==true){
    const redirect=check.httpStatus>=300&&check.httpStatus<400;
    const issue={cause:'website-cloud-check',title:'Latest cloud homepage check '+(check.httpStatus==null?'did not obtain a final HTTP status.':'recorded HTTP'+check.httpStatus+'.'),checkedAt:check.observedAt,
     nextAction:redirect?'Review the canonical domain and external redirect target; preserve routing until the destination is verified.':check.httpStatus==null?'Recheck DNS/TLS and the public origin from a second vantage; resolve the recorded cloud-check failure.':'Inspect the actual HTTP response and origin configuration; a failed check is not evidence that the site is unbuilt.',
     recovery:'Earlier dated baseline is retained separately. Cloud-check failure is an observation, not a claim of global downtime.'};
    next.issues=[...row.issues,issue];if(!row.issues.length)next.nextAction=issue.nextAction;if(row.status!=='excluded')next.status='red';
   }
  }
  return next;
 });
 const checked=rows.filter(x=>x.httpCheck?.at),cloud=rows.filter(x=>x.httpCheck?.source==='durable-cloud-http-check');
 const latest=cloud.map(x=>x.httpCheck.at).sort().at(-1)??null;
 return {...overview,rows,websiteAuditSnapshotAt:latest??overview.registrySnapshotAt,
  operationsConnection:{connected:snapshot.connected,readAt:snapshot.readAt,scope:'Durable task and HTTP-check events; publisher automatic execution is separate'},
  counts:{...overview.counts,websiteChecksAttempted:checked.length,cloudWebsiteChecks:cloud.length,httpResponding:rows.filter(r=>r.httpCheck?.httpStatus===200).length,needsAttention:rows.filter(r=>r.status==='red').length},
  websiteAudit:{checkedAt:latest,cloudChecks:cloud.length,definition:'Most recent dated homepage status per canonical domain. A cloud vantage failure is not a global outage. HTTP200 includes holding pages and does not certify forms, apps, publishing, pSEO or indexing.'}};
}
