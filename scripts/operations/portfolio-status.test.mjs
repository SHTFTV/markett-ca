import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reconcile} from '../../api/portfolio-status.js';
test('verified live events supersede stale audit; failed attempts never replace publication',()=>{
 const data={rows:[{domain:'example.com',publication:{publishedAt:'2026-01-01T00:00:00Z',url:'https://example.com/old'},schedule:{hours:24,status:'enabled-success-verified'},workQueue:[{type:'publication',priority:1}]}],counts:{}};
 const result=reconcile(data,[{site:'example.com',status:'done',publishedAt:'2026-01-03T00:00:00Z',url:'https://example.com/new'},{site:'example.com',status:'failed',publishedAt:'2026-01-04T00:00:00Z',url:null}],Date.parse('2026-01-03T06:00:00Z'));
 assert.equal(result.rows[0].publication.url,'https://example.com/new');assert.equal(result.rows[0].ageSeconds,21600);assert.equal(result.rows[0].overdue,false);assert.equal(result.queue.length,0);assert.equal(data.rows[0].publication.url,'https://example.com/old');
});
test('unknown cadence stays unknown; overdue known cadence gets one bounded task',()=>{
 const rows=[{domain:'unknown.example',publication:{publishedAt:null},schedule:{hours:null,status:'not-verified'},workQueue:[]},{domain:'due.example',publication:{publishedAt:'2026-01-01T00:00:00Z'},schedule:{hours:6,status:'enabled-success-verified'},workQueue:[]}];
 const result=reconcile({rows,counts:{}},[],Date.parse('2026-01-02T00:00:00Z'));assert.equal(result.rows[0].overdue,null);assert.equal(result.rows[1].overdue,true);assert.equal(result.queue.length,1);assert.equal(result.queue[0].status,'scheduled');
});
