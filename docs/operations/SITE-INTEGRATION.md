# Site-owner integration and Command Center evidence

The canonical complete-site standard is [Portfolio definition of DONE v2](../completion/OPERATING-STANDARD.md). Start there, then use `docs/completion/contract.template.json`, `contract.schema.json`, `evidence.schema.json` and `site-package.template.json`. Do not create another standard, bot or timer. LawyersAdvice.co and every other new build use the same standard with their own sourced audience, editorial angle and approved SOT.

The executable authority is `lib/operational-completion.mjs`. `lib/site-job-standard.mjs` loads the latest approved SOT on each real job and retains its exact version/hash. Bind its store to the existing site's durable store; call its guards inside the existing sole-writer lease/commit boundary. Adopt `lib/site-build-gate.mjs` before substantial dependent work. `lib/page-quality-standard.mjs` and `lib/four-role-evidence.mjs` enforce source/media/page quality and the four independent roles. A template or local test is not adoption.

Per-site contracts recover the real audience, angle, approved sources, cadence/intake rules, formats, imagery/provenance, internal links, external attribution and network power-partner relationships. Preserve legacy URLs/history. Link only genuinely relevant partners; no invented affiliations. Record B2C service/editorial experience separately from B2B guest submissions and marketing/distribution flows. Existing approved branding and actual promised product flows govern placement. AEO/SEO/GEO/LLM readiness follows the canonical readable-HTML, factual source, canonical/schema, discovery and page-specific preview requirements; it does not promise rankings or inclusion.

Keep saved, enabled, deployed and verified states separate. Four Roles means the existing worker, actual desktop/phone visual checker, supervisor and independent silence watchdog, each loading its own SOT. Record actual cloud runs, publisher/deployment source identities, durable receipts and independent delivered alerts. No duplicate writer or schedule. Native 1600×900 features require sufficient original pixels and honest source credit; generated fallback must be approved and clearly labelled.

## Production counts

`lib/vercel-inventory.mjs` reads all current project pages, every project's production domains and READY production deployment. It never carries old domain mappings onto a new project list. `api/vercel-inventory.js` checks bounded public HTTPS routes using the existing DNS-pinned SSRF guard. `lib/production-scope.mjs` requires the actual HTTP200 Vercel route for the operational denominator. Raw projects, READY attached sites and production routes are separately dated. Other registry records remain in the migration selector with all prior fields/history intact.

After EACH site touch, the existing search owner records separate Google/Bing ownership, sitemap submission/acceptance/fetch and actual index evidence. `production-search-inventory.json` contains only public operational observations. Preserve newer existing per-site observations and all historical receipts. Yellow ownership/setup waiting does not block launching or listing a site. Missing credentials/API errors are concrete access/runtime failures, never described as provider approval. The reader's Refresh button reloads saved evidence; it is not a provider poll.

## Cutover and deletion handoff

The sole migration owner records an actual provider-confirmed receipt in `migration-receipts.json` using `scripts/record-migration-receipt.mjs`. This Git ledger is durable. The next deployment/read updates counters per unique domain/kind. Queued work, a new project, deletion plans and Vercel routing alone never count as Netlify deletion. Every entry needs its actual evidence URL, check timestamp and explicit verified outcome. Preserve the provider receipt outside this public file if it contains private details. Do not put credentials, DNS tokens, raw logs or private SOPs here.

Cutover receipts need `kind: vercel-cutover`, actual `httpStatus:200`, `vercelRouteVerified:true`, `productionReady:true`. Deletion receipts need `kind:netlify-deletion`, `providerAbsent:true`. Required shared fields: `id`, `domain`, `checkedAt`, `evidenceUrl`, `verified:true`. The ledger is reporting only and never authorizes DNS or deletion. Commit after the sole owner actually verifies the operation. No deletion receipt has been inferred from this repair.

## Refresh gate

The existing single 15-minute Vercel cron is preserved. An approved server-only API credential is required; chat/browser authorization is not cloud runtime authentication. Team personal access tokens grant read/write access and must not be described as read-only. No credential is created or scope expanded by these changes. Until approved authentication, native execution, durable refresh receipts and independent alert delivery are proved, those states remain blocked/unverified. The deployed dated Git snapshot is durable; module cache is not durable execution history.

## Valuation and metrics

Preserve existing sourced numeric fields and dated history. Valuation needs currency, actual as-of date, attributed appraisal/comparables and methodology. Operating valuation additionally needs verified traffic, leads and revenue with reporting windows. Historic portfolio projections are not current appraisals. Missing or private owner-only figures remain unknown with a reason, never zero and never republished as public financial data without authorization.
