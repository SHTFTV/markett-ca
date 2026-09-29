# Gas and heating content batch — 29 September 2026

Ten prepared article drafts are stored here for five sites, two per site. They are not published pages and are excluded from Vercel output with the existing `docs/` exclusion. Two additional GasFitter.ca articles are integrated in [SHTFTV/gasfitter-ca PR 3](https://github.com/SHTFTV/gasfitter-ca/pull/3), which remains a draft for review.

| Site | Drafts | Publishing status |
|---|---|---|
| Canada Gas | Utility/contractor project checklist; pre-upgrade energy evaluation | Exact domain and source unconfirmed |
| BeWarm.ca | Cold rooms; comparing heating quotes | Source repository/CMS unconfirmed |
| HotWaterTankInstallations.ca | First-hour rating; replacement handover | Singular/plural domain and source mapping need confirmation |
| CanadaGasFireplace.ca | Service visit; quote comparison | Observed plural domain serves content; publishing source unconfirmed |
| NaturalGasGenerators.ca | Load list; handover | Public site observed; publishing source unconfirmed |

Each draft retains its authoring agent's metadata and primary-source links. Review those sources and the site's actual content before publishing. Existing public/static checks cannot prove absence of duplicate topics across an inaccessible CMS or client-rendered archive.

## Audit evidence and limits

The source discovery pass inspected the connected GitHub inventory and 78 Vercel projects without establishing publishing sources for these five sites. The fireplace/generator agent observed a current public plural fireplace site and generator site on Netlify; no hosting, domain or repository changes were made. Domain candidates in the runner are not asserted ownership or alias mappings.

The read-only runner in `scripts/agents/gas-content-audit.mjs` passed its offline fixtures together with the existing portfolio checks: 8 tests passed. Its live attempt in this workspace returned `getaddrinfo EAI_AGAIN` for all seven configured domain candidates. That is an unavailable network observation, not proof those sites are offline. Canada Gas made no request because its domain is unknown. No forms or emails were submitted, and no content was automatically generated or published by the runner.

Next execution should occur in an environment with working public DNS, then the source/CMS mapping and topic review can be completed. There is no new schedule, authoring pipeline, merge or deployment in this change.
