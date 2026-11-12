export const PAGE_QUALITY_VERSION=1;
export const PAGE_CHECKS=['page-classification','utility-exemption','substantive-length','page-title','canonical-url','branding-icon','social-card','social-page-url','social-image-url','page-specific-card','twitter-page-specific','live-card-images','live-brand-icon','machine-readable-content','actual-visual-editorial-review','loaded-site-sot'];
const nonempty=x=>typeof x==='string'&&x.trim().length>0;
const decode=s=>String(s??'').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>');
const attrs=tag=>Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)].map(m=>[m[1].toLowerCase(),decode(m[2]??m[3]??m[4])]));
const normalized=x=>decode(x).replace(/\s+/g,' ').trim().toLowerCase();
const https=x=>{try{const u=new URL(x);return u.protocol==='https:'&&!u.username&&!u.password&&!/token=|key=|signature=|password=|bearer/i.test(u.search)?u.href:null;}catch{return null;}};
export function inspectPage({url,html,pageType,exemptionReason,homepageCard,formatExemption,review,imageChecks=[],observedAt,sourceCommit,sotLoad},now=Date.now()){
 const checks=[],check=(id,pass,reason)=>checks.push({id,status:pass?'passed':'failed',reason:pass?null:reason});
 const metas=[...String(html).matchAll(/<meta\b[^>]*>/gi)].map(m=>attrs(m[0]));
 const value=key=>metas.find(m=>(m.property??m.name??'').toLowerCase()===key)?.content??null;
 const links=[...String(html).matchAll(/<link\b[^>]*>/gi)].map(m=>attrs(m[0]));
 const title=decode(String(html).match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]??'').trim();
 const canonical=links.find(l=>(l.rel??'').toLowerCase().split(/\s+/).includes('canonical'))?.href;
 const icon=links.find(l=>(l.rel??'').toLowerCase().split(/\s+/).includes('icon'))?.href;
 const card={title:value('og:title'),description:value('og:description'),url:value('og:url'),image:value('og:image'),type:value('og:type'),twitterCard:value('twitter:card'),twitterTitle:value('twitter:title'),twitterDescription:value('twitter:description'),twitterImage:value('twitter:image')};
 const editorial=['article','editorial-page'].includes(pageType),utility=['utility','privacy','form'].includes(pageType);
 const body=String(html).match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1]??String(html).match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]??'';
 const text=decode(body.replace(/<(script|style|nav|footer|header)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]*>/g,' '));
 const shortBrief=https(url)&&new URL(url).hostname.replace(/^www\./,'')==='theminingminute.com'&&formatExemption?.kind==='mining-one-minute-brief'&&formatExemption?.approved===true&&nonempty(formatExemption?.sourceRef)&&nonempty(formatExemption?.reason);
 const wordCount=text.match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu)?.length??0;
 check('page-classification',editorial||utility||pageType==='home','Explicit editorial/home type or sourced utility/privacy/form exemption required');
 check('utility-exemption',!utility||nonempty(exemptionReason),'Utility exemption needs a reason; do not pad legal text or forms');
 check('substantive-length',!editorial||(shortBrief?wordCount>0:wordCount>=2000),'Sourced Mining one-minute briefs remain short; other substantive editorial page/article requires at least2000 meaningful main-content words; navigation does not count');
 check('page-title',nonempty(title)&&nonempty(value('description')),'Page-specific HTML title and meta description required');
 check('canonical-url',https(canonical)===https(url)&&!!https(url),'Canonical must match this exact public HTTPS page');
 check('branding-icon',nonempty(icon),'Site favicon/icon declaration required; actual branded visual review remains separate');
 check('social-card',Object.values(card).every(nonempty)&&['summary','summary_large_image'].includes(card.twitterCard),'Each page needs complete Open Graph and Twitter/X title, description, URL and image metadata');
 check('social-page-url',https(card.url)===https(url)&&!!https(url),'Social URL must identify this page, not the homepage');
 check('social-image-url',!!https(card.image)&&!!https(card.twitterImage),'Social preview image URLs must be HTTPS');
 const isHome=!!https(url)&&new URL(url).pathname==='/';
 check('page-specific-card',isHome||(homepageCard&&['title','description'].every(k=>normalized(card[k])!==normalized(homepageCard[k]))&&(normalized(card.image)!==normalized(homepageCard.image)||review?.assertions?.sharedHomepageImageRelevant===true)),'Repeated homepage title/description cannot serve this page; a shared featured image needs explicit exact-page relevance review');
 check('twitter-page-specific',normalized(card.twitterTitle)===normalized(card.title)&&normalized(card.twitterDescription)===normalized(card.description),'Twitter/X title and description must match the inspected page-specific card');
 const fresh=at=>Number.isFinite(Date.parse(at))&&now-Date.parse(at)>=0&&now-Date.parse(at)<=86400000;
 const imagePass=u=>imageChecks.some(i=>https(i.url)===https(u)&&i.status==='passed'&&i.httpStatus===200&&i.actualImage===true&&fresh(i.checkedAt));
 check('live-card-images',imagePass(card.image)&&imagePass(card.twitterImage),'Both page-specific image URLs require fresh actual HTTP200 image-byte checks');
 let iconUrl=null;try{iconUrl=new URL(icon,url).href;}catch{}check('live-brand-icon',!!iconUrl&&imagePass(iconUrl),'Declared favicon requires an actual fresh successful image-byte check');
 const reviewKeys=['branding','relevantImages','polishedImages','credits','noShutterstock','factualSources','substantiveNoFiller','readability','aeoSeoGeoLlm','desktop','phone'];
 const structured=[...String(html).matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].flatMap(m=>{try{const x=JSON.parse(m[1]);return Array.isArray(x)?x:x['@graph']??[x];}catch{return [];}});
 const articleSchema=structured.some(x=>['Article','NewsArticle','BlogPosting'].includes(x['@type'])&&nonempty(x.headline)&&x.author&&nonempty(x.datePublished));
 check('machine-readable-content',/<html\b[^>]*\blang\s*=/i.test(html)&&(String(html).match(/<h1\b/gi)?.length===1)&&(!editorial||(!/noindex/i.test(value('robots')??'')&&articleSchema)),'Readable HTML language, one page H1 and indexable article headline/author/date schema required for editorial content; no forced FAQ or keyword filler');
 check('actual-visual-editorial-review',review?.pageUrl===url&&review?.sourceCommit===sourceCommit&&review?.synthetic===false&&fresh(review?.observedAt)&&nonempty(review?.proofRef)&&nonempty(review?.observer)&&reviewKeys.every(k=>review?.assertions?.[k]===true)&&(!editorial||review?.sourceRefs?.length>0)&&review?.imageCreditRefs?.length>0&&!/shutterstock\.(com|net)/i.test(html),'Current exact-page/commit desktop+phone, branding, image-credit, factual sources and substantive discoverability review receipt required');
 check('loaded-site-sot',sotLoad?.site===(https(url)?new URL(url).hostname.replace(/^www\./,''):null)&&sotLoad?.sourceCommit===sourceCommit&&sotLoad?.pageQualityVersion===PAGE_QUALITY_VERSION&&nonempty(sotLoad?.loadedRevision)&&/^[a-f0-9]{64}$/.test(sotLoad?.loadedHash??'')&&nonempty(sotLoad?.runRef),'Last actual site bot run must record canonical site SOT revision/hash and quality policy version');
 return {version:PAGE_QUALITY_VERSION,url,sourceCommit,observedAt,wordCount,pageType,formatExemption:shortBrief?formatExemption:null,card,imageChecks,checks,status:checks.every(c=>c.status==='passed')?'passed':'failed',publicationAllowed:checks.every(c=>c.status==='passed'),scope:'This exact page only; independent items continue and whole-site completion is separate'};
}
export function evaluatePageCoverage(contract,evidence=[],{now=Date.now()}={}){
 const pages=contract?.pageInventory,blockers=[],matrix=[];
 if(contract?.pageQualityVersion!==PAGE_QUALITY_VERSION||!Array.isArray(pages)||!pages.length||!nonempty(contract?.pageInventoryRef))return {version:1,status:'unknown',blockers:[{id:'page-inventory',reason:'Versioned complete page inventory and canonical source required; uninspected pages cannot pass'}],matrix};
 const seen=new Set();for(const page of pages){
  if(!https(page.url)||seen.has(page.url)){blockers.push({id:'page-inventory',reason:'Unique actual HTTPS page URLs required'});continue;}seen.add(page.url);
  const receipt=evidence.filter(e=>e.check==='page-quality'&&e.pageUrl===page.url&&e.site===contract.site&&e.repository===contract.repository&&e.sourceCommit===contract.sourceCommit).sort((a,b)=>(Date.parse(b.observedAt)||Infinity)-(Date.parse(a.observedAt)||Infinity))[0];
  const age=now-Date.parse(receipt?.observedAt);const pass=receipt?.status==='passed'&&receipt?.environment==='production'&&receipt?.synthetic===false&&receipt?.qualityVersion===1&&receipt?.result?.publicationAllowed===true&&receipt?.result?.url===page.url&&receipt?.result?.pageType===page.pageType&&(!receipt?.result?.formatExemption||(page.formatExemption?.approved===true&&page.formatExemption?.kind===receipt.result.formatExemption.kind&&page.formatExemption?.sourceRef===receipt.result.formatExemption.sourceRef))&&receipt?.result?.observedAt===receipt?.observedAt&&receipt?.result?.sourceCommit===contract.sourceCommit&&PAGE_CHECKS.every(id=>receipt?.result?.checks?.some(c=>c.id===id&&c.status==='passed'))&&nonempty(receipt.proofRef)&&age>=0&&age<=86400000;
  matrix.push({url:page.url,status:pass?'passed':receipt?'failed-or-stale':'unknown',observedAt:receipt?.observedAt??null,proofRef:receipt?.proofRef??null,card:receipt?.result?.card??null,checks:receipt?.result?.checks??[]});if(!pass)blockers.push({id:'page:'+page.url,reason:'Current exact page/card/image/render/SOT quality receipt missing, failed or stale'});
 }
 return {version:1,status:blockers.length?'incomplete':'passed',matrix,blockers};
}
