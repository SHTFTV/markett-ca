-- Additive coordinator-only public-evidence queue. No site tables, held registry writes or private flows are changed.
CREATE SCHEMA IF NOT EXISTS portfolio_rollout;
REVOKE ALL ON SCHEMA portfolio_rollout FROM PUBLIC, anon, authenticated;
CREATE TABLE portfolio_rollout.state (
 key text PRIMARY KEY CHECK(key IN ('queue','watchdog')), payload jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE portfolio_rollout.runs (
 id uuid PRIMARY KEY, kind text NOT NULL CHECK(kind IN ('coordinator','watchdog')), payload jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE portfolio_rollout.state ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_rollout.runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA portfolio_rollout FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA portfolio_rollout TO markett_event_runtime;
GRANT SELECT,INSERT,UPDATE ON portfolio_rollout.state,portfolio_rollout.runs TO markett_event_runtime;
CREATE POLICY rollout_state_runtime ON portfolio_rollout.state TO markett_event_runtime USING(key IN ('queue','watchdog')) WITH CHECK(key IN ('queue','watchdog'));
CREATE POLICY rollout_runs_runtime ON portfolio_rollout.runs TO markett_event_runtime USING(kind IN ('coordinator','watchdog')) WITH CHECK(kind IN ('coordinator','watchdog'));
