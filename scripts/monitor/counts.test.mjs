import test from 'node:test';import assert from 'node:assert/strict';import {countDefinitions,frontendObservation} from '../../lib/portfolio-count-definitions.mjs';import {registry} from '../../api/registry-data.js';import {searchEvidence} from '../../api/search-evidence.js';
import {accountSearchInventory} from '../../api/account-search-inventory.js';

const accountReadAt=Date.parse(accountSearchInventory.connectorRead.checkedAt);
const accountReadMaxAge=86400000;

test('seven actual retained verified domains are registered once; ownership48/sitemap47 remains separate from a stale account read/indexing',()=>{assert.equal(registry.length,205);assert.equal(new Set(registry.map(r=>r.domain)).size,205);const d=countDefinitions(registry,searchEvidence,{},accountReadAt+accountReadMaxAge+1);assert.equal(d.search.retainedOwnershipVerified,48);assert.equal(d.search.retainedSitemapSuccess,47);assert.deepEqual(d.search.unmappedVerifiedDomains,[]);assert.equal(d.search.freshGoogleAccountCount,null);assert.equal(d.search.latestConnectorRefresh.status,'stale-read');assert.equal(d.search.indexedSites,null);for(const name of ['hibarinsulation.com','justdoors.co','logcabins.ltd','lsfencingandmetalwork.com','monoglassinsulation.com','weddingsaas.com','wnpd.ca']){const r=registry.find(x=>x.domain===name);assert.equal(r.workerAssigned,false);assert.equal(r.registrationEvidence.newlyBuilt,false);assert.equal(r.gsc.checkedAt,'2026-11-11T06:07:08.916Z');}});

test('account-read freshness uses the supplied clock and expires after 24 hours without changing retained evidence',()=>{
 assert.ok(Number.isFinite(accountReadAt),'the account observation must have a dated connector read');
 assert.equal(accountSearchInventory.connectorRead.status,'success');
 for(const now of [accountReadAt,accountReadAt+accountReadMaxAge]){
  const d=countDefinitions(registry,searchEvidence,{},now);
  assert.equal(d.search.freshGoogleAccountCount,accountSearchInventory.counts.totalProperties);
  assert.equal(d.search.latestConnectorRefresh.status,'read-success');
  assert.equal(d.search.latestConnectorRefresh.checkedAt,accountSearchInventory.connectorRead.checkedAt);
  assert.equal(d.search.retainedOwnershipVerified,48);
  assert.equal(d.search.retainedSitemapSuccess,47);
  assert.equal(d.search.indexedSites,null);
  assert.equal(d.search.indexedPages,null);
 }
 const stale=countDefinitions(registry,searchEvidence,{},accountReadAt+accountReadMaxAge+1);
 assert.equal(stale.search.freshGoogleAccountCount,null);
 assert.equal(stale.search.latestConnectorRefresh.status,'stale-read');
 assert.equal(stale.search.latestConnectorRefresh.checkedAt,accountSearchInventory.connectorRead.checkedAt);
 assert.equal(stale.search.retainedOwnershipVerified,48);
 assert.equal(stale.search.retainedSitemapSuccess,47);
 assert.equal(stale.search.indexedSites,null);
 assert.equal(stale.search.indexedPages,null);
});
test('DNS failure and an inventory record remain unknown; confirmed not-live needs positive evidence',()=>{const now=Date.parse('2026-11-12T02:00:00Z');assert.equal(frontendObservation({httpCheck:{at:new Date(now).toISOString(),httpStatus:null},build:{status:'unknown'}},now).state,'unknown');assert.equal(frontendObservation({build:{status:'genuinely-unbuilt',checkedAt:new Date(now).toISOString()}},now).state,'not-live');assert.equal(frontendObservation({httpCheck:{httpStatus:200,at:new Date(now).toISOString()},build:{status:'built-and-live',checkedAt:new Date(now).toISOString()}},now).state,'live');});
