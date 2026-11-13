export function windowFor(now=new Date()){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(p=>[p.type,p.value]));const today=parts.year+'-'+parts.month+'-'+parts.day;
 const shift=n=>new Date(Date.parse(today+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
 return {startDate:shift(-7),endDate:shift(-1),requestedTimeZone:'America/Los_Angeles',definition:'Last seven complete calendar days; provider property timezone is shown separately.'};
}
export function unavailable(domain,window,reason){return {domain,status:'unavailable',source:'GA4',users:null,sessions:null,pageviews:null,searchClicks:null,window,checkedAt:new Date().toISOString(),reason,nextAction:'Connect Google Analytics read access, link the exact site property, and configure the existing approved server reader. No historical visits can be inferred from search clicks or missing tracking.'};}
export async function readGA4({domain,propertyId,accessToken,window,fetcher=fetch}){
 if(!/^\d+$/.test(propertyId??''))return unavailable(domain,window,'Exact GA4 property mapping is not configured.');
 if(!accessToken)return unavailable(domain,window,'Approved runtime GA4 read access is not configured.');
 try{const r=await fetcher('https://analyticsdata.googleapis.com/v1beta/properties/'+propertyId+':runReport',{method:'POST',headers:{Authorization:'Bearer '+accessToken,'Content-Type':'application/json'},signal:AbortSignal.timeout(10000),body:JSON.stringify({dateRanges:[{startDate:window.startDate,endDate:window.endDate}],metrics:[{name:'totalUsers'},{name:'sessions'},{name:'screenPageViews'}],dimensionFilter:{filter:{fieldName:'hostName',inListFilter:{values:[domain,'www.'+domain],caseSensitive:false}}}})});
 if(!r.ok)return unavailable(domain,window,r.status===401||r.status===403?'Google Analytics read authorization was rejected; reconnect the property reader.':'GA4 report unavailable; no zero inferred.');
 const data=await r.json(),values=data.rows?.[0]?.metricValues?.map(v=>Number(v.value));if(!values||values.length!==3||values.some(n=>!Number.isFinite(n)||n<0))return unavailable(domain,window,'No usable scoped GA4 metric row returned; no zero inferred.');
 return {domain,status:'verified-provider-report',source:'Google Analytics Data API / GA4',propertyId,users:values[0],sessions:values[1],pageviews:values[2],searchClicks:null,window:{...window,providerTimeZone:data.metadata?.timeZone??'unknown'},checkedAt:new Date().toISOString(),metricDefinitions:{users:'GA4 totalUsers, scoped to exact site hostnames; not independently identified people',sessions:'GA4 sessions',pageviews:'GA4 screenPageViews',searchClicks:'Not queried; search clicks are not visitors'},freshness:'queried-now; recent GA4 days may still process'};
 }catch{return unavailable(domain,window,'GA4 provider request failed; no zero inferred.');}
}
