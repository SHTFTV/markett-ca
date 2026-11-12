import test from 'node:test';import assert from 'node:assert/strict';import {iamLatest} from '../../api/publication-activity.js';import {project} from '../../api/cloud-execution-status.js';
test('IAM latest uses newest feed publication date and verifies actual article',async()=>{
 const source=await iamLatest(async url=>url.endsWith('rss.xml')?new Response('<rss><item><title>Old</title><link>https://www.industryarmymarketing.com/blog/old</link><pubDate>Wed, 11 Nov 2026 00:00:00 GMT</pubDate></item><item><title>New</title><link>https://www.industryarmymarketing.com/blog/new</link><pubDate>Wed, 11 Nov 2026 01:00:00 GMT</pubDate></item></rss>'):new Response('<link rel="canonical" href="https://www.industryarmymarketing.com/blog/new">',{headers:{'content-type':'text/html'}}));
 assert.equal(source.events[0].title,'New');assert.equal(source.events[0].publishedAt,'2026-11-11T01:00:00.000Z');
});
test('unattended recovery publication is distinct from scheduled automation',()=>{
 const result=project('industryarmymarketing.com',{event:'workflow_dispatch',jobResult:'success',runUrl:'https://github.com/SHTFTV/industryarmymarketing.com/actions/runs/123',verifiedPublicationCount:1,writerExecuted:true,unattendedRecoveryExecutionVerified:true,verifiedRecoveryPublication:true,automaticPublicationVerified:true,scheduledExecutionObserved:false},'2026-11-12T05:00:00Z');
 assert.equal(result.unattendedRecoveryExecutionVerified,true);assert.equal(result.verifiedRecoveryPublication,true);assert.equal(result.automaticPublicationVerified,false);assert.equal(result.scheduledExecutionObserved,false);
});
