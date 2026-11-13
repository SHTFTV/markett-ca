import test from 'node:test';import assert from 'node:assert/strict';import {applyProjectCensus} from '../../lib/project-census.mjs';
test('complete ID census updates total without refreshing old mappings or claiming automation',()=>{
 const view={checkedAt:'2026-11-12T00:00:00Z',canonicalProductionSiteCount:86,projects:[{name:'old'}],refresh:{status:'blocked-no-runtime-read-credential'}};
 const census={checkedAt:'2026-11-13T00:00:00Z',pagination:{exhausted:true},projects:[{id:'a',name:'A'},{id:'a',name:'A'},{id:'b',name:'B'}]};
 const r=applyProjectCensus(view,census,Date.parse(census.checkedAt));assert.equal(r.lastVerifiedProjectCount,2);assert.equal(r.checkedAt,view.checkedAt);assert.equal(r.canonicalProductionSiteCount,86);assert.deepEqual(r.projects,view.projects);assert.equal(r.refresh.status,view.refresh.status);assert.equal(applyProjectCensus(view,{...census,pagination:{}},Date.now()),view);assert.equal(applyProjectCensus({...view,checkedAt:'2026-11-14T00:00:00Z'},census).projectCensusCheckedAt,undefined);
});
