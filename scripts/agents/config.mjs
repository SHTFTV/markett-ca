import {registry} from '../../api/registry-data.js';
// Domains mapped from the audited batch repositories and MarkEtt homepage.
// The insulation guide repository has no verified domain and is excluded pending mapping.
export const batches = Object.freeze({
  insulation: ['sprayinsulations.ca', 'monoglassinsulation.com'],
  mechanical: ['hvacr.tv', 'plumbingdrainage.ca', 'gasfitter.ca', 'rentafurnace.com'],
  interiors: ['framers.io', 'drywallers.io', 'steelstud.ca', 'steelstudcontractors.com'],
});
export function selectDomains(batch) {
  if (batch === 'all') return [...new Set(registry.filter(r=>!r.excluded).map(r=>r.domain))];
  if (!Object.hasOwn(batches, batch)) throw new Error(`Unknown batch: ${batch}. Choose all, ${Object.keys(batches).join(', ')}`);
  return [...batches[batch]];
}

