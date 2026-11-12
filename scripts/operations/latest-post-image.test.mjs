import test from 'node:test';
import assert from 'node:assert/strict';
import {featuredImage,inspectArticle} from '../../api/latest-post-image.js';
import {commandOverview} from '../../api/command-center-model.js';
test('only article image metadata is used; no generic fallback',()=>{
 assert.equal(featuredImage('<meta content="/hero.jpg?a=1&amp;b=2" property="og:image">','https://example.com/post'),'https://example.com/hero.jpg?a=1&b=2');
 assert.equal(featuredImage('<img src="/logo.jpg">','https://example.com/post'),null);
 assert.equal(featuredImage('<meta property="og:image" content="javascript:alert(1)">','https://example.com/post'),null);
});
test('article redirects cannot escape the verified site',async()=>{
 await assert.rejects(inspectArticle('https://example.com/post','example.com',async()=>new Response('',{status:302,headers:{location:'https://127.0.0.1/private'}})));
 const result=await inspectArticle('https://example.com/post','example.com',async()=>new Response('<meta property="og:image" content="/actual.jpg">',{headers:{'content-type':'text/html'}}));
 assert.equal(result.imageUrl,'https://example.com/actual.jpg');assert.equal(result.articleUrl,'https://example.com/post');
});
test('newer canonical verified publication wins over older connected receipt',()=>{
 const result=commandOverview({registry:[{domain:'example.com'}],view:{rows:[{domain:'example.com',publication:{title:'New',url:'https://example.com/new',publishedAt:'2026-11-11T10:00:00Z',verifiedAt:'2026-11-11T10:01:00Z'}}]},events:[{site:'example.com',status:'done',title:'Old',url:'https://example.com/old',publishedAt:'2026-11-10T10:00:00Z',verifiedAt:'2026-11-10T10:01:00Z'}],sources:[],now:Date.parse('2026-11-12T00:00:00Z')});
 assert.equal(result.rows[0].lastPublication.title,'New');assert.equal(result.rows[0].automaticReceipt,false);
});
test('metadata presence never certifies page uniqueness or editorial quality',async()=>{
 const {pageMetadata}=await import('../../api/latest-post-image.js');const result=pageMetadata('<meta property="og:title" content="Actual title"><meta name="twitter:image" content="/photo.jpg"><link rel="canonical" href="https://example.com/other"><link rel="icon" href="/favicon.ico">','https://example.com/post');assert.equal(result.ogTitle,'Actual title');assert.equal(result.canonicalMatches,false);assert.equal(result.twitterImage,'https://example.com/photo.jpg');assert.match(result.perPageUniqueness,/unknown/);assert.match(result.imageRelevance,/unknown/);
});
