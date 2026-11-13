# Independent public curator discovery

This worker collects public metadata for the user-approved saved GSC fifteen plus
Minews, InsuranceBrokers and FinancialAdvisors. It cannot publish, change approval
state, use model/image APIs, send alerts, or write production repository files.

Each source has its own exception boundary, retry state and receipt. Each result is
committed to SQLite immediately. Publication holds have a separate table and never
gate discovery. Canonical source URLs deduplicate per site across restarts; discovering
an item never marks it published. Changed source configurations reset source backoff.

The isolated branch push workflow runs tests and real collection with contents:read
and actions:read only. It restores the latest same-branch state artifact and uploads
new state plus eighteen per-site handoffs. Artifacts expire after 30 days; no claim
of indefinite persistence follows. A missing artifact is explicitly reported as a new
collection, not a successful continuation. The branch serializes runs.

Current activation is branch-push only. This does not establish a native schedule or
unattended publication. Default-branch integration belongs to the existing sole
coordinator owner and must preserve the rejected production/database/scheduler actions.
Do not merge or activate by treating a read-only discovery success as publishing approval.

Source metadata and identity matches are discovery evidence, never credentials or
reuse rights. The exact source article, byline, claims, sponsorship, live duplicate
history, current site policy and each media asset require writer review. HTML adapters
only inspect explicit same-publisher paths and use real source metadata dates.

Run tests: `python3 -m unittest discover -s scripts/curator-isolation -p test_runner.py -v`.

Provenance: collector.py was copied from the existing Mining source collector in
the authorized portfolio source-collection checkout; no existing sole-writer working
directory was modified. New runner, HTML adapter and tests are isolated here.
