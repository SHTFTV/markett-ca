-- Additive private monitor storage. No existing site, auth, publisher or scheduler policy is changed.
CREATE SCHEMA IF NOT EXISTS portfolio_monitor;
REVOKE ALL ON SCHEMA portfolio_monitor FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS portfolio_monitor.incidents (
 id text PRIMARY KEY, domain text NOT NULL, status text NOT NULL CHECK(status IN ('open','recovered')),
 synthetic boolean NOT NULL DEFAULT false, first_seen timestamptz NOT NULL, last_seen timestamptz NOT NULL, payload jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS portfolio_monitor.runs (
 id uuid PRIMARY KEY, observed_at timestamptz NOT NULL, synthetic boolean NOT NULL DEFAULT false, payload jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS portfolio_monitor.notifications (
 id uuid PRIMARY KEY, run_id uuid NOT NULL REFERENCES portfolio_monitor.runs(id), synthetic boolean NOT NULL DEFAULT false,
 status text NOT NULL CHECK(status IN ('pending','blocked','delivered')), created_at timestamptz NOT NULL DEFAULT now(), payload jsonb NOT NULL,
 delivery_ref text, acknowledgement_ref text, error_code text
);
CREATE TABLE IF NOT EXISTS portfolio_monitor.delivery_attempts (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, notification_id uuid NOT NULL REFERENCES portfolio_monitor.notifications(id),
 attempted_at timestamptz NOT NULL DEFAULT now(), outcome text NOT NULL, delivery_ref text, error_code text
);
ALTER TABLE portfolio_monitor.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_monitor.runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_monitor.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_monitor.delivery_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA portfolio_monitor FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA portfolio_monitor TO markett_event_runtime;
GRANT SELECT,INSERT,UPDATE ON portfolio_monitor.incidents,portfolio_monitor.notifications TO markett_event_runtime;
GRANT SELECT,INSERT ON portfolio_monitor.runs,portfolio_monitor.delivery_attempts TO markett_event_runtime;
GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA portfolio_monitor TO markett_event_runtime;
CREATE POLICY runtime_incidents ON portfolio_monitor.incidents TO markett_event_runtime USING(true) WITH CHECK(true);
CREATE POLICY runtime_runs ON portfolio_monitor.runs TO markett_event_runtime USING(true) WITH CHECK(true);
CREATE POLICY runtime_notifications ON portfolio_monitor.notifications TO markett_event_runtime USING(true) WITH CHECK(true);
CREATE POLICY runtime_delivery_attempts ON portfolio_monitor.delivery_attempts TO markett_event_runtime USING(true) WITH CHECK(true);
