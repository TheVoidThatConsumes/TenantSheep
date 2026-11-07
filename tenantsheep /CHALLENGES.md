# TenantSheep Challenges

No spoilers below — full walkthroughs are in `SOLUTIONS.md`, use it when
stuck or short on time, not as the first move.

## distro-api

1. **Cross-tenant campaign search.** `GET /api/campaigns/search` takes a
   `filter` query param. Find a filter that returns campaigns belonging to
   an org you're not logged in as.
2. **Campaign detail IDOR.** `GET /api/campaigns/:id` — can you view a
   campaign belonging to a different org just by changing the ID?
3. **The legacy preview route.** `GET /api/campaigns/:id/preview-legacy`
   trusts a bearer token without doing what you'd expect a token check to
   do. Forge one claiming whatever `orgId` you like.
4. **Logo import SSRF.** `POST /api/campaigns/:id/logo-from-url` fetches
   a URL server-side. Where else on the network might that reach?
5. **Asset download.** `GET /api/assets/download?file=...` — is `file`
   contained to the assets directory?

## create-api

1. **Project search.** `GET /api/projects/search?q=...` — the query term
   ends up somewhere it shouldn't. Can you make it return another org's
   projects?
2. **A route that forgot something.** One project-detail route doesn't
   ask who you are at all.
3. **Updating a project.** `PUT /api/projects/:id` accepts a JSON body.
   Does it check which fields you're allowed to change?
4. **The export task.** `POST /api/projects/:id/export` queues a Celery
   task. What happens if you could queue that task yourself, directly,
   with different arguments than the API would ever send?
5. **Listing projects twice, as two different tenants, quickly.** Pay
   attention to timing.
6. **Tenant isolation, structurally.** Where in the stack is tenant
   isolation actually enforced — and what happens if you remove the one
   thing enforcing it? (`rls.sql` has the contrasting "what if" version —
   don't read it until after you've thought about this one.)

## Infra

- **nginx.conf** has at least one omission relevant to request smuggling.
  Spot it by reading the config; live exploitation against this exact
  setup isn't guaranteed reliable, use PortSwigger's labs for the
  hands-on mechanics.

## distro-api — stretch items

6. **Invite a teammate.** `POST /api/team/invite` takes `inviteeEmail` and
   `inviterName`. Can you make the email actually reach a second, unintended
   recipient?
7. **Same endpoint, different field.** `inviterName` ends up in the email
   body. What happens if it isn't plain text?
8. **Update your own profile.** `PUT /api/profile/me` — what fields does it
   let you change that it shouldn't?
9. **A public status page.** `GET /api/public/status` needs no token at
   all. It decides which org to show you based on something in the request
   you control.
10. **Asset upload/download links.** `POST /api/storage/:id/upload-url` and
    `GET /api/storage/download-url` hand back a MinIO presigned URL. How
    long is it valid, and how guessable is the object key?

## create-api — stretch item

7. **Compare `/health` with `DEBUG=true` vs `DEBUG=false`** (toggle it in
   `docker-compose.yml` and restart). What else changes besides that flag?
