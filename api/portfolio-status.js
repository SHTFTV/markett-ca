import {searchEvidence} from './search-evidence.js';
import {portfolio} from './portfolio-data.js';
import {activity} from './publication-activity.js';
export function reconcile(data,events,now=Date.now()){
 const rows=data.rows.map(original=>{
  const row=structuredClone(original);
  const search=searchEvidence.records[row.domain];
  for(const engine of ['gsc','bing'])if(search?.[engine]){row[engine]=search[engine].status;row[engine+'Evidence']=search[engine];}
  row.workQueue=row.workQueue.filter(t=>!(['gsc','bing'].includes(t.type)&&search?.[t.type]&&['verified-sitemap-success','verified'].includes(search[t.type].status)));
  if(row.gsc==='verified-sitemap-fetch-failed')row.workQueue.unshift({type:'gsc',priority:1,status:'blocked',action:'Resolve Google sitemap fetch failure; resubmission accepted, processing not confirmed',blocker:'Current sitemap HTTP200 but Google still reports Couldn’t fetch'});
  const latest=events.filter(e=>e.site===row.domain&&e.status==='done').sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt))[0];
  if(latest&&(!row.publication.publishedAt||Date.parse(latest.publishedAt)>=Date.parse(row.publication.publishedAt)))row.publication={status:'verified-new-publication',url:latest.url,title:latest.title,publishedAt:latest.publishedAt,verifiedAt:latest.verifiedAt};
  row.ageSeconds=row.publication.publishedAt?Math.max(0,Math.floor((now-Date.parse(row.publication.publishedAt))/1000)):null;
  row.overdue=row.schedule.hours&&row.ageSeconds!==null?row.ageSeconds>row.schedule.hours*3600:null;
  row.workQueue=row.workQueue.filter(t=>!(t.type==='publication'&&row.overdue===false));
  if(row.overdue&&!row.workQueue.some(t=>t.type==='publication'))row.workQueue.unshift({type:'publication',priority:1,status:row.schedule.status.includes('success')?'scheduled':'blocked',owner:row.schedule.owner,action:'Publish next distinct article using current site SOT and canonical publisher',blocker:row.schedule.note??null});
  return row;
 });
 const queue=rows.flatMap(r=>r.workQueue.map(task=>({domain:r.domain,ageSeconds:r.ageSeconds,overdue:r.overdue,...task}))).sort((a,b)=>a.priority-b.priority||(b.ageSeconds??0)-(a.ageSeconds??0));
 return {...data,liveCheckedAt:new Date(now).toISOString(),rows,queue,counts:{...data.counts,gscVerified:rows.filter(r=>r.gsc?.startsWith('verified')).length,gscSitemapSuccess:rows.filter(r=>r.gsc==='verified-sitemap-success').length,bingVerified:rows.filter(r=>r.bing?.startsWith('verified')).length,accountStatusesUnknown:rows.filter(r=>r.gsc?.startsWith('unverified')).length,overdue:rows.filter(r=>r.overdue).length,scheduledPublishers:rows.filter(r=>r.schedule.status==='enabled-success-verified').length}};
}
export default {async fetch(request){if(request.method!=='GET')return new Response('Method not allowed',{status:405});const live=await activity();return Response.json(reconcile(portfolio,live.events),{headers:{'Cache-Control':'public, max-age=0, s-maxage=10','X-Content-Type-Options':'nosniff'}});}};
