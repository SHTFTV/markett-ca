// Integration adapter for the EXISTING MarkEtt coordinator. No writer or timer.
// withLease must be the coordinator's durable, atomic lease implementation.
export async function recoverMiningPublisher({github, withLease, record, now = Date.now()}) {
  if (!github || !withLease || !record) throw new Error('Authenticated GitHub client, durable lease and event recorder required');
  return withLease('theminingminute.com:publisher-recovery', 600, async () => {
    const base = '/repos/SHTFTV/theminingminute.com/actions/workflows/mining-publisher.yml';
    const response = await github('GET', base + '/runs?branch=main&per_page=30');
    if (!Array.isArray(response.workflow_runs)) throw new Error('Unverified workflow run response');
    const runs = response.workflow_runs;
    const busy = runs.find(r => ['queued','in_progress','waiting','pending','requested'].includes(r.status));
    if (busy) {
      await record({site:'theminingminute.com',kind:'recovery-observation',status:'worker-active',runUrl:busy.html_url});
      return {status:'worker-active',runUrl:busy.html_url};
    }
    const last = runs.filter(r => r.status === 'completed').sort((a,b) => Date.parse(b.created_at)-Date.parse(a.created_at))[0];
    const age = last ? now-Date.parse(last.created_at) : Infinity;
    if (Number.isNaN(age) || age < 0) throw new Error('Unverified workflow timestamp');
    if (age <= 20*60*1000) return {status:'recent-worker-cycle',runUrl:last.html_url};
    await record({site:'theminingminute.com',kind:'publisher-stalled',status:'red',lastRunUrl:last?.html_url??null,requiredAction:'Recover existing workflow; retain alert until a new completed healthy cycle is verified'});
    const dispatch = await github('POST',base+'/dispatches',{ref:'main',inputs:{retest_api_after_funding:false}});
    if (dispatch.status !== 204) throw new Error('Workflow dispatch not accepted');
    // Accepted dispatch is NOT execution, publication or recovery proof.
    await record({site:'theminingminute.com',kind:'publisher-recovery-requested',status:'pending-verification',trigger:'workflow_dispatch',automaticRecovery:true});
    return {status:'pending-verification',trigger:'workflow_dispatch',automaticRecovery:true};
  });
}
