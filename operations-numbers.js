const root=document.getElementById('operations-numbers');
if(root){
 const node=(tag,text,parent)=>{const n=document.createElement(tag);n.textContent=text;parent.append(n);return n;};
 const day=v=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(v));
 const date=v=>v?new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',dateStyle:'medium',timeStyle:'short'}).format(new Date(v))+' Pacific':'unknown';
 let stream,timer,streamConnected=false,lastStreamAt=null;
 async function refresh(){
  try{
   const [r,db,host,provider]=await Promise.all([fetch('/api/command-center-status',{cache:'no-store'}),fetch('/api/operations-state',{cache:'no-store'}),fetch('/hosting-counts.json',{cache:'no-store'}),fetch('/api/vercel-inventory',{cache:'no-store'})]);
   if(!r.ok)throw Error();const s=await r.json(),state=db.ok?await db.json():null,hosting=host.ok?await host.json():null,vercel=provider.ok?await provider.json():null;
   root.replaceChildren();node('h2','Portfolio numbers',root);node('p',s.counts.knownSites+' reconciled domain records · '+date(s.assembledAt)+' · publication day uses Pacific time. Dated audit evidence is separate from cloud event connectivity.',root);
   const rows=s.rows,taskRows=state?.sites?.flatMap(x=>x.tasks??[])??null,build=k=>rows.filter(x=>x.build?.status===k).length,known=s.counts.knownSites;
   const cards=node('div','',root);cards.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(165px,1fr));gap:14px';
   const scope=s.productionScope,account=s.search.accountInventory;
   const values=[
    [scope.verifiedRoutedSites,'Vercel production sites','Canonical READY site + HTTP200 Vercel route; dated checks '+date(scope.routingOldestAt)+' to '+date(scope.routingCheckedAt)],
    [scope.rawProjects,'Raw Vercel projects','Includes preview/test projects; provider census '+date(scope.checkedAt)],
    [scope.readyAttachedCanonicalSites,'READY sites attached','Deployment + custom binding; routing is checked separately'],
    [scope.migrationBacklog,'Migration backlog','Registry records outside verified Vercel route scope; inspect the scope selector'],
    [scope.migration.providerCensus?.netlifyServingDomains??'Unknown','Domains still serving on Netlify','Previously '+(scope.migration.providerCensus?.previousNetlifyServingDomains??'unknown')+'; checked '+date(scope.migration.providerCensus?.netlifyServingDomainsCheckedAt)+' · cohort '+(scope.migration.providerCensus?.routeSampleSize??'unknown')],
    [scope.migration.providerCensus?.netlifyProjects??'Unknown','Netlify projects remaining','Separate provider census · '+date(scope.migration.providerCensus?.netlifyProjectsCheckedAt)],
    [scope.registryRecords,'All registry records','Separate inventory denominator; not operational sites'],
    [scope.migration.verifiedCutovers,'Receipted Vercel cutovers','Deduplicated verified cutover receipts; project creation does not increment'],
    [scope.migration.verifiedNetlifyDeletions,'Receipted Netlify deletions','Provider-confirmed absence only; Vercel routing does not prove deletion'],
    [s.countDefinitions?.ownedAccounts?.combinedUniqueOwnedDomains??'Unknown','Registrar account domains','Dated account inventory · '+date(s.countDefinitions?.ownedAccounts?.checkedAt)],
    [s.counts.httpResponding,'Production HTTP200','Within the verified Vercel scope'],
    [s.counts.automaticPublishersWithReceipts,'Native auto publishers proven','Matched scheduled publication receipts; configuration is separate'],
    [s.counts.continuousBotsVerified,'Continuous workers proven','Requires actual current runtime evidence'],
    [s.counts.publicationsToday,'Verified posts today','Distinct live URLs in production scope · Pacific day'],
    [s.counts.needsAttention,'Production sites needing attention','Search setup is displayed separately and does not block launch'],
    [s.search.gscVerified,'Google verified production sites','Correct production-host coverage · '+date(scope.searchCheckedAt)],
    [s.search.bingVerified,'Bing verified production sites','Exact site inventory · '+date(scope.searchCheckedAt)],
    [s.search.gscPending,'Google setup pending','Hostname mismatch/unverified/missing; inspect each yellow button'],
    [s.search.bingPending,'Bing setup pending','Unverified or absent from inspected account; not indexing'],
    [s.search.sitemapSuccess,'Historical Google sitemap Success','Dated retained evidence; current report sweep unchecked'],
    [rows.filter(x=>x.bing?.historicalSitemap?.status==='Success').length,'Historical Bing sitemap Success','Retained receipt, not a fresh sitemap check'],
    [s.search.indexedSites??'Unknown','Actually indexed sites','Numeric index evidence for '+s.search.indexCoverageKnownSites+' production sites; discovery is separate'],
    [rows.every(x=>Number.isFinite(x.gsc?.indexing?.indexedPages))?rows.reduce((n,x)=>n+x.gsc.indexing.indexedPages,0):'Unknown','Total indexed pages','Never infer zero or use sitemap URL counts'],
    [rows.filter(x=>x.pseo?.deployedInfrastructureVerified).length,'pSEO infrastructure evidenced','Infrastructure is separate from health and indexing'],
    [state?.knownSites??'Unknown','Cloud DB enrolled domains','Registry enrollment; separate from operational denominator']
   ];
   for(const [value,label,note]of values){const card=node('article','',cards);card.style.cssText='padding:18px;border:1px solid #547e6c;border-radius:8px;background:#142027;color:#edf2ee';const strong=node('strong',String(value),card);strong.style.cssText='display:block;font-size:38px;line-height:1.15';node('h3',label,card).style.cssText='font-size:16px;margin:12px 0';node('p',note,card).style.cssText='font-size:13px;line-height:1.5';}
   node('p','Provider refresh: '+(scope.providerRefresh?.status??'unknown')+'. '+(scope.providerRefresh?.nextAction??'Inspect current runtime credential and native receipt.')+' No unattended refresh or alert delivery is inferred from the saved schedule.',root);
   node('h3','Posts today by site',root);const tableWrap=node('div','',root);tableWrap.style.cssText='max-width:100%;overflow-x:auto';const table=node('table','',tableWrap);table.style.cssText='width:100%;text-align:left';const body=node('tbody','',table);let sites=0;
   for(const row of rows){const seen=new Map();for(const e of row.history??[])if(e.status==='done'&&e.url&&e.publishedAt&&day(e.publishedAt)===day(s.assembledAt))seen.set(e.url,e);if(!seen.size)continue;sites++;const tr=node('tr','',body);node('th',row.domain,tr);node('td',String(seen.size),tr);const td=node('td','',tr);for(const e of seen.values()){const a=node('a',e.title??'Verified article',td);a.href=e.url;a.style.display='block';}}
   if(!sites)node('p','0 verified publication receipts today in this feed.',root);
   const label=node('p',document.getElementById('durable-cloud-events')?'Cloud event connection and replay status are shown below.':streamConnected?'Cloud event stream connected · '+date(lastStreamAt)+'. Publisher execution is checked separately.':'Live worker-event connection: checking…',root);label.id='numbers-event-connection';
   if(!document.getElementById('durable-cloud-events')&&!stream){stream=new EventSource('/api/operations-stream');stream.addEventListener('operation',()=>{clearTimeout(timer);timer=setTimeout(refresh,250);});stream.addEventListener('connection',()=>{streamConnected=true;lastStreamAt=new Date().toISOString();const n=document.getElementById('numbers-event-connection');if(n)n.textContent='Cloud event stream connected. Saved events refresh these counters; publisher execution is checked separately.';});stream.addEventListener('heartbeat',()=>{streamConnected=true;lastStreamAt=new Date().toISOString();});stream.onerror=()=>{streamConnected=false;const n=document.getElementById('numbers-event-connection');if(n)n.textContent='● Cloud event stream disconnected; reconnecting. Dated counts retained.';};}
  }catch{root.replaceChildren();node('h2','Current numbers unavailable',root);node('p','● The evidence API failed. No counts marked complete; retrying.',root);}
 }
 window.addEventListener('durable-operations-change',refresh);refresh();setInterval(refresh,30000);
}

