const root=document.getElementById('build-recovery-status');
async function refresh(){if(!root)return;try{
 const response=await fetch('/api/command-center-status',{cache:'no-store'});if(!response.ok)throw Error();const data=await response.json(),q=data.buildQueue;if(!q)throw Error();
 root.replaceChildren();const add=(tag,text,parent=root)=>{const n=document.createElement(tag);n.textContent=text;parent.append(n);return n;};
 add('p',data.rows.length+' domain records · '+(data.countDefinitions?.ownedAccounts?.combinedUniqueOwnedDomains??'unknown')+' registrar account domains. Completed builds and reserved active builds are excluded from the available choices.');
 add('p','Weddings.io and InteriorDesigners.io: build completed / live. Publishing and automation gaps remain separate.');
 add('p',q.order+'. '+q.confirmedNewBuilds.length+' positively confirmed new builds; '+q.inspectionCandidates.length+' owned candidates need source/deployment inspection before a new build is confirmed.');
 const select=add('select','');select.setAttribute('aria-label','Build queue group');for(const [value,label]of [['candidates','Available choices — inspect before build'],['confirmed','Confirmed new builds'],['reserved','Reserved / active owner'],['completed','Completed builds'],['repairs','Existing build repairs']]){const o=add('option',label,select);o.value=value;}
 const filter=add('input','');filter.type='search';filter.placeholder='Filter remaining domains';filter.setAttribute('aria-label','Filter build choices');filter.style.cssText='max-width:100%;box-sizing:border-box';
 const summary=add('p',''),list=add('div','');
 function render(){list.replaceChildren();const key=select.value,values=key==='candidates'?q.inspectionCandidates:key==='confirmed'?q.confirmedNewBuilds:key==='reserved'?q.reserved:key==='repairs'?q.repairs:q.completed.map(domain=>({domain}));const matches=values.filter(x=>x.domain.includes(filter.value.trim().toLowerCase()));summary.textContent=matches.length+' matching '+(key==='candidates'?'inspection candidates — unknown is not unbuilt':key);
 for(const site of matches){const item=add('details','',list);add('summary',site.domain+(key==='completed'?' · completed build':key==='reserved'?' · reserved':' · '+site.state),item);add('p',site.detail??site.state??'Build already completed; runtime work is tracked separately.',item);if(site.owner)add('p','Responsible: '+site.owner,item);if(site.checkedAt)add('p','Evidence '+new Date(site.checkedAt).toLocaleString('en-US',{timeZone:'America/Los_Angeles'})+' Pacific',item);if(site.proofGap)add('p','Proof needed: '+site.proofGap,item);}}
 select.addEventListener('change',render);filter.addEventListener('input',render);render();
 }catch{root.textContent='Build queue unavailable; no domain inferred unbuilt.';}}
refresh();window.addEventListener('durable-operations-change',refresh);
