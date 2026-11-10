// One named domain, at most one external onboarding mutation per invocation.
const sameDomain=(url,domain)=>{try{const u=new URL(url);return u.protocol==='https:'&&!u.username&&!u.password&&u.hostname.replace(/^www\./,'')===domain;}catch{return false;}};
export function nextAction(domain,r,progress={}){
 if(r.gsc?.httpStatus===404||r.gsc?.listed===false)return {engine:'google',type:'add-property'};
 if(r.bing?.status==='checked'&&r.bing.exists===false)return {engine:'bing',type:'add-property'};
 if(r.gsc?.status==='checked'&&r.gsc.propertyVerified===false)return {engine:'google',type:progress.googleDnsApplied?'verify-ownership':'apply-verification-record'};
 if(r.bing?.status==='checked'&&r.bing.propertyVerified===false)return {engine:'bing',type:progress.bingDnsApplied?'verify-ownership':'apply-verification-record'};
 for(const [engine,key]of [['google','gsc'],['bing','bing']])if(r[key]?.propertyVerified&&Array.isArray(r[key].sitemaps)&&r[key].sitemaps.length===0&&!progress[engine+'SitemapSubmitted'])return {engine,type:'submit-sitemap'};
 return null;
}
export async function advance(domain,r,{allowedDomains,progress={},googleToken,bingKey,godaddyAuthorization,fetcher=fetch,privateChallenge=async()=>{},beforeMutation=async()=>{}}={}){
 if(!allowedDomains?.includes(domain)||domain==='treatments.tv'||!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain))throw Error('Domain outside bounded inventory');
 const action=nextAction(domain,r,progress);if(!action)return null;
 if(domain==='theminingminute.com'&&action.type==='apply-verification-record')return {status:'approval-required',action,blocker:'Previously rejected Mining Minute verification record; exact approval gate remains unresolved.'};
 const credential=action.engine==='google'?googleToken:bingKey;if(!credential)return {status:'blocked',action,blocker:action.engine+' runtime authorization missing'};
 const property=r.gsc?.property??'sc-domain:'+domain,site=r.bing?.property??'https://'+domain+'/';
 if(action.engine==='bing'&&!sameDomain(site,domain))throw Error('Bing property does not match named domain');
 if(action.engine==='google'&&property!=='sc-domain:'+domain&&!sameDomain(property,domain))throw Error('Google property does not match named domain');
 async function request(url,options={}){const response=await fetcher(url,{...options,signal:AbortSignal.timeout(15000)});if(!response.ok){const e=Error('Provider HTTP '+response.status);e.code=action.engine+'-http-'+response.status;throw e;}if(response.status===204)return null;const body=await response.text();return body?JSON.parse(body):null;}
 const google=(path,method='GET',body)=>request('https://www.googleapis.com/'+path,{method,headers:{Authorization:'Bearer '+googleToken,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 const bing=(name,body)=>request('https://ssl.bing.com/webmaster/api.svc/json/'+name+'?apikey='+encodeURIComponent(bingKey),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const mutation=async details=>{await beforeMutation({domain,...action,...details});};
 let patch={};
 if(action.type==='add-property'){await mutation({property:action.engine==='google'?property:site});if(action.engine==='google')await google('webmasters/v3/sites/'+encodeURIComponent(property),'PUT');else await bing('AddSite',{siteUrl:site});}
 else if(action.type==='apply-verification-record'){
  if(!godaddyAuthorization)return {status:'blocked',action,blocker:'Exact ownership DNS record needs an existing authorized registrar runtime connection; browser verification remains available.'};
  let record;if(action.engine==='google'){const challenge=await google('siteVerification/v1/token','POST',{site:{type:'INET_DOMAIN',identifier:domain},verificationMethod:'DNS_TXT'});if(challenge?.method!=='DNS_TXT'||!/^google-site-verification=[a-zA-Z0-9_-]+$/.test(challenge.token??''))throw Error('Unexpected Google challenge');record={type:'TXT',name:'@',data:challenge.token,ttl:600};}else{const challenge=r.bing?.dnsChallenge;if(!challenge||!/^[a-f0-9]{20,64}$/i.test(challenge.name??'')||challenge.value!=='verify.bing.com')return {status:'blocked',action,blocker:'Exact Bing challenge not available from provider response; use named-site console to obtain it.'};record={type:'CNAME',name:challenge.name,data:challenge.value,ttl:600};}
  await privateChallenge({domain,engine:action.engine,record});const url='https://api.godaddy.com/v1/domains/'+encodeURIComponent(domain)+'/records/'+record.type+'/'+encodeURIComponent(record.name);const headers={Authorization:godaddyAuthorization,'Content-Type':'application/json'};
  let existing;try{existing=await request(url,{headers});}catch(e){if(e.code!==action.engine+'-http-404')throw e;existing=[];}
  const equal=x=>x.type===record.type&&x.name===record.name&&String(x.data).replace(/\.$/,'')===record.data;
  if(!existing?.some(equal)){if(record.type==='CNAME'&&existing?.length)return {status:'blocked',action,blocker:'Conflicting verification-name CNAME; refusing replacement.'};await mutation({record});await request('https://api.godaddy.com/v1/domains/'+encodeURIComponent(domain)+'/records',{method:'PATCH',headers,body:JSON.stringify([record])});}
  const saved=await request(url,{headers});if(!saved?.some(equal))throw Error('Registrar did not confirm exact verification record');patch[action.engine+'DnsApplied']=true;
 }
 else if(action.type==='verify-ownership'){await mutation({property:action.engine==='google'?property:site});if(action.engine==='google'){const receipt=await google('siteVerification/v1/webResource?verificationMethod=DNS_TXT','POST',{site:{type:'INET_DOMAIN',identifier:domain}});if(receipt?.site?.identifier!==domain)throw Error('Google ownership receipt mismatch');}else{const receipt=await bing('VerifySite',{siteUrl:site});if(receipt?.d!==true)return {status:'pending',action,blocker:'Bing has not verified ownership; allow DNS propagation, then recheck.'};}}
 else if(action.type==='submit-sitemap'){
  let url='https://'+domain+'/sitemap.xml',response;for(let i=0;i<4;i++){if(!sameDomain(url,domain))throw Error('Cross-domain sitemap rejected');response=await fetcher(url,{redirect:'manual',signal:AbortSignal.timeout(15000)});if([301,302,307,308].includes(response.status)){url=new URL(response.headers.get('location'),url).href;continue;}break;}
  if(!response?.ok)throw Error('Sitemap HTTP unavailable');const xml=await response.text();if(xml.length>4_000_000||!/<(?:[\w-]+:)?(?:urlset|sitemapindex)(?:\s|>)/.test(xml)||/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error('Working public XML sitemap not verified');await mutation({sitemapUrl:url});if(action.engine==='google')await google('webmasters/v3/sites/'+encodeURIComponent(property)+'/sitemaps/'+encodeURIComponent(url),'PUT');else await bing('SubmitFeed',{siteUrl:site,feedUrl:url});patch[action.engine+'SitemapSubmitted']=true;
 }
 return {status:'pending-recheck',action,progress:{...progress,...patch},receipt:{at:new Date().toISOString(),domain,engine:action.engine,action:action.type,accepted:true,ownershipVerified:false,sitemapFetchSuccess:false}};
}
