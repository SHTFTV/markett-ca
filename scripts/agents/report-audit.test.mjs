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
 const result=await reportAudit(report,{key,now:()=>now,send:async()=>{calls++;return calls===1?{ok:false,status:503}:{ok:true,json:async()=>({durable:true,cursor:'2'})};}});
 assert.equal(calls,2);assert.equal(result.accepted,1);assert.equal(result.failed,1);assert(result.pending[0].retryPending);assert(result.pending[0].event.eventId);assert.equal(result.pending[0].event.httpStatus,200);
});
