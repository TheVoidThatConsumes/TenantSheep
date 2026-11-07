# TenantSheep

A deliberately vulnerable two-service SaaS, modeled on a real multi-tenant
pentest scope rather than built around unrelated CWEs. Two services, same
architectural split as the kind of two-stack SaaS this app is practice for:

- **distro-api** — Node / Express / Mongoose / MongoDB
- **create-api** — FastAPI / SQLAlchemy / PostgreSQL / Celery / Redis

16 deliberate vulnerabilities across the two services. See `CHALLENGES.md`
for the list without spoilers, `SOLUTIONS.md` for full walkthroughs.

## Quickstart

```bash
docker compose up --build -d
docker compose exec distro-api node seed.js
docker compose exec create-api python seed.py
```

Services:
- distro-api: http://localhost:4000
- create-api: http://localhost:8000 (interactive docs at /docs)
- nginx (fronting both + the web UI): http://localhost:8080 — the app UI is
  at `/`, a raw API console (with a form for pasting forged JWTs) is at
  `/console.html`, and the two APIs are reverse-proxied at `/distro/` and
  `/create/`
- MinIO console: http://localhost:9001 (tenantsheep / tenantsheep123)
- decoy metadata service: http://localhost:1338 (SSRF target, fake data only)

To compare staging vs. "production" posture on create-api, set `DEBUG: "false"`
for the `create-api` service in `docker-compose.yml` and `docker compose up -d --build create-api`.

Seeded logins (same two tenants in both services):

| Email | Password | Org |
|---|---|---|
| alice@acme.test | Password123! | Acme Media |
| bob@borealis.test | Password123! | Borealis Co |

## A note on what's verified vs not

Both services were functionally tested during the build: create-api's full
HTTP flow (login, the SQL injection, the missing-auth route, mass assignment)
was run end-to-end against a live SQLite database, and the Celery task's
missing-tenant-check logic was confirmed directly. distro-api's dependencies
install cleanly and every file passes a syntax check, but it couldn't be
run end-to-end against a live MongoDB in the environment this was built in
— that one gets its first real run when you bring up `docker compose`
yourself. If something doesn't behave as described, that's the most likely
place to look first.

## Safety

Every vulnerability here is intentional. Decoy secrets only, nowhere real.
Don't deploy this anywhere reachable from the internet, and don't point any
of it at real infrastructure, real credentials, or anyone else's systems.
