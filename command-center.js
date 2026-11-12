const $=id=>document.getElementById(id);const add=(tag,text,parent,cls)=>{const e=document.createElement(tag);e.textContent=text;if(cls)e.className=cls;parent.append(e);return e;};const clear=id=>{$(id).replaceChildren();return $(id);};
async function load(){try{const response=await fetch('/public-status.json',{cache:'no-store'});if(!response.ok)throw new Error('Snapshot unavailable');const s=await response.json();const alert=clear('attention');add('strong',s.attention.required?'● ATTENTION REQUIRED':'● Recorded work progressing',alert);add('p',s.attention.label,alert);
$('verify').textContent=`${s.verification.checked} / ${s.verification.total} known domains checked · ${s.verification.responding} HTTP responding · ${s.verification.unavailable} request/DNS/TLS unavailable · ${s.verification.http451??0} HTTP451. Recorded run: ${s.verification.status}. Observation: ${s.verification.observedAt??'not started'}.`;$('progress').value=s.verification.checked;$('progress').max=s.verification.total;
const pipeline=clear('pipeline');for(const [key,label]of [['discovered','Distinct candidates discovered'],['drafted','Drafts prepared'],['awaitingReview','Awaiting editorial / QA review'],['verifiedPublished','Verified publications in dated snapshot']]){const r=add('div','',pipeline,'row');add('span',label,r);add('strong',String(s.counts[key]),r);}
$('collection').textContent=`Last collection ${s.collection.lastRun??'not run'} · ${s.collection.status}. Latest run: ${s.collection.newCandidates} new candidate(s), ${s.collection.duplicateItemsFiltered} duplicate item(s) filtered.`;
const events=clear('events');for(const event of s.events){const r=add('div',event.label,events,'activity '+event.status);add('small',new Date(event.at).toLocaleString(),r);}const sites=clear('sites');for(const site of s.sites){const r=add('div','',sites,'row');const name=add('a',site.brand,r);name.href='https://'+site.domain+'/';const text=add('span',`${site.availability} · ${site.contentStage}`,r,'stage');text.title=site.observedAt??'Observation unknown';if(site.lastVerifiedPublication){const link=add('a','Existing article verified ↗',r);link.href=site.lastVerifiedPublication.url;}}
const industries=clear('industries');for(const industry of s.industries){const r=add('div','',industries,'row');add('span',industry.name,r);add('span',String(industry.siteRecords)+' records',r,'stage');}
$('worker').textContent=`Worker observation at ${s.worker.observedAt??'unknown'}: ${s.worker.state}. ${s.worker.scope}. This observation is historical once exported; it is not a public heartbeat.`;$('error').textContent='';}catch(e){$('error').textContent=e.message;}}
$('refresh').onclick=load;load();


const publicationImageCache=new Map();let publicationEvents=[],publicationLimit=24,publicationRefresh;const olderPublicationEvents=new Map();let publicationArchiveCursor=null,archivePagingStarted=false;
const publicationTime=v=>v&&Number.isFinite(Date.parse(v))?new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',dateStyle:'medium',timeStyle:'short'}).format(new Date(v))+' Pacific':'Unknown';
async function imageFor(event,box,credit){
 const key=event.url+'|'+(event.featuredImageUrl??'')+'|'+Math.floor(Date.now()/300000);
 if(!publicationImageCache.has(key))publicationImageCache.set(key,fetch('/api/latest-post-image?site='+encodeURIComponent(event.site)+'&article='+encodeURIComponent(event.url),{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json();}).catch(()=>({status:'unavailable'})));
 const result=await publicationImageCache.get(key);if(!box.isConnected)return;
 if(result.articleUrl!==event.url||!result.imageUrl){box.textContent='Image unavailable / unverified — inspect this article';box.style.color='#ff939b';return;}
 box.replaceChildren();const img=add('img','',box);img.alt=event.title;img.loading='lazy';img.referrerPolicy='no-referrer';img.style.cssText='width:100%;height:100%;object-fit:contain';img.onerror=()=>{box.textContent='Image failed to load — other publications continue';box.style.color='#ff939b';};img.src=result.imageUrl;
 credit.textContent=event.featuredImageCredit??result.pageMetadata?.ogImageAlt??'Image credit not supplied by the published page / receipt.';
}
function renderPublicationFeed(result){
 if(!archivePagingStarted)publicationArchiveCursor=result.nextPublicationCursor??null;
 const box=clear('live-publications'),seen=new Map();for(const e of [...olderPublicationEvents.values(),...(result.publications??result.events??[])])if(e.status==='done'&&e.url&&e.publishedAt&&Date.parse(e.publishedAt)<=Date.now())seen.set(e.site+'|'+e.url,e);
 publicationEvents=[...seen.values()].sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)||a.id.localeCompare(b.id));
 $('live-checked').textContent=publicationEvents.length+' retained published-post receipts · checked '+publicationTime(result.checkedAt)+'. Original publication dates; image/visual proof remains separate. '+result.sources.filter(s=>s.status==='connected').length+' connected public result sources; missing site connections remain unknown in site rows.';
 const grid=add('div','',box);grid.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:18px';
 for(const e of publicationEvents.slice(0,publicationLimit)){
  const card=add('article','',grid);card.style.cssText='min-width:0;border:1px solid #40544f;border-radius:10px;padding:14px;overflow-wrap:anywhere';
  const picture=add('div','Image check pending…',card);picture.style.cssText='aspect-ratio:16/9;background:#0b1015;display:grid;place-items:center;overflow:hidden;border-radius:7px';
  const a=add('a',e.title,card);a.href=e.url;a.target='_blank';a.rel='noopener';a.style.cssText='display:block;font-size:18px;line-height:1.4;margin-top:12px';
  add('strong',e.site,card).style.display='block';const date=add('time','Published '+publicationTime(e.publishedAt),card);date.dateTime=e.publishedAt;date.style.display='block';
  add('small','Verified '+publicationTime(e.verifiedAt),card).style.display='block';
  const credit=add('p',e.featuredImageCredit??'Image provenance: awaiting the actual published-page read.',card);credit.style.cssText='font-size:13px;line-height:1.5';
  add('small','Image: '+(e.featuredImageStatus??'unknown')+' · type '+(e.featuredImageType??'unknown')+' · SOT '+(e.sotVersion??'unknown')+' · policy '+(e.policyVersion??'unknown'),card).style.display='block';
  add('small','Trigger '+(e.runTrigger??'unknown')+' · '+(e.receiptState??'publisher-reported verification'),card).style.display='block';
  if(e.runUrl){const run=add('a','Inspect execution receipt ↗',card);run.href=e.runUrl;run.target='_blank';run.rel='noopener';}
  const open=add('button','Check image / preview',card);open.style.cssText='display:block;margin-top:12px;padding:10px;font-size:14px';open.onclick=()=>{imageFor(e,picture,credit);};
  if(typeof IntersectionObserver==='function'){const observer=new IntersectionObserver(entries=>{if(entries.some(x=>x.isIntersecting)){observer.disconnect();imageFor(e,picture,credit);}},{rootMargin:'400px'});observer.observe(picture);}else imageFor(e,picture,credit);
 }
 if(publicationEvents.length>publicationLimit){const more=add('button','Show more published posts',box);more.style.cssText='padding:14px;font-size:16px;margin-top:18px';more.onclick=()=>{publicationLimit+=24;renderPublicationFeed(result);};}
 if(publicationEvents.length<=publicationLimit&&publicationArchiveCursor){const older=add('button','Load older archived publications',box);older.style.cssText='padding:14px;font-size:16px;margin-top:18px';older.onclick=async()=>{older.disabled=true;try{const r=await fetch('/api/publication-activity?before='+encodeURIComponent(publicationArchiveCursor),{cache:'no-store'});if(!r.ok)throw Error();const page=await r.json();archivePagingStarted=true;publicationArchiveCursor=page.nextPublicationCursor;for(const e of page.publications??[])olderPublicationEvents.set(e.site+'|'+e.url,e);publicationLimit+=24;renderPublicationFeed({...result,nextPublicationCursor:page.nextPublicationCursor});}catch{older.disabled=false;older.textContent='Archive read failed — retry';}};}
 const failures=(result.events??[]).filter(e=>e.status==='failed'),history=add('details','',box);add('summary',failures.length+' retained failed attempts — not published',history);
 for(const e of failures){const p=add('p',e.site+' · '+e.title+' · '+publicationTime(e.checkedAt),history);if(e.nextAction)add('small',e.nextAction,p);}
}
async function refreshPublications(){try{const r=await fetch('/api/publication-activity',{cache:'no-store'});if(!r.ok)throw Error();renderPublicationFeed(await r.json());}catch{$('live-checked').textContent='Publication reader unavailable; retained cards remain visible. No publication or image success inferred.';}}
window.addEventListener('ops-overview',()=>{clearTimeout(publicationRefresh);publicationRefresh=setTimeout(refreshPublications,200);});refreshPublications();setInterval(refreshPublications,30000);

