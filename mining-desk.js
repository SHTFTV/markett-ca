import {miningDesk} from './lib/mining-desk.mjs'
const box=document.getElementById('mining-desk-status')
const time=value=>value&&Number.isFinite(Date.parse(value))?new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',dateStyle:'medium',timeStyle:'short'}).format(new Date(value))+' Pacific':'time unknown'
async function load(){
 try{
  const response=await fetch('https://theminingminute.com/publishing-status.json',{cache:'no-store'})
  if(!response.ok)throw new Error('status '+response.status)
  const view=miningDesk(await response.json())
  box.replaceChildren()
  const title=document.createElement('strong')
  title.textContent=view.headline
  title.style.color=view.tone==='ok'?'#96efb4':'#ff939b'
  box.append(title)
  for(const line of view.lines){const p=document.createElement('p');p.textContent=line;box.append(p)}
  if(view.last?.url){const a=document.createElement('a');a.href=view.last.url;a.textContent='Latest verified story';box.append(a);box.append(document.createTextNode(' · '+time(view.last.publishedAt)))}
  if(view.runUrl){const run=document.createElement('a');run.href=view.runUrl;run.textContent='Latest publisher run';run.style.display='block';box.append(run)}
 }catch{box.textContent='Mining Minute desk unavailable. No healthy publisher is assumed.'}
}
load();setInterval(load,60000)
