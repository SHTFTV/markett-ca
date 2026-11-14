export function normalizeSearchProperty(value) {
  if (typeof value !== 'string') throw Error('Missing Search Console property');
  const property = value.trim();
  const domain = property.startsWith('sc-domain:')
    ? property.slice(10).toLowerCase()
    : new URL(property).hostname.toLowerCase();
  if (!domain || domain.includes('/') || domain.includes('@')) throw Error('Invalid property domain');
  return domain.replace(/^www\./, '');
}

export function buildSearchAccountObservation(input, {checkedAt, ownedDomains = [], previousObservation = null} = {}) {
  const rows = input?.sites ?? input?.rows;
  if (!Array.isArray(rows) || !Number.isFinite(Date.parse(checkedAt))) throw Error('Dated account rows required');
  if (input.warning || input.notConfigured || input.reauthRequired) throw Error('Account read is incomplete');
  const seen = new Set();
  const properties = rows.map((row, index) => {
    const property = row.siteUrl;
    normalizeSearchProperty(property);
    if (seen.has(property)) throw Error('Duplicate property row');
    if (typeof row.readable !== 'boolean' || typeof row.activated !== 'boolean') throw Error('Readiness evidence required');
    seen.add(property);
    return {property, verified: row.readable, readable: row.readable, activated: row.activated,
      permissionLevel: row.permissionLevel ?? null, gscScope: row.gscScope ?? null, index};
  });
  const verified = properties.filter(row => row.verified);
  const verifiedDomains = [...new Set(verified.map(row => normalizeSearchProperty(row.property)))].sort();
  const allDomains = new Set(properties.map(row => normalizeSearchProperty(row.property)));
  const owned = new Set(ownedDomains);
  return {
    checkedAt, source: 'https://search.google.com/search-console',
    evidenceSource: 'GSC Wizard list_sites; connected Google Search Console account',
    coverage: 'Returned account properties; property counts are not domain counts, indexing, or complete portfolio verification.',
    connectorRead: {checkedAt, status: 'success', subscriptionStatus: 'active', plan: 'starter',
      scope: 'Full Search Console connection; property readiness remains separate.'},
    counts: {totalProperties: properties.length, verifiedProperties: verified.length,
      notVerifiedProperties: properties.filter(row => !row.verified).length,
      uniqueDomains: allDomains.size, uniqueVerifiedDomains: verifiedDomains.length,
      verifiedOwnedDomains: verifiedDomains.filter(domain => owned.has(domain)).length,
      verifiedDomainsOutsideRegistrarUnion: verifiedDomains.filter(domain => !owned.has(domain)),
      duplicateVerifiedPropertyEntries: verified.length - verifiedDomains.length,
      activatedProperties: properties.filter(row => row.activated).length,
      notActivatedProperties: properties.filter(row => !row.activated).length},
    verifiedDomains, properties, previousObservation,
    priorConnectorFailure: {checkedAt: '2026-11-12T01:59:26.295656+00:00', status: 'payment_required',
      historical: true, supersededBy: checkedAt},
    note: 'Ownership/read access and app activation are separate from sitemap acceptance, indexing, publishing and operational completion.'
  };
}

export function accountReadFreshness(inventory, now = Date.now()) {
  const read = inventory?.connectorRead;
  const age = now - Date.parse(read?.checkedAt);
  const fresh = read?.status === 'success' && Number.isFinite(age) && age >= -300000 && age <= 86400000;
  return {freshGoogleAccountCount: fresh ? inventory.counts.totalProperties : null,
    latestConnectorRefresh: {checkedAt: read?.checkedAt ?? inventory?.checkedAt ?? null,
      status: fresh ? 'read-success' : read?.status === 'success' ? 'stale-read' : 'unverified',
      source: inventory?.evidenceSource ?? inventory?.source ?? null,
      meaning: fresh ? 'Successful dated connected-account read; properties are not unique domains or indexed sites.'
        : 'A current successful connected-account read is not available; retained ownership evidence is separate.'}};
}
