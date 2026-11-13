const el=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n;};
const root=document.getElementById('rows'),filter=document.getElementById('filter'),category=document.getElementById('category');
const labels={'reserved-new-build':'Selected new build — dedicated owner reserved','parked-candidate':'Parked candidates — source clearance required','reserved-existing-build':'Reserved existing builds — launch or operation incomplete','existing-build-needs-recovery':'Existing builds — recovery or repair','unknown':'Unknown — inspect before building','ownership-unconfirmed':'Ownership unconfirmed','existing-frontend':'Existing frontends — no duplicate build'};
fetch('/build-queue-current.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Current queue unavailable');return r.json();}).then(data=>{
 document.getElementById('scope').textContent=data.totalDomains+' domains reconciled. '+data.limits;
 document.getElementById('next').textContent='Today’s selected build: '+data.selectedBuild+'. '+data.selectedBuildStatus+' Next recommended candidate after Cabins: '+data.nextCandidate+'. '+data.ordering;
 document.getElementById('evidence-date').textContent='Evidence checked '+new Date(data.checkedAt).toLocaleString('en-CA',{timeZone:'America/Los_Angeles'})+' Pacific. A public frontend does not prove working publishing or forms.';
 for(const key of Object.keys(labels)){const option=el('option',labels[key]+' ('+(data.counts[key]??0)+')');option.value=key;category.append(option);}
 function render(){root.replaceChildren();const term=filter.value.trim().toLowerCase(),sites=data.rows.filter(s=>(!category.value||s.category===category.value)&&[s.domain,s.reason,s.owner,s.aliasReview].join(' ').toLowerCase().includes(term)).sort((a,b)=>(a.domain===data.selectedBuild?-1:b.domain===data.selectedBuild?1:0)||(a.priority??999)-(b.priority??999)||a.domain.localeCompare(b.domain));document.getElementById('counts').textContent=sites.length+' of '+data.totalDomains+' domains shown';
 for(const s of sites){const box=el('details','');box.append(el('summary',(s.priority?'Candidate '+s.priority+' · ':'')+s.domain+' · '+labels[s.category]));
 const fact=(label,value)=>{const p=el('p','');p.append(el('strong',label+': '),document.createTextNode(value));box.append(p);};
 fact('Status',s.reason);if(s.owner)fact('Reserved owner',s.owner+'; reservation retained, current activity not inferred');if(s.aliasReview)fact('Existing brand / alias review',s.aliasReview);fact('Next action',s.nextAction);fact('Evidence time',s.checkedAt);
 for(const e of s.evidence??[]){if(!e.url)continue;const a=el('a',e.result+' · '+(e.checkedAt??'dated evidence'));a.href=e.url;a.rel='noreferrer';const p=el('p','');p.append(a);box.append(p);}root.append(box);}}
 filter.addEventListener('input',render);category.addEventListener('change',render);render();
}).catch(e=>{document.getElementById('scope').textContent=e.message+'. Build status remains unknown.';});
