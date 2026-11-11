const expected=document.querySelector('meta[name="markett-ui-version"]')?.content;
async function check(){if(!expected)return;try{const r=await fetch('/ui-version.json',{cache:'no-store'});if(!r.ok)return;const s=await r.json();if(s.version===expected)return;const active=document.activeElement;if(active?.matches('input,textarea,[contenteditable="true"]'))return;location.reload();}catch{}}
setInterval(check,60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)check();});
