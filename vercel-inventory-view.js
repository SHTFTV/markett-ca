const root=document.getElementById('vercel-inventory-status');
let provider,overview;
const add=(tag,text,parent=root)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;parent.append(n);return n;};
const date=value=>value&&Number.isFinite(Date.parse(value))?new Date(value).toLocaleString('en-US',{timeZone:'America/Los_Angeles'})+' Pacific':'unknown';
function render(){if(!root)return;root.replaceChildren();
 if(!provider){add('p','Provider inventory unavailable. Current project count and mapping unknown.');return;}
 add('strong',provider.lastVerifiedProjectCount+' distinct Vercel projects · last verified '+date(provider.checkedAt));
 add('p','Source: '+provider.source+' · '+provider.freshness+' evidence. Refresh: '+provider.refresh.status+'. '+provider.refresh.nextAction);
 add('p',provider.lastVerifiedProjectCount+' distinct IDs were observed in the connected provider account, not inferred from domains. Project totals include test and duplicate-purpose projects; live sites and build categories are checked separately. The earlier headline used an older saved snapshot with no runtime provider refresh connection.');
 const all=add('details','');add('summary','Inspect all '+provider.projects.length+' provider project IDs and builds',all);
 for(const project of provider.projects){const item=add('details','',all);add('summary',project.name,item);add('p','Project ID '+project.id,item);add('p','Bound domains: '+(project.domains?.join(', ')||'unknown'),item);add('p','GitHub repo: '+(project.repository??'unknown; canonical association needs recovery'),item);add('p','Latest provider build: '+(project.latestDeployment?.readyState??'unknown')+' · '+(project.latestDeployment?.target??'unknown')+' · '+date(project.latestDeployment?.createdAt),item);add('p','Mapping detail check '+date(project.mappingCheckedAt??provider.checkedAt),item);}
 if(!overview)return;
 const migrations=overview.rows.filter(row=>[row.hostingEvidence?.https?.apex,row.hostingEvidence?.https?.www].some(r=>r?.netlifyId||/netlify/i.test(r?.server??'')));
 const migration=add('details','');add('summary',migrations.length+' domains with dated Netlify route evidence — migration still needs verification',migration);for(const row of migrations)add('p',row.domain+' · observed '+date(row.hostingEvidence.checkedAt),migration);
 add('p','All '+overview.rows.length+' registry records remain visible. Open any site’s current row for its Four Roles, latest actual post image/time, build state and exact blockers. Unmapped domains are explicit; a project name is never used as a domain match.');
}
async function refresh(){try{const r=await fetch('/api/vercel-inventory',{cache:'no-store'});if(!r.ok)throw Error();provider=await r.json();window.dispatchEvent(new CustomEvent('vercel-provider-inventory',{detail:provider}));}catch{provider=null;window.dispatchEvent(new CustomEvent('vercel-provider-inventory',{detail:null}));}render();}
window.addEventListener('ops-overview',event=>{overview=event.detail;render();});refresh();setInterval(refresh,60000);
