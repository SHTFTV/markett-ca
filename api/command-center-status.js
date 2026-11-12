import {withProductionScope} from '../lib/production-scope.mjs';
import searchInventory from '../production-search-inventory.json' with {type:'json'};
import migrationReceipts from '../migration-receipts.json' with {type:'json'};
import {getInventory} from './vercel-inventory.js';
import rolloutState from '../portfolio-rollout-status.json' with {type:'json'};
import rolloutWatchdog from '../portfolio-rollout-watchdog.json' with {type:'json'};
import {withRollout} from '../lib/portfolio-rollout.mjs';
import {withBuildQueue} from '../lib/build-queue-reconciliation.mjs';
import hostingCounts from '../hosting-counts.json' with {type:'json'};
import {countDefinitions,withDomainMatrix} from '../lib/portfolio-count-definitions.mjs';
import {workerProgramReport} from '../lib/worker-program-report.mjs';
import {prerequisiteIssues} from '../lib/operations-monitor-runtime.mjs';
import {readMonitorEvidence} from '../lib/operations-monitor-read.mjs';
import {mergeMonitorOverview,assessWorkers,applyIncidentState} from '../lib/operations-monitor-model.mjs';
import {collect} from './cloud-execution-status.js';
import {withCompletion} from '../lib/completion-overview.mjs';
import {completionRecords} from './completion-records.js';
import {readOperationalEvidence,mergeOperationalEvidence} from '../lib/operations-overview-evidence.mjs';
import {registry,snapshotAt} from './registry-data.js';
import {portfolio} from './portfolio-data.js';import {portfolioSupport} from './portfolio-support-data.js';import {searchEvidence} from './search-evidence.js';import {metrics} from './portfolio-metrics.js';import {activity} from './publication-activity.js';import {commandOverview} from './command-center-model.js';
export default {async fetch(request){if(request.method!=='GET')return new Response('Method not allowed',{status:405});try{const [live,operational,monitor,receipts]=await Promise.all([activity(),readOperationalEvidence(),readMonitorEvidence(),collect()]);const extra=registry.filter(x=>!portfolio.rows.some(r=>r.domain===x.domain)).map(r=>({domain:r.domain,industry:null,http:null,sot:r.sotLinked?'partial':'missing',publication:{},schedule:{},social:{profiles:[]},workQueue:[]}));const view=metrics({...portfolio,rows:[...portfolio.rows,...extra]},live.events,searchEvidence,portfolioSupport);const current=assessWorkers({events:operational.workerEvents??[],publicReceipts:receipts,publicationEvents:live.events});current.issues.push(...prerequisiteIssues(completionRecords));monitor.incidents=applyIncidentState(monitor.incidents,{issues:current.issues,recoveries:[]});const finalView=withDomainMatrix(mergeMonitorOverview(withCompletion(mergeOperationalEvidence(commandOverview({registry,view,events:live.events,sources:live.sources,snapshotAt}),operational),completionRecords),monitor));finalView.countDefinitions=countDefinitions(registry,searchEvidence,hostingCounts);finalView.search.actualAccount=finalView.countDefinitions.search.actualAccount;finalView.search.ownershipVerified=finalView.search.actualAccount.counts.uniqueVerifiedDomains;for(const row of finalView.rows){if(finalView.search.actualAccount.verifiedDomains.includes(row.domain)){row.gsc={...(row.gsc??{}),propertyVerified:true,ownershipCheckedAt:finalView.search.actualAccount.checkedAt,ownershipSource:finalView.search.actualAccount.source};}}finalView.search.retainedOwnershipVerified=finalView.countDefinitions.search.retainedOwnershipVerified;finalView.search.sitemapSuccess=finalView.countDefinitions.search.retainedSitemapSuccess;finalView.workerPrograms=workerProgramReport(finalView,receipts);return Response.json(withProductionScope(withRollout(withDomainMatrix(withBuildQueue(finalView)),rolloutState,rolloutWatchdog,monitor.lastNotification),await getInventory(),searchInventory,{receipts:migrationReceipts.receipts,migrationCensus:migrationReceipts.providerCensus}),{headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}catch{return Response.json({error:'Current operations status unavailable; no active or completed work inferred.'},{status:503});}}};


