import {reconcileMonitor} from '../lib/operations-monitor-runtime.mjs';import {collect} from './cloud-execution-status.js';import {completionRecords} from './completion-records.js';
import wizardObservation from '../gsc-wizard-observation.json' with {type:'json'};
import snapshot from '../vercel-provider-inventory.json' with {type:'json'};
import {randomUUID,timingSafeEqual} from 'node:crypto';
import {inventoryView,readProviderProjects,productionSites} from '../lib/vercel-inventory.mjs';
import {requestPage} from '../lib/operations-site-audit.mjs';
import {retainPublications} from '../lib/publication-receipt-store.mjs';
import {activity} from './publication-activity.js';
import {readInventoryStore,openInventoryStore,appendInventoryRun} from '../lib/inventory-refresh-store.mjs';
let readCache;
async function checkRoutes(current){
 const sites=productionSites(current),checks=[];let cursor=0;
 async function worker(){while(cursor<sites.length){const site=sites[cursor++],checkedAt=new Date().toISOString();try{let url=new URL('https://'+site.productionHosts[0]),response;for(let hop=0;hop<5;hop++){response=await requestPage(url);if(response.status>=300&&response.status<400&&response.location){const next=new URL(response.location,url);if(next.protocol!=='https:'||next.hostname.replace(/^www\./,'')!==site.domain)break;url=next;continue;}break;}checks.push({domain:site.domain,checkedAt,httpStatus:response.status,vercelRouteVerified:response.vercelEdge===true,netlifyRouteObserved:response.netlifyEdge===true,finalUrl:url.href});}catch{checks.push({domain:site.domain,checkedAt,httpStatus:null,vercelRouteVerified:false,error:'Public HTTPS routing check failed; inspect DNS/TLS/response.'});}}}
 await Promise.all(Array.from({length:6},worker));return checks;
}
const token=()=>process.env.MARKETT_VERCEL_READ_TOKEN??process.env.VERCEL_API_TOKEN??process.env.VERCEL_TOKEN;
export function cronAuthorized(request){const expected=process.env.CRON_SECRET&&'Bearer '+process.env.CRON_SECRET,actual=request.headers.get('authorization');return typeof expected==='string'&&typeof actual==='string'&&Buffer.byteLength(expected)===Buffer.byteLength(actual)&&timingSafeEqual(Buffer.from(expected),Buffer.from(actual));}
export async function getInventory(){
 const now=Date.now();if(!readCache||now-readCache.at>20000)readCache={at:now,promise:readInventoryStore()};const stored=await readCache.promise;
 const current=stored.successful?.public_snapshot??snapshot;
 const refreshStatus=!token()?'blocked-no-runtime-read-credential':stored.latest?.status??'configured-awaiting-first-execution';
 const result=inventoryView(current,{now,refreshStatus,lastAttemptAt:stored.latest?.completed_at??null});
 result.routeChecks=current.routeChecks??[];result.refresh.durableStorageConnected=stored.connected;result.refresh.durableRefreshVerified=!!stored.successful;result.refresh.lastSuccessfulAt=stored.successful?.completed_at??null;
 result.refresh.lastReceipt=stored.latest?{id:stored.latest.id,acceptedAt:stored.latest.completed_at,status:stored.latest.status,trigger:stored.latest.trigger_kind,durable:true}:null;
 result.refresh.nativeExecutionVerified=false;
 if(!stored.connected){result.refresh.storageStatus='unavailable';result.refresh.nextAction+=' Restore the existing operations-store connection; no successful durable refresh is inferred.';}
 return result;
}
async function refreshInventory(request){
 let db;const id=randomUUID(),startedAt=new Date().toISOString(),trigger=request.headers.get('user-agent')?.startsWith('vercel-cron/')?'authenticated-cron-request':'manual-verification';
 try{
  db=await openInventoryStore();const lock=await db.query("select pg_try_advisory_lock(hashtextextended('markett-inventory-refresh',0)) as acquired");if(!lock.rows[0]?.acquired)return Response.json({status:'existing-refresh-running'},{status:409});
  let publicationArchive;try{const observed=await activity(fetch,{includeArchive:false,limit:5000});publicationArchive=await retainPublications(db,observed.events);}catch{publicationArchive={durable:false,status:'publication-archive-write-failed'};}
  let notificationMonitor={status:'disabled'};if(process.env.MARKETT_DURABLE_MONITOR_ENABLED==='true'){try{notificationMonitor=await reconcileMonitor(db,{publicReceipts:await collect(),records:completionRecords});}catch{notificationMonitor={status:'monitor-reconciliation-failed',ownerDeliveryVerified:false};}}
  let status,publicSnapshot=null,summary;
  if(!token()){status='blocked-no-runtime-read-credential';summary={reason:'Production inventory API credential not configured; direct browser access is separate.'};}
  else try{
   const current=await readProviderProjects({token:token(),teamId:'team_kTW4N3LZceZMmT95CWJpgwhM'}),routes=await checkRoutes(current),safe=inventoryView(current,{refreshStatus:'provider-refreshed'});
   publicSnapshot={checkedAt:current.checkedAt,source:current.source,projectCount:safe.lastVerifiedProjectCount,projects:safe.projects,routeChecks:routes,pagination:current.pagination};status='provider-refreshed';summary={rawProjects:safe.lastVerifiedProjectCount,readyAttachedCanonicalSites:safe.canonicalProductionSiteCount,verifiedVercelRoutes:routes.filter(r=>r.httpStatus===200&&r.vercelRouteVerified).length,routeFailures:routes.filter(r=>r.httpStatus!==200).length};
  }catch{status='provider-unavailable';summary={reason:'Authenticated provider inventory read failed; prior complete snapshot retained. Inspect access/rate limits/provider response; not an approval wait.'};}
  const receipt=await appendInventoryRun(db,{id,startedAt,status,trigger,snapshot:publicSnapshot,summary:{...summary,publicationArchive,notificationMonitor,searchAccessAudit:{auditedAt:new Date().toISOString(),observationCheckedAt:wizardObservation.checkedAt,status:wizardObservation.status,stale:Date.now()-Date.parse(wizardObservation.checkedAt)>3600000,providerChecked:false,alertDelivered:false}}});readCache=null;return Response.json({status,receipt,summary,nativeExecutionVerified:false},{status:status==='provider-refreshed'?200:503,headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({status:'storage-unavailable',reason:'Refresh could not retain a durable receipt; no verified refresh claimed.'},{status:503});}finally{await db?.end?.();}
}
export default {async fetch(request){if(request.method!=='GET')return new Response('Method not allowed',{status:405});if(request.headers.has('authorization')){if(!cronAuthorized(request))return Response.json({error:'Unauthorized'},{status:401});return refreshInventory(request);}return Response.json(await getInventory(),{headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}};
