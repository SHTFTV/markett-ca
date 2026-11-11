const parent=document.getElementById('current-operations');
if(parent){
 const box=document.createElement('section');box.id='durable-cloud-events';box.style.cssText='border:1px solid #547e6c;padding:20px;margin:24px 0;overflow-wrap:anywhere';
 const title=document.createElement('h2');title.textContent='Durable cloud events';
 const connection=document.createElement('p');connection.setAttribute('role','status');connection.textContent='● Connecting to committed cloud events…';
 const coverage=document.createElement('p');coverage.textContent='Publisher coverage unknown until durable state loads. A dashboard connection does not prove a publisher is running.';
 const list=document.createElement('ol');list.setAttribute('aria-label','Recent durable operational events');
 box.append(title,connection,coverage,list);parent.prepend(box);
 const time=v=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',dateStyle:'medium',timeStyle:'medium'}).format(new Date(v))+' Pacific';
 let lastSeen=0,lastCursor='0',connected=false,es,refreshTimer,seen=new Set();
 const status=(text,ok)=>{connected=ok;connection.textContent=(ok?'● ':'● ')+text;connection.style.color=ok?'#96efb4':'#ff929b';};
 async function state(){try{const r=await fetch('/api/operations-state',{cache:'no-store'});if(!r.ok)throw Error();const s=await r.json();const sites=s.sites??[];coverage.textContent=(s.siteCount??sites.length)+' domains enrolled in durable cloud state. Publisher/event connections are evidenced separately; site registration is not publishing proof. Latest state read '+time(s.checkedAt??s.assembledAt??new Date().toISOString())+'.';}catch{coverage.textContent='● Durable state unavailable. Site/worker coverage is unknown; no worker marked healthy.';}}
 function append(e){if(seen.has(e.cursor))return;seen.add(e.cursor);lastCursor=e.cursor;const li=document.createElement('li');li.textContent=e.domain+' · '+e.type.replaceAll('_',' ')+' · '+e.status+(e.taskKey?' · '+e.taskKey:'')+' · saved '+time(e.acceptedAt);if(e.articleUrl){const a=document.createElement('a');a.textContent=' Open article';a.href=e.articleUrl;li.append(a);}list.prepend(li);while(list.children.length>30)list.lastChild.remove();}
 function open(){es=new EventSource('/api/operations-stream?after='+encodeURIComponent(lastCursor));
  es.addEventListener('connection',e=>{const d=JSON.parse(e.data);lastSeen=Date.now();status('Cloud event connection active · '+time(d.at)+'. Only committed scoped events are shown.',true);state();});
  es.addEventListener('heartbeat',e=>{const d=JSON.parse(e.data);lastSeen=Date.now();status('Cloud event connection active · last heartbeat '+time(d.at)+'. Publisher execution is separate.',true);});
  es.addEventListener('operation',e=>{const d=JSON.parse(e.data);lastSeen=Date.now();append(d);clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>{window.dispatchEvent(new CustomEvent('durable-operations-change'));state();},200);});
  es.addEventListener('unavailable',()=>status('Cloud event backend unavailable. Reconnecting; retain prior saved events.',false));
  es.addEventListener('reconnect',()=>{es.close();open();});
  es.onerror=()=>status('Cloud event connection lost. Browser will reconnect and replay saved events; current worker state unknown.',false);
 }
 setInterval(()=>{if(connected&&Date.now()-lastSeen>45000)status('Cloud event heartbeat stale. Connection or backend needs attention.',false);},10000);
 state();open();
}
