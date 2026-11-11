const root=document.getElementById('operations-numbers');
if(root){
 const node=(tag,text,parent)=>{const n=document.createElement(tag);n.textContent=text;parent.append(n);return n;};
 const day=v=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(v));
 const date=v=>v?new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',dateStyle:'medium',timeStyle:'short'}).format(new Date(v))+' Pacific':'unknown';
 let stream,timer,streamConnected=false,lastStreamAt=null;
 async function refresh(){
  try{
   const [r,db,host]=await Promise.all([fetch('/api/command-center-status',{cache:'no-store'}),fetch('/api/operations-state',{cache:'no-store'}),fetch('/hosting-counts.json',{cache:'no-store'})]);
   if(!r.ok)throw Error();const s=await r.json(),state=db.ok?await db.json():null,hosting=host.ok?await host.json():null;
   root.replaceChildren();node('h2','Portfolio numbers',root);node('p',s.counts.knownSites+'-domain operating scope · '+date(s.assembledAt)+' · publication day uses Pacific time. Dated audit evidence is separate from cloud event connectivity.',root);
   const rows=s.rows,build=k=>rows.filter(x=>x.build?.status===k).length,known=s.counts.knownSites;
   const cards=node('div','',root);cards.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(165px,1fr));gap:14px';
   const values=[
    [known,'Known domains','Canonical inventory + named sites'],[rows.filter(x=>x.httpCheck?.at).length,'Homepage checks','Dated actual requests / '+known],
    [s.counts.httpResponding,'HTTP200 responses','Includes parking/holding pages'],[build('built-and-live'),'Frontend builds served','Does not certify functional flows'],
    [build('genuinely-unbuilt'),'Confirmed unbuilt','Only positive recovery evidence'],[build('unknown'),'Build status unknown','Includes parking and failed checks'],
    [hosting?.netlifyHosted??'Unknown','Netlify-hosted','Dated sample of '+(hosting?.namedDomainScope??'?')+' named domains'],[hosting?.vercelHosted??'Unknown','Vercel-hosted','Same dated hosting sample; not all-site completion'],
    [state?.knownSites??'Unknown','Cloud DB domains','Enrolled; not publisher activation'],[state?state.sites.filter(x=>x.lastEvent).length:'Unknown','Domains with saved events','Event receipt does not prove continuous operation'],
    [s.counts.continuousBotsVerified,'Continuous workers proven','Requires execution evidence'],[s.counts.automaticPublishersWithReceipts,'Native auto publishers proven','Matched scheduled publication receipts'],
    [s.counts.publicationsToday,'Verified posts today','Distinct live publication receipts'],[s.counts.needsAttention,'Sites needing attention','Known issues; unknowns kept separate'],
    [rows.filter(x=>x.gsc?.propertyVerified===true).length,'Google ownership','Verified within '+known+' domains'],[rows.filter(x=>x.gsc?.sitemap?.status==='Success').length,'Google sitemap Success','Submission/discovery is not indexing'],
    [rows.filter(x=>x.bing?.propertyVerified===true).length,'Bing ownership','Verified within '+known+' domains'],[rows.filter(x=>x.bing?.sitemap?.status==='Success').length,'Bing sitemap Success','Separate from ownership and indexing'],
    [s.search.indexedSites??'Unknown','Actually indexed sites',s.search.indexCoverageKnownSites+' sites have index-count evidence'],
    [rows.every(x=>Number.isFinite(x.gsc?.indexing?.indexedPages))?rows.reduce((n,x)=>n+x.gsc.indexing.indexedPages,0):'Unknown','Indexed pages','Never substitute sitemap URL counts'],
    [rows.filter(x=>x.pseo?.deployedInfrastructureVerified).length,'pSEO infrastructure evidenced','Health and indexing remain separate']
   ];
   for(const [value,label,note]of values){const card=node('article','',cards);card.style.cssText='padding:18px;border:1px solid #547e6c;border-radius:8px;background:#142027;color:#edf2ee';const strong=node('strong',String(value),card);strong.style.cssText='display:block;font-size:38px;line-height:1.15';node('h3',label,card).style.cssText='font-size:16px;margin:12px 0';node('p',note,card).style.cssText='font-size:13px;line-height:1.5';}
   node('p','Homepage/build audit '+date(s.registrySnapshotAt)+' · hosting sample '+date(hosting?.checkedAt)+' · Google/Bing '+date(s.search.latestGscAttempt)+'. All129 unattended publisher integrations remain unproven.',root);
   node('h3','Posts today by site',root);const tableWrap=node('div','',root);tableWrap.style.cssText='max-width:100%;overflow-x:auto';const table=node('table','',tableWrap);table.style.cssText='width:100%;text-align:left';const body=node('tbody','',table);let sites=0;
   for(const row of rows){const seen=new Map();for(const e of row.history??[])if(e.status==='done'&&e.url&&e.publishedAt&&day(e.publishedAt)===day(s.assembledAt))seen.set(e.url,e);if(!seen.size)continue;sites++;const tr=node('tr','',body);node('th',row.domain,tr);node('td',String(seen.size),tr);const td=node('td','',tr);for(const e of seen.values()){const a=node('a',e.title??'Verified article',td);a.href=e.url;a.style.display='block';}}
   if(!sites)node('p','0 verified publication receipts today in this feed.',root);
   const label=node('p',document.getElementById('durable-cloud-events')?'Cloud event connection and replay status are shown below.':streamConnected?'Cloud event stream connected · '+date(lastStreamAt)+'. Publisher execution is checked separately.':'Live worker-event connection: checking…',root);label.id='numbers-event-connection';
   if(!document.getElementById('durable-cloud-events')&&!stream){stream=new EventSource('/api/operations-stream');stream.addEventListener('operation',()=>{clearTimeout(timer);timer=setTimeout(refresh,250);});stream.addEventListener('connection',()=>{streamConnected=true;lastStreamAt=new Date().toISOString();const n=document.getElementById('numbers-event-connection');if(n)n.textContent='Cloud event stream connected. Saved events refresh these counters; publisher execution is checked separately.';});stream.addEventListener('heartbeat',()=>{streamConnected=true;lastStreamAt=new Date().toISOString();});stream.onerror=()=>{streamConnected=false;const n=document.getElementById('numbers-event-connection');if(n)n.textContent='● Cloud event stream disconnected; reconnecting. Dated counts retained.';};}
  }catch{root.replaceChildren();node('h2','Current numbers unavailable',root);node('p','● The evidence API failed. No counts marked complete; retrying.',root);}
 }
 window.addEventListener('durable-operations-change',refresh);refresh();setInterval(refresh,30000);
}
