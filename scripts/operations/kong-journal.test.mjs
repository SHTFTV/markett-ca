import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {kongJournal,activity} from '../../api/publication-activity.js';

const source={site:'kongtractors.com',brand:'Kong Tractors',url:'https://kongtractors.com/feed.xml'};
const evidence=new URL('./fixtures/',import.meta.url);
const feed=await readFile(new URL('kong-feed.xml',evidence),'utf8');
const slugs=['kubota-svl75-3-standard-high-flow-attachment-quote','kubota-kx040-5-auxiliary-hydraulics-attachment-setup'];
const pages=new Map(await Promise.all(slugs.map(async slug=>['https://kongtractors.com/blog/'+slug+'.html',await readFile(new URL(slug+'.html',evidence),'utf8')])));
const fixture=async url=>url===source.url?new Response(feed,{headers:{'content-type':'application/rss+xml'}}):pages.has(url)?new Response(pages.get(url),{headers:{'content-type':'text/html'}}):new Response('',{status:404});

test('dated Kong RSS and actual matching article pages reach the existing reader',async()=>{
 const result=await kongJournal(source,fixture);
 assert.equal(result.status,'connected');
 assert.equal(result.events.length,2);
 assert.deepEqual(result.events.map(x=>x.url),[...pages.keys()]);
 assert.ok(result.events.every(x=>x.runTrigger==='unknown'&&x.featuredImageStatus==='unknown'));
 assert.equal(new Date(result.events[0].publishedAt).toISOString(),'2026-11-18T19:27:53.000Z');
 const reader=await activity(fixture,{includeArchive:false});
 assert.equal(reader.sources.find(x=>x.site===source.site).status,'connected');
 assert.equal(reader.publications.filter(x=>x.site===source.site).length,2);
});

test('a stale or mismatching canonical cannot be reported as a verified publication',async()=>{
 const result=await kongJournal(source,async url=>url===source.url?fixture(url):new Response(pages.get(url)?.replace('rel="canonical"','rel="alternate"')??'',{headers:{'content-type':'text/html'}}));
 assert.equal(result.status,'unavailable');assert.equal(result.events.length,0);
});

test('off-site RSS links and redirects are never fetched or admitted',async()=>{
 const seen=[];
 const result=await kongJournal(source,async(url,options)=>{seen.push(url);assert.equal(options.redirect,'error');return new Response(feed.replaceAll('https://kongtractors.com/blog/','https://example.invalid/blog/'),{headers:{'content-type':'application/rss+xml'}});});
 assert.equal(result.events.length,0);assert.deepEqual(seen,[source.url]);
 const redirected=await kongJournal(source,async()=>new Response('',{status:302,headers:{location:'https://example.invalid/'}}));
 assert.equal(redirected.status,'unavailable');assert.equal(redirected.events.length,0);
});

test('unavailable article and oversized source remain unavailable, not successful events',async()=>{
 const failed=await kongJournal(source,async url=>url===source.url?fixture(url):new Response('',{status:503}));
 assert.equal(failed.status,'unavailable');assert.equal(failed.events.length,0);
 const oversized=await kongJournal(source,async()=>new Response('x'.repeat(2097153)));
 assert.equal(oversized.status,'unavailable');assert.equal(oversized.events.length,0);
});
