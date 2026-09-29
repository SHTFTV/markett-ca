# Gas and heating content batch audit

Run with Node 22, without dependencies, credentials, publishing or extra schedules:

```sh
node --test scripts/agents/*.test.mjs
node scripts/agents/gas-content-audit.mjs /tmp/markett-gas-content-audit
```

The six-site manifest requests two posts per site. Canada Gas has no guessed domain. The singular/plural hot-water and fireplace domains are separate candidates pending verification, not asserted aliases. GasFitter.ca has a separately verified source and two integrated articles in its linked draft PR. Other publishing sources remain unverified. Article progress is not re-assessed by this crawler; successful HTTP does not identify an authorized publishing repository.

The runner reuses the existing public-only, IP-pinned request transport, 10-second DNS/HTTP timeouts and 512 KiB response cap. Three domains run concurrently. For each candidate it observes the homepage and up to five discovered same-domain blog/news/article/guide/resource URLs, records titles, actual links and redirects, and reports HTTP errors separately from network failures. It does not request query-bearing content links or off-domain redirects. It never submits forms, sends mail, verifies delivery or publishes anything.

The JSON report is evidence for an editorial review, not a complete index or a finished-site assertion. Static HTML extraction cannot see client-rendered links, and bounded crawls miss unlinked articles and sitemaps. A missing link is not proof an article is absent. Compare candidate topics against the actual source/CMS before writing, then review factual sources, service claims, metadata and canonical links before publishing through the verified source. Test content routes and indexes after integration.

Reports default outside the repository; keep reports outside Vercel's public output. Existing `.vercelignore` excludes scripts and docs. No workflow or schedule is added. Repository mapping, contact routing, post drafting, approval and publishing remain separate work stages.
