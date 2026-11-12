const host=u=>u.hostname.replace(/^www\./,'');
const decode=s=>s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'");
export function featuredImage(html,article){
 const tags=html.match(/<meta\b[^>]*>/gi)??[];
 for(const name of ['og:image','twitter:image'])for(const tag of tags){
  const attrs=Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gs)].map(m=>[m[1].toLowerCase(),decode(m[3])]));
  if((attrs.property??attrs.name)?.toLowerCase()!==name)continue;
  try{const u=new URL(attrs.content,article);if(u.protocol==='https:'&&!u.username&&!u.password&&!u.port)return u.href;}catch{}
 }
 return null;
}
export async function inspectArticle(url,domain,fetcher=fetch){
 let current=new URL(url);
 for(let hop=0;hop<4;hop++){
  if(current.protocol!=='https:'||host(current)!==domain||current.username||current.password||current.port)throw Error('Invalid article');
  const r=await fetcher(current.href,{redirect:'manual',signal:AbortSignal.timeout(7000),headers:{Accept:'text/html'}});
  if([301,302,307,308].includes(r.status)){current=new URL(r.headers.get('location'),current);continue;}
  if(!r.ok||!r.headers.get('content-type')?.includes('text/html'))throw Error('Article unavailable');
  const reader=r.body.getReader();let size=0,html='';const decoder=new TextDecoder();
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2097152){await reader.cancel();throw Error('Article too large');}html+=decoder.decode(value,{stream:true});}
  return {imageUrl:featuredImage(html,current),articleUrl:url,checkedAt:new Date().toISOString()};
 }throw Error('Redirect limit');
}
let snapshot;
async function currentRows(request){
 if(!snapshot||Date.now()-snapshot.at>30000)snapshot={at:Date.now(),promise:import('./command-center-status.js').then(({default:overview})=>overview.fetch(new Request(new URL('/api/command-center-status',request.url)))).then(async r=>{if(!r.ok)throw Error();return (await r.json()).rows;})};
 return snapshot.promise;
}
export default {async fetch(request){
 if(request.method!=='GET')return new Response('Method not allowed',{status:405});
 const domain=new URL(request.url).searchParams.get('site');
 try{
  const row=(await currentRows(request)).find(r=>r.domain===domain);
  if(!row?.lastPublication?.url)return Response.json({status:'unknown',imageUrl:null});
  const result=await inspectArticle(row.lastPublication.url,domain);
  return Response.json({...result,status:result.imageUrl?'article-metadata':'unavailable'},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({status:'unavailable',imageUrl:null},{headers:{'Cache-Control':'no-store'}});}
}};
