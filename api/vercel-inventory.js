import snapshot from '../vercel-provider-inventory.json' with {type:'json'};
import {inventoryView,readProviderProjects,mergeProjectDetails} from '../lib/vercel-inventory.mjs';
let cache;
export default {async fetch(request){
 if(request.method!=='GET')return new Response('Method not allowed',{status:405});
 const now=Date.now(),token=process.env.MARKETT_VERCEL_READ_TOKEN??process.env.VERCEL_API_TOKEN??process.env.VERCEL_TOKEN;
 if(!token)return Response.json(inventoryView(snapshot,{now}),{headers:{'Cache-Control':'no-store'}});
 if(!cache||now-cache.at>900000){cache={at:now,promise:readProviderProjects({token,teamId:'team_kTW4N3LZceZMmT95CWJpgwhM'}).then(current=>inventoryView(mergeProjectDetails(current,snapshot),{refreshStatus:'provider-refreshed'})).catch(()=>inventoryView(snapshot,{refreshStatus:'provider-unavailable'}))};}
 return Response.json(await cache.promise,{headers:{'Cache-Control':'no-store'}});
}};
