// Alternates are audit candidates, not verified aliases or publishing targets.
export const gasSites = [
  { name: 'Canada Gas', domains: [], mapping: 'unknown-domain' },
  { name: 'GasFitter.ca', domains: ['gasfitter.ca'], mapping: 'verified-source', verifiedSource: 'SHTFTV/gasfitter-ca', contentPullRequest: 'https://github.com/SHTFTV/gasfitter-ca/pull/3' },
  { name: 'BeWarm.ca', domains: ['bewarm.ca'], mapping: 'publishing-repository-review-required' },
  { name: 'HotWaterTankInstallations.ca', domains: ['hotwatertankinstallations.ca', 'hotwatertankinstallation.ca'], mapping: 'alternate-domain-review-required' },
  { name: 'CanadaGasFireplace.ca', domains: ['canadagasfireplace.ca', 'canadagasfireplaces.ca'], mapping: 'alternate-domain-review-required' },
  { name: 'NaturalGasGenerators.ca', domains: ['naturalgasgenerators.ca'], mapping: 'publishing-repository-review-required' },
];
