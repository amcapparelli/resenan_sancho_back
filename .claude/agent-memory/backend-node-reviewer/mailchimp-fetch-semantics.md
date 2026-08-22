---
name: mailchimp-fetch-semantics
description: Mailchimp integration conventions and the fetch (vs superagent) non-2xx trap in the 4 Mailchimp route files
metadata:
  type: project
---

Mailchimp is called from 4 route files: `routes/login.js`, `routes/suscribeAuthor.js`, `routes/deleteUser.js`, `routes/registerReviewer.js`. Auth is `Basic base64('anystring:' + MAIL_CHIMP_API_KEY)`.

Conventions to preserve:
- **HTTP 400 is treated as SUCCESS** in `suscribeAuthor.js` and `deleteUser.js` (Mailchimp returns 400 for "already a member"). Check pattern: `status < 300 || status === 400`. Note: `registerReviewer.js` POST/PUT do NOT follow this (they use only `>= 200 && < 300`) — a pre-existing inconsistency.

fetch migration trap (Node 22 global fetch replaced superagent):
- **fetch does NOT throw on non-2xx**; superagent did. Any place that previously relied on a GET throwing (e.g. a 404 for a non-existent member jumping to catch) will now fall through.
- **On a non-2xx Mailchimp response the JSON body's `status` field is a numeric HTTP code** (e.g. 404), NOT a subscription string. Never persist or forward `body.status`/`member.status` without an `.ok` guard. `registerReviewer.js` PUT was flagged for exactly this: it reads `member.status` from a GET that can 404 and puts it back as the subscription status.
- `login.js` does this correctly: try/catch + `if (response.ok)` before reading `response.json()`, so login is never blocked and no numeric status leaks.

**How to apply:** When reviewing any fetch call against Mailchimp, verify `.ok`/status is checked before reading a field out of the body, and confirm the 400-as-success semantic is preserved where it applies. See [[api-response-shape]] for the broader "200 + {success:false}" and raw-error-leak (`res.json(error)`) patterns in these same handlers.
