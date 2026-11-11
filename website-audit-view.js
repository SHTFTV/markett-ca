const $=id=>document.getElementById(id);
const stamp=value=>value?new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',dateStyle:'medium',timeStyle:'short'}).format(new Date(value))+' Pacific':'unknown';
function render(s){
 const checked=s.rows.filter(r=>r.httpCheck?.at),http200=checked.filter(r=>r.httpCheck?.httpStatus===200),blocked=checked.filter(r=>r.httpCheck?.httpStatus===451),failed=checked.filter(r=>r.httpCheck?.httpStatus==null),at=s.websiteAuditSnapshotAt??s.registrySnapshotAt;
 for(const [id,value]of [['website-known-count',s.counts.knownSites],['website-checked-count',checked.length],['website-http-count',http200.length]])if($(id))$(id).textContent=String(value);
 const age=Date.now()-Date.parse(at),stale=!Number.isFinite(age)||age>24*3600000;
 const text=checked.length+' / '+s.counts.knownSites+' known domains checked · '+http200.length+' HTTP200 · '+failed.length+' request/DNS/TLS failures · '+blocked.length+' HTTP451. Audit: '+stamp(at)+'. Homepage probes, not functional certification.';
 if($('website-audit-freshness'))$('website-audit-freshness').textContent=text;
 if($('verify'))$('verify').textContent=text;
 if($('progress')){$('progress').value=checked.length;$('progress').max=s.counts.knownSites;}
 if($('website-audit-alert'))$('website-audit-alert').textContent=(stale?'● Audit stale — new checks required. ':'')+(checked.length<s.counts.knownSites?'● '+(s.counts.knownSites-checked.length)+' added domains still need actual checks. ':'')+'Status feed read '+stamp(s.assembledAt)+'. Refresh uses published evidence; instant worker-event delivery is not connected.';
}
async function refresh(){try{const r=await fetch('/api/command-center-status',{cache:'no-store'});if(!r.ok)throw Error();render(await r.json());}catch{if($('website-audit-alert'))$('website-audit-alert').textContent='● Status feed unavailable. Dated counts above are retained; current status unknown.';}}
window.addEventListener('ops-overview',e=>render(e.detail));
if($('website-known-count')){refresh();setInterval(refresh,30000);}
const backend=$('backend-operations-status');
if(backend)fetch('/backend-operations-status.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(s=>{backend.replaceChildren();const p=document.createElement('p');p.textContent=s.notice+' Checked '+stamp(s.checkedAt)+'.';backend.append(p);for(const row of s.projects){const section=document.createElement('section'),h=document.createElement('h3'),p=document.createElement('p');h.textContent=row.name+' — '+row.status;p.textContent=row.use;section.append(h,p);backend.append(section);}const note=document.createElement('p');note.textContent=s.assessment;backend.append(note);}).catch(()=>{backend.textContent='● Backend evidence unavailable. No database marked connected.';});

