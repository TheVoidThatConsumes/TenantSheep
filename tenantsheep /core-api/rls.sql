-- What RLS enforcement at the DATABASE layer looks like, as a contrast to
-- this app's default (app-layer WHERE clause only -- see CHALLENGE 1 and
-- CHALLENGE 2, both of which bypass that application-layer check entirely).
-- Not applied automatically. Run manually against the postgres container to
-- see the difference:
--   docker compose exec postgres psql -U tenantsheep -d tenantsheep_create -f /path/to/rls.sql

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON projects
  USING (org_id = current_setting('app.current_org_id')::int);

-- The application would need to SET app.current_org_id per request before
-- querying, e.g.:
--   SET app.current_org_id = '1';
--
-- With this policy active, CHALLENGE 1 (raw SQL injection) and CHALLENGE 2
-- (missing auth dependency) both stop working as cross-tenant reads --
-- not because the application code got fixed, but because the database
-- itself refuses to return rows outside the current tenant regardless of
-- what the query asks for. That's the exact distinction SoW section 4.2
-- draws between application-layer and database-layer enforcement.
