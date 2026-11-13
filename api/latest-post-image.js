const host=u=>u.hostname.replace(/^www\./,'');
const decode=s=>s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'");
export function featuredImage(html,article){
 // Article image is the published feature; og:image may be a branded social card.
 const imageUrl=value=>{try{const u=new URL(typeof value==='string'?value:value?.url??value?.contentUrl,article);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port?u.href:null;}catch{return null;}};
 const visit=node=>{if(!node||typeof node!=='object')return null;if(Array.isArray(node)){for(const item of node){const found=visit(item);if(found)return found;}return null;}const types=[node['@type']].flat();if(types.some(t=>['Article','NewsArticle','BlogPosting'].includes(t))){for(const candidate of [node.image].flat()){const found=imageUrl(candidate);if(found)return found;}}return visit(node['@graph']);};
 for(const script of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{const found=visit(JSON.parse(script[1]));if(found)return found;}catch{}}
 const tags=html.match(/<meta\b[^>]*>/gi)??[];
 for(const name of ['og:image','twitter:image'])for(const tag of tags){
  const attrs=Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gs)].map(m=>[m[1].toLowerCase(),decode(m[3])]));
  if((attrs.property??attrs.name)?.toLowerCase()!==name)continue;
  try{const u=new URL(attrs.content,article);if(u.protocol==='https:'&&!u.username&&!u.password&&!u.port)return u.href;}catch{}
 }
 return null;
}
export function pageMetadata(html,article){
 const attrs=tag=>Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gs)].map(m=>[m[1].toLowerCase(),decode(m[3])]));
 const metas=(html.match(/<meta\b[^>]*>/gi)??[]).map(attrs),links=(html.match(/<link\b[^>]*>/gi)??[]).map(attrs);
 const value=name=>metas.find(a=>(a.property??a.name)?.toLowerCase()===name)?.content?.slice(0,600)??null;
 const url=v=>{try{const u=new URL(v,article);return v&&u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}};
 const canonical=url(links.find(a=>a.rel?.toLowerCase()==='canonical')?.href),favicon=url(links.find(a=>a.rel?.split(/\s+/).includes('icon'))?.href);
 return {articleUrl:article,ogImageAlt:value('og:image:alt'),twitterImageAlt:value('twitter:image:alt'),ogTitle:value('og:title'),ogDescription:value('og:description'),ogImage:url(value('og:image')),twitterTitle:value('twitter:title'),twitterDescription:value('twitter:description'),twitterImage:url(value('twitter:image')),canonical,favicon,canonicalMatches:canonical?new URL(canonical).pathname.replace(/\/$/,'')===new URL(article).pathname.replace(/\/$/,'')&&new URL(canonical).hostname.replace(/^www\./,'')===new URL(article).hostname.replace(/^www\./,''):null,perPageUniqueness:'unknown — all-page comparison not performed',imageRelevance:'unknown — editorial visual check required',readability:'unknown — exact-page desktop/phone content check required'};
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
  return {pageMetadata:pageMetadata(html,current.href),imageUrl:featuredImage(html,current),articleUrl:url,checkedAt:new Date().toISOString()};
 }throw Error('Redirect limit');
}
let snapshot;
async function currentRows(request){
 if(!snapshot||Date.now()-snapshot.at>30000)snapshot={at:Date.now(),promise:import('./command-center-status.js').then(({default:overview})=>overview.fetch(new Request(new URL('/api/command-center-status',request.url)))).then(async r=>{if(!r.ok)throw Error();const data=await r.json();return [...data.rows,...(data.migrationBacklog??[])];})};
 return snapshot.promise;
}
export default {async fetch(request){
 if(request.method!=='GET')return new Response('Method not allowed',{status:405});
 const params=new URL(request.url).searchParams,domain=params.get('site'),requested=params.get('article');
 try{
  const row=(await currentRows(request)).find(r=>r.domain===domain);
  const article=requested??row?.latestObservedPublication?.url??row?.lastPublication?.url;
  const permitted=article&&(row?.latestObservedPublication?.url===article||row?.lastPublication?.url===article||row?.history?.some(e=>e.status==='done'&&e.url===article));
  if(!permitted)return Response.json({status:'unknown',imageUrl:null,reason:'No matching retained publication or actually inspected article; arbitrary URLs are not fetched.'});
  const result=await inspectArticle(article,domain);
  return Response.json({...result,status:result.imageUrl?'article-metadata':'unavailable'},{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({status:'unavailable',imageUrl:null},{headers:{'Cache-Control':'no-store'}});}
}};

