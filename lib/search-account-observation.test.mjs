import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSearchAccountObservation, accountReadFreshness} from './search-account-observation.mjs';
const checkedAt = '2026-11-14T01:50:00Z';
const input = {rows: [
 {siteUrl:'sc-domain:example.com',readable:true,activated:false},
 {siteUrl:'https://www.example.com/',readable:true,activated:true},
 {siteUrl:'https://other.org/',readable:false,activated:false}
]};
test('counts properties, domains, readiness and app activation separately',()=>{
 const r=buildSearchAccountObservation(input,{checkedAt,ownedDomains:['example.com']});
 assert.equal(r.counts.totalProperties,3);assert.equal(r.counts.uniqueDomains,2);
 assert.equal(r.counts.verifiedProperties,2);assert.equal(r.counts.uniqueVerifiedDomains,1);
 assert.equal(r.counts.verifiedOwnedDomains,1);assert.equal(r.counts.activatedProperties,1);
 assert.equal(r.counts.duplicateVerifiedPropertyEntries,1);assert.equal(r.counts.notVerifiedProperties,1);
});
test('successful read supersedes payment failure without deleting history',()=>{
 const r=buildSearchAccountObservation(input,{checkedAt});
 assert.equal(accountReadFreshness(r,Date.parse(checkedAt)).latestConnectorRefresh.status,'read-success');
 assert.equal(r.priorConnectorFailure.status,'payment_required');assert.equal(r.priorConnectorFailure.historical,true);
});
test('old and future evidence cannot become fresh because the dashboard assembled now',()=>{
 const r=buildSearchAccountObservation(input,{checkedAt});
 assert.equal(accountReadFreshness(r,Date.parse(checkedAt)+86400001).freshGoogleAccountCount,null);
 assert.equal(accountReadFreshness(r,Date.parse(checkedAt)-300001).freshGoogleAccountCount,null);
});
test('failed or partial reads do not replace retained account observations',()=>{
 for(const flag of ['warning','notConfigured','reauthRequired']) assert.throws(()=>buildSearchAccountObservation({...input,[flag]:true},{checkedAt}));
});
test('duplicate rows and missing readiness fail closed',()=>{
 assert.throws(()=>buildSearchAccountObservation({rows:[input.rows[0],input.rows[0]]},{checkedAt}));
 assert.throws(()=>buildSearchAccountObservation({rows:[{siteUrl:'https://example.com/'}]},{checkedAt}));
});
