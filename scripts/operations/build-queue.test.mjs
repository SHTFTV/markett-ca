import test from 'node:test';import assert from 'node:assert/strict';import {withBuildQueue} from '../../lib/build-queue-reconciliation.mjs';
test('completed and active builds cannot enter available build candidates',()=>{
 const rows=['weddings.io','interiordesigners.io','homestagers.io','customclosets.io','fireproofing.tv','remaining.io','historical.io'].map(domain=>({domain,ownershipScope:domain==='historical.io'?'historical-registry-not-in-current-account-union':'registrar-account-listed',build:{status:'unknown'},automation:'unknown'}));
 const result=withBuildQueue({rows});assert.deepEqual(result.buildQueue.inspectionCandidates.map(r=>r.domain),['remaining.io']);assert.equal(result.buildQueue.confirmedNewBuilds.length,0);assert.equal(result.rows[0].automation,'unknown');assert.equal(result.rows[0].build.status,'built-and-live');assert.deepEqual(result.buildQueue.ownershipUnconfirmed,['historical.io']);
});
