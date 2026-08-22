---
name: api-response-shape
description: Standard API response shape and error-handling pattern in this Express backend
metadata:
  type: project
---

Routes return JSON of shape `{ success: boolean, message: string }` (sometimes with extra data fields).

Error handling in route handlers tends to respond with HTTP 200 + `{ success: false, message }` rather than proper 4xx/5xx status codes, and several handlers both send a response AND call `next(err)` in the catch block (double-handling risk).

**How to apply:** When reviewing routes, flag missing status codes (auth failures should be 401/403, not-found 404) but recognize the existing `{ success, message }` convention is established — suggest status codes as warnings, not as inconsistency with project style. Watch for the `res.json(...)` followed by `next(err)` double-response anti-pattern.
