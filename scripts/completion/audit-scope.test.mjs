import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac,randomUUID} from 'node:crypto';
import {authenticate,project} from '../../lib/operations-events.mjs';

const now=Date.parse('2026-11-15T01:24:00Z');
const secret='synthetic-audit-scope-test-only-not-a-real-key';
const keys={
 'operations-audit':{secret,domains:['existing.example'],types:['task_completed','task_blocked','task_started','heartbeat']},
 'other-audit':{secret,domains:['existing.example'],types:['task_completed','task_blocked']}
};
const event=(domain,extra={})=>({eventId:randomUUID(),domain,type:'task_completed',status:'verified',taskKey:'homepage-http-check',issueCode:'none',observedAt:new Date(now).toISOString(),httpStatus:200,requestSucceeded:true,...extra});
function actor(input,identity='operations-audit'){
 const raw=JSON.stringify(input),timestamp=String(now);
 const signature=createHmac('sha256',secret).update(timestamp+'.'+raw).digest('hex');
 return authenticate(raw,{'x-markett-worker':identity,'x-markett-timestamp':timestamp,'x-markett-signature':signature},keys,now);
}

test('existing authenticated audit records newly reconciled canonical homepage outcomes',()=>{
 for(const domain of ['acustiq.ca','cabins.ltd','lsfencingandmetalwork.com']){
  const success=event(domain),failure=event(domain,{type:'task_blocked',status:'blocked',issueCode:'verification',httpStatus:null,requestSucceeded:false});
  assert.equal(project(success,actor(success),now).httpStatus,200);
  assert.equal(project(failure,actor(failure),now).status,'blocked');
  const unavailable=event(domain,{type:'task_blocked',status:'blocked',issueCode:'verification',httpStatus:503,requestSucceeded:false});
  assert.equal(project(unavailable,actor(unavailable),now).httpStatus,503);
 }
 assert.deepEqual(keys['operations-audit'].domains,['existing.example']);
});

test('reconciliation cannot authorize arbitrary domains, tasks, publications or inconsistent outcomes',()=>{
 const success=event('cabins.ltd');
 for(const input of [
  event('unapproved.example'),
  {...success,taskKey:'arbitrary-task'},
  {...success,type:'task_started',status:'running'},
  {...success,type:'heartbeat',status:'healthy-no-news'},
  {...success,type:'publication_verified'},
  {...success,requestSucceeded:false},
  {...success,httpStatus:503},
  event('cabins.ltd',{type:'task_blocked',status:'blocked',requestSucceeded:true}),
  event('cabins.ltd',{type:'task_blocked',status:'blocked',httpStatus:200,requestSucceeded:false}),
  event('cabins.ltd',{type:'task_blocked',status:'verified',requestSucceeded:false})
 ])assert.throws(()=>project(input,actor(input),now),/SCOPE_DENIED/);
 const withoutHttp={...success};delete withoutHttp.httpStatus;
 assert.throws(()=>project(withoutHttp,actor(withoutHttp),now),/SCOPE_DENIED/);
});

test('reconciliation preserves other actor scopes and still requires authentication and allowed event types',()=>{
 const input=event('cabins.ltd');
 assert.throws(()=>project(input,actor(input,'other-audit'),now),/SCOPE_DENIED/);
 assert.throws(()=>authenticate(JSON.stringify(input),{'x-markett-worker':'operations-audit','x-markett-timestamp':String(now),'x-markett-signature':'0'.repeat(64)},keys,now),/UNAUTHORIZED/);
 assert.throws(()=>project(input,{id:'operations-audit',domains:[],types:['heartbeat']},now),/SCOPE_DENIED/);
 const existing=event('existing.example',{taskKey:'existing-task'});
 assert.equal(project(existing,actor(existing),now).taskKey,'existing-task');
});
