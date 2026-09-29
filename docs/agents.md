# MarkEtt portfolio audit runner

This dependency-free Node 22 runner checks public website and DNS observations in three trade batches. It is an operational checker, not an AI publishing agent. It does not modify websites, send email, verify mailbox ownership, prove lead delivery, or incur LLM/API fees. GitHub Actions minutes/storage are subject to your plan.

## Run

```sh
node --test scripts/agents/audit.test.mjs
node scripts/agents/audit.mjs all /tmp/markett-portfolio-audit
node scripts/agents/audit.mjs insulation /tmp/markett-insulation-audit
```

Accepted batches: `all`, `insulation`, `mechanical`, `interiors`. The checked-in config is the only domain input. Domains are mapped from the audited batch repositories and MarkEtt's homepage; ownership and completeness still need verification. The insulation guide repository has no verified deployment domain and is excluded pending mapping. Add confirmed domains by editing `scripts/agents/config.mjs` in reviewable code changes.

Each domain gets HTTP status, same-domain redirects, page title, visible mailto destinations, MX records, and SPF records. Redirects to other domains are recorded but not followed. Requests pin a resolved public IP, retain TLS hostname verification, cap HTML at 512 KiB, and time out after 10 seconds. Three sites run concurrently. Private/reserved network destinations are blocked. DNS failures are recorded as unknown, not as proof of missing email.

A successful run means the audit completed; it does not mean every site passed. Inspect per-site errors and HTTP status in JSON/Markdown. Empty mailto lists do not mean no contact form exists. MX/SPF presence does not prove forwarding, inbox delivery, replies, authentication alignment, or working submissions. Delivery checks require a separately authorized test with the destination owner.

## Scheduling and report access

The workflow runs on relevant pushes to `main`, daily at 14:23 UTC and manually from Actions → Public portfolio audit → Run workflow. GitHub scheduled workflows use the default branch; committing these files to another branch alone does not enable the schedule. GitHub can delay runs and disable schedules in inactive public repositories.

The workflow has read-only repository permissions, no provider keys, and writes reports to the runner's temporary directory. Reports are uploaded as workflow artifacts for 14 days; nothing is committed or deployed. **Artifacts are not a private dashboard. On public repositories they may be available to users with repository read access.** Include only public observations; never include customer data, mailbox credentials, API keys, lead records, or private infrastructure details. A truly private command center needs separate authenticated storage with server-side access controls.

This repo's Vercel output directory is `.`. Keep `scripts/`, `docs/`, `.github/`, and all report directories excluded from deployment via `.vercelignore`; preferably use a dedicated public output directory as the project grows. The default report location is outside the repository. Do not put audit reports into a publicly served directory.

## Follow-up work

HTTP success alone cannot classify a site as finished. Content review, forms, email delivery, and actual backend jobs remain separate checks. This runner supplies evidence for that work and a repeatable baseline, without claiming autonomous fixes or publishing.
