import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {reportAudit} from './report-audit.mjs';
const key='synthetic-transport-test-only-not-a-real-key',now=Date.parse('2026-11-11T20:30:00Z');
test('audit reporter signs actual per-site outcomes and excludes source contact/DNS data',async()=>{
 const calls=[];const report={sites:[{domain:'a.example',checkedAt:new Date(now).toISOString(),http:{status:200,title:'Private-no-copy',mailto:['private@example.com']}},{domain:'b.example',checkedAt:new Date(now).toISOString(),http:{status:451,error:'HTTPblocked'}}]};
 const result=await reportAudit(report,{key,now:()=>now,send:async(url,req)=>{calls.push(req);return {ok:true,json:async()=>({durable:true,cursor:String(calls.length)})};}});
 assert.equal(result.accepted,2);assert.equal(JSON.parse(calls[0].body).type,'task_completed');assert.equal(JSON.parse(calls[1].body).type,'task_blocked');
 assert(!calls[0].body.includes('private'));assert(!calls[0].body.includes('title'));assert.equal(calls[0].headers['x-markett-signature'],createHmac('sha256',key).update(String(now)+'.'+calls[0].body).digest('hex'));
});
test('missing key refuses network and nondurable response remains pending instead of complete',async()=>{
 await assert.rejects(()=>reportAudit({sites:[]},{key:'',send:()=>assert.fail('Networkcalled')}),/KEY_MISSING/);
 const report={sites:[{domain:'a.example',checkedAt:new Date(now).toISOString(),http:{status:200}}]};
 const result=await reportAudit(report,{key,now:()=>now,send:async()=>({ok:true,json:async()=>({durable:false,cursor:'1'})})});assert.equal(result.accepted,0);assert.equal(result.failed,1);assert.match(result.pending[0].reason,/NOT_DURABLE/);
});
test('one failed receipt does not stop independent domains; retry payload retains original event ID',async()=>{
 let calls=0;const report={sites:[{domain:'a.example',checkedAt:new Date(now).toISOString(),http:{status:200}},{domain:'b.example',checkedAt:new Date(now).toISOString(),http:{status:200}}]};
 const result=await reportAudit(report,{key,now:()=>now,send:async()=>{calls++;return calls===1?{ok:false,status:403}:{ok:true,json:async()=>({durable:true,cursor:'2'})};}});
 assert.equal(calls,2);assert.equal(result.accepted,1);assert.equal(result.failed,1);assert(result.pending[0].retryPending);assert(result.pending[0].event.eventId);assert.equal(result.pending[0].event.httpStatus,200);
});
test('temporary throttling/backend failure retries the identical event and refreshes only transport authentication',async()=>{
 const calls=[],pauses=[];let clock=now;
 const report={sites:[{domain:'a.example',checkedAt:new Date(now).toISOString(),http:{status:200}}]};
 const result=await reportAudit(report,{key,now:()=>clock++,pause:async ms=>pauses.push(ms),send:async(url,req)=>{calls.push(req);return calls.length<3?{ok:false,status:calls.length===1?429:503}:{ok:true,json:async()=>({durable:true,cursor:'41'})};}});
 assert.equal(result.accepted,1);assert.equal(result.failed,0);assert.equal(calls.length,3);assert.deepEqual(pauses,[250,500]);assert.equal(result.transportRetries,2);
 assert.equal(calls[0].body,calls[1].body);assert.equal(calls[1].body,calls[2].body);
 assert.notEqual(calls[0].headers['x-markett-timestamp'],calls[1].headers['x-markett-timestamp']);
 for(const req of calls)assert.equal(req.headers['x-markett-signature'],createHmac('sha256',key).update(req.headers['x-markett-timestamp']+'.'+req.body).digest('hex'));
});
test('transport retries stop after three attempts, retain the original event and continue independent domains',async()=>{
 const calls=[],pauses=[];
 const report={sites:[{domain:'a.example',checkedAt:new Date(now).toISOString(),http:{status:null,error:'DNSfailed'}},{domain:'b.example',checkedAt:new Date(now).toISOString(),http:{status:200}}]};
 const result=await reportAudit(report,{key,now:()=>now,pause:async ms=>pauses.push(ms),send:async(url,req)=>{calls.push(req);return JSON.parse(req.body).domain==='a.example'?{ok:false,status:503}:{ok:true,json:async()=>({durable:true,cursor:'42'})};}});
 assert.equal(calls.length,4);assert.deepEqual(pauses,[250,500]);assert.equal(result.accepted,1);assert.equal(result.failed,1);assert.equal(result.transportRetries,2);
 assert.equal(result.pending[0].attempts,3);assert.equal(result.pending[0].reason,'OPERATIONS_AUDIT_RECEIPT_HTTP_503');
 assert.equal(result.pending[0].event.eventId,JSON.parse(calls[0].body).eventId);assert.equal(calls[0].body,calls[1].body);assert.equal(calls[1].body,calls[2].body);
 assert.equal(result.pending[0].event.status,'blocked');assert.equal(result.pending[0].event.requestSucceeded,false);
});
test('authorization/validation errors are not retried and a lost reply reuses the original idempotency key',async()=>{
 const report={sites:[{domain:'a.example',checkedAt:new Date(now).toISOString(),http:{status:200}}]};
 for(const status of [400,401,403,409]){
  let calls=0;const result=await reportAudit(report,{key,now:()=>now,pause:()=>assert.fail('Nontransient failure must not wait'),send:async()=>{calls++;return {ok:false,status};}});
  assert.equal(calls,1);assert.equal(result.failed,1);assert.equal(result.pending[0].attempts,1);assert.equal(result.transportRetries,0);
 }
 const bodies=[];const result=await reportAudit(report,{key,now:()=>now,pause:async()=>{},send:async(url,req)=>{bodies.push(req.body);if(bodies.length===1)throw new TypeError('response lost after write');return {ok:true,json:async()=>({durable:true,cursor:'43'})};}});
 assert.equal(result.accepted,1);assert.equal(result.failed,0);assert.equal(bodies.length,2);assert.equal(bodies[0],bodies[1]);assert.equal(result.transportRetries,1);
});
