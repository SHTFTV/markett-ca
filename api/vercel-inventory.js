import snapshot from '../vercel-provider-inventory.json' with {type:'json'};
import {inventoryView,readProviderProjects,productionSites} from '../lib/vercel-inventory.mjs';
import {requestPage} from '../lib/operations-site-audit.mjs';
let cache;
async function checkRoutes(current){
 const sites=productionSites(current),checks=[];let cursor=0;
 async function worker(){while(cursor<sites.length){const site=sites[cursor++],checkedAt=new Date().toISOString();try{let url=new URL('https://'+site.productionHosts[0]),response;for(let hop=0;hop<5;hop++){response=await requestPage(url);if(response.status>=300&&response.status<400&&response.location){const next=new URL(response.location,url);if(next.protocol!=='https:'||next.hostname.replace(/^www\./,'')!==site.domain)break;url=next;continue;}break;}checks.push({domain:site.domain,checkedAt,httpStatus:response.status,vercelRouteVerified:response.vercelEdge===true,netlifyRouteObserved:response.netlifyEdge===true,finalUrl:url.href});}catch{checks.push({domain:site.domain,checkedAt,httpStatus:null,vercelRouteVerified:false,error:'Public HTTPS routing check failed; inspect DNS/TLS/response.'});}}}
 await Promise.all(Array.from({length:6},worker));return checks;
}
export async function getInventory(){
 const now=Date.now(),token=process.env.MARKETT_VERCEL_READ_TOKEN??process.env.VERCEL_API_TOKEN??process.env.VERCEL_TOKEN;
 if(!token)return {...inventoryView(snapshot,{now}),routeChecks:snapshot.routeChecks??[]};
 if(!cache||now-cache.at>900000){cache={at:now,promise:readProviderProjects({token,teamId:'team_kTW4N3LZceZMmT95CWJpgwhM'}).then(async current=>({...inventoryView(current,{refreshStatus:'provider-refreshed'}),routeChecks:await checkRoutes(current)})).catch(()=>({...inventoryView(snapshot,{refreshStatus:'provider-unavailable'}),routeChecks:snapshot.routeChecks??[]}))};}
 return cache.promise;
}
export default {async fetch(request){if(request.method!=='GET')return new Response('Method not allowed',{status:405});return Response.json(await getInventory(),{headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}};
