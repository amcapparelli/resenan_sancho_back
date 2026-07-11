# Dependency & Node Version Upgrade Plan

Tracking document for modernizing the Reseñan Sancho backend. Work top-to-bottom: each
phase is independently shippable (its own PR) and leaves the app in a working state.
Check off boxes as you go and record notes/dates in the log at the bottom.

**Target runtime: Node 22 LTS** (from the currently pinned Node 14.18.3).

---

## Current state (baseline, captured 2026-06-18)

| Package        | Declared    | Installed | Latest  | Jump          |
|----------------|-------------|-----------|---------|---------------|
| express        | ~4.16.1     | 4.16.4    | 5.2.1   | **major**     |
| mongoose       | ^5.8.11     | 5.8.11    | 9.7.1   | **4 majors**  |
| stripe         | ^8.51.0     | 8.51.0    | 22.2.1  | **14 majors** |
| jsonwebtoken   | ^8.5.1      | 8.5.1     | 9.0.3   | **major**     |
| bcrypt         | ^5.0.0      | 4.0.1 ⚠️  | 6.0.0   | **major**     |
| nodemailer     | ^6.4.6      | 6.4.6     | 9.0.1   | **3 majors**  |
| jest           | ^25.3.0     | 25.3.0    | 30.4.2  | **5 majors**  |
| supertest      | ^4.0.2      | 4.0.2     | 7.2.2   | **3 majors**  |
| dotenv         | ^8.2.0      | 8.2.0     | 17.4.2  | **9 majors**  |
| http-errors    | ~1.6.3      | 1.6.3     | 2.0.1   | **major**     |
| debug          | ~2.6.9      | 2.6.9     | 4.4.3   | **2 majors**  |
| body-parser    | ^1.19.0     | 1.19.0    | 2.3.0   | major (removable) |
| morgan         | ~1.9.1      | 1.9.1     | 1.11.0  | minor         |
| cors           | ^2.8.5      | 2.8.5     | 2.8.6   | patch         |
| cookie-parser  | ~1.4.4      | 1.4.4     | 1.4.7   | patch         |
| jade           | ~1.11.0     | —         | (use pug) | deprecated  |

### Pre-existing issues to fix along the way (not just version bumps)

- [x] **Phantom dependency** (Phase 0): `routes/login.js` requires `superagent`, which was
  **not** in `package.json` — it resolved only as a transitive dep of `supertest` (a test lib)
  at `3.8.3`. Pinned it as a direct production dependency (`^3.8.3`) to preserve behavior.
  Note: superagent 3.x is deprecated — Phase 7 still tracks replacing it with Node `fetch`.
- [~] **Dependency classification** (Phase 3, partial): `jest` and `supertest` moved to
  `devDependencies`. `body-parser` left in `dependencies` for now — it's only used by code being
  removed in Phase 6, so its removal is tracked there.
- [x] **`jade` is deprecated** (Phase 6): renamed to `pug` in 2016. It was only used by the
  boilerplate `views/` (home + error). Dropped server-side views entirely (this is a JSON API):
  removed the view-engine setup, deleted `views/`, and uninstalled `jade`.
- [x] **`body-parser` is redundant** (Phase 6): `app.js` already uses `express.json()` /
  `express.urlencoded()`. After the placeholder `tests/app.js` was removed in Phase 3 it had
  **zero** code references, so it was uninstalled.
- [x] **Latent bug — error handler is not registered** (Phase 6): `app.js` declared
  `app.use(function (err, req, res) {...})` with only **3 args**. Express only recognizes an
  error handler when it has **4 args** (`err, req, res, next`). As written it was treated as
  normal middleware and never ran on errors. Fixed (now 4 args, responds with JSON), with a
  fail-first regression test (`tests/app.test.js`).
- [x] **Deprecated `Buffer`** (Phase 1): replaced `new Buffer(...)` with `Buffer.from(...)`.
  Found in 4 places, not 1: `routes/login.js`, `routes/deleteUser.js`, and `routes/suscribeAuthor.js` (×2).
- [x] **node_modules / lockfile drift** (Phase 0): installed `bcrypt` (4.0.1) ≠ declared
  (`^5.0.0`), and `package-lock.json` was `lockfileVersion: 1` (npm 6). Resolved by a clean
  reinstall — `bcrypt` now `5.1.1`, lockfile regenerated at `lockfileVersion: 3`, `npm ls` clean.

---

## Phase 0 — Preparation & safety net ✅ (completed 2026-06-18)

- [x] Create branch `chore/dependency-upgrade` off an up-to-date `master` (seed branch was
  already merged into origin/master as PR #29; branched off the refreshed master).
- [x] Record a baseline: `node -v` (v20.20.2), `npm -v` (10.8.2), `npm ls --all` and
  `npm audit` saved to `docs/baseline-deps.txt`; `npm test` passing (2/2 placeholder tests).
- [x] Clean reinstall to resolve drift and regenerate the lockfile with npm 10:
  `rm -rf node_modules package-lock.json && npm install`. Lockfile now `lockfileVersion: 3`.
- [x] Add the missing `superagent` dependency (pinned `^3.8.3`) so a clean install reflects reality.
- [x] `npm audit` baseline: **48 vulnerabilities (6 low, 24 moderate, 12 high, 6 critical)**.
- [x] Smoke test: `npm start` connected to local Mongo (`resenanSancho`); `GET /` and
  `GET /books` both returned `200`. (Noted Mongo driver deprecation warnings —
  `useUnifiedTopology`, `collection.count` — addressed in Phase 5.)

## Phase 1 — Node 22 LTS ✅ (completed 2026-06-18)

- [x] Bump `engines.node` in `package.json` to `>=22 <23`.
- [x] Add `.nvmrc` (`22`) and document `nvm install` / `nvm use` in the README (new Requirements
  + Install & run sections).
- [x] Install/switch local toolchain to Node 22 (`nvm install 22` → v22.23.0, npm 10.9.8) and
  reinstall (`rm -rf node_modules && npm install`). Native `bcrypt` rebuilt and loads under v22.
- [x] Added a GitHub Actions CI workflow (`.github/workflows/ci.yml`) that reads the Node
  version from `.nvmrc` and runs `npm ci && npm test` on push to master / PRs.
- [x] Replace `new Buffer(...)` with `Buffer.from(...)` — see pre-existing issues above (4 sites).
- [x] Smoke test on Node 22: server connected to local Mongo; `GET /` and `GET /books` → `200`;
  `npm test` 2/2 green. (Mongo driver deprecation warnings persist — Phase 5.)

## Phase 2 — Low-risk patches & minors (quick wins) ✅ (completed 2026-06-18)

Bumped together; verified server boots, logs, serves `/` + `/books` (200), and the 404 path.

- [x] `cookie-parser` 1.4.4 → `^1.4.7`
- [x] `cors` 2.8.5 → `^2.8.6`
- [x] `morgan` 1.9.1 → `^1.11.0`
- [x] `debug` 2.6.9 → `^4.4.3` (used in `bin/www`; API compatible — server boots fine)
- [x] `dotenv` 8 → `^17.4.2`. Checked `.env`: no `#` in values (safe from the v15+ inline-comment
  change) and keys trim correctly (`JWT_SECRET ` → `JWT_SECRET`). v17 prints a noisy
  `injected env (12) from .env` line on boot, so added `{ quiet: true }` to both `config()`
  call sites (`lib/connectMongoose.js`, `scripts/seed.js`) — confirmed suppressed.
- [x] `http-errors` 1.6.3 → `^2.0.1` — `createError(404)` path returns 404 with no crash.

## Phase 3 — Test stack + real safety net ✅ (completed 2026-06-19)

The biggest risk in this upgrade is that there are **no tests covering real routes**. Build a
minimal safety net first so later phases have something to validate against.

- [x] Upgrade `jest` 25 → `^30.4.2` and `supertest` 4 → `^7.2.2`; both now in `devDependencies`.
  (supertest 7 pulls its own nested `superagent@10`; `login.js` still uses our pinned top-level
  `superagent@3.8.3` — validating the Phase 0 pin.)
- [x] Added explicit Jest config `"jest": { "testEnvironment": "node" }` in `package.json`.
- [x] Removed the placeholder car/test app (`tests/app.js`, `tests/server.js`,
  `tests/example.test.js`). New tests import the **real** `app.js` with `lib/connectMongoose`,
  `stripe`, the Mongoose models, and `bcrypt` mocked (see `tests/helpers/modelMock.js`).
- [x] Coverage (14 tests, all green): `verifyToken` middleware (`tests/auth.test.js`); `login`
  success/cookie/password-stripping + bad password (`tests/login.test.js`); `register` email
  validation + happy path (`tests/register.test.js`); `registerBook` duplicate + ownership +
  auth (`tests/registerBook.test.js`); `paymentCheckout` auth + promo math + ownership
  (`tests/paymentCheckout.test.js`).
- [x] `npm test` green on Node 22 (14/14); live boot smoke test still connects + serves.

**Bug found & fixed by the safety net:** `login.js` signed the JWT with a *callback* and set the
auth cookie inside it, then called `res.json(...)` on an earlier tick — so the cookie/token were
only delivered when the downstream `Reviewer.findOne` DB call happened to be slower than the sign
callback (timing-dependent in prod, never delivered with the DB mocked). Switched to synchronous
`jwt.sign(...)` so the cookie and `user.token` are set before responding. No API shape change.

## Phase 4 — Auth & security libraries ✅ (completed 2026-06-21)

- [x] `bcrypt` 5 → `^6.0.0` — native module rebuilt for Node 22; `hash`/`compare` API unchanged
  (`models/user.js` `hashPassword`, `scripts/seed.js`, `login.js` compare). bcrypt 6 verifies
  existing `$2b$` hashes, so already-stored passwords keep working.
- [x] `jsonwebtoken` 8 → `^9.0.3` — added an explicit `{ algorithms: ['HS256'] }` option to **all
  three** `jwt.verify` call sites: `lib/auth.js` (`verifyToken`), `routes/login.js` (`/session`),
  and `routes/users.js` (password-reset). `jwt.sign` keeps its HS256 default and `expiresIn`, so
  token shape is unchanged. (Plan listed 2 verify sites; there were 3.)
- [x] Re-ran the Phase 3 auth tests and **added a regression test** asserting a non-HS256
  (HS384) token is now rejected — `tests/auth.test.js`. Suite green: **15/15** on Node 22.
- [x] Live end-to-end check: re-seeded local DB (bcrypt-6 hashes) and logged in via HTTP —
  valid login returns 200 + token cookie + password-stripped user; wrong password rejected.
- [x] **Bug fix (found during E2E):** `POST /login` with a non-existent email responded but did
  not `return`, then ran `removeKeys(user._doc)` on a `null` user — the resulting throw hit the
  `catch` after headers were already sent (`ERR_HTTP_HEADERS_SENT`, crashing the request). Added
  the missing `return`. Shipped with a fail-first regression test (`tests/login.test.js`). 16/16.

## Phase 5 — Database: Mongoose 5 → 9 (incremental) ✅ (completed 2026-06-21)

Highest-risk phase. Stepped through one major at a time (5→6→7→8→9), with `npm test` + seed +
live smoke (login, `/books`, `/reviewers`) after each. One commit per major for bisectability.

- [x] **5 → 6** (`^6.13.9`): removed `useNewUrlParser`/`useCreateIndex` (no-ops/removed in 6)
  from `lib/connectMongoose.js` **and** `scripts/seed.js`; set `mongoose.set('strictQuery',
  false)` explicitly (the 7+ default) to silence the v6 transition warning. Side benefit: the
  `useUnifiedTopology`/SDAM and `collection.count` driver warnings from Phase 0 are now gone.
- [x] **6 → 7** (`^7.8.9`): migrated the `models/user.js` cascade from `pre('remove')` to
  `pre('deleteOne', { document: true, query: false })` (the old hook also had a triple-`next`
  bug and never awaited its deletes — now fixed). Converted `routes/deleteUser.js` from
  callback `User.findOne(..., cb)` + `userDoc.remove()` to `await` + `userDoc.deleteOne()`.
  Verified the cascade fires against a local DB. Per code review: guarded the Mailchimp
  `.end()` callback against transport errors (undefined `response`) and removed double-responses
  (`res.json` then `next`). No other callback-style Mongoose queries existed.
- [x] **7 → 8** (`^8.24.0`): replaced the deprecated `Query.prototype.count()` in
  `routes/books.js` and `routes/reviewers.js` with `countDocuments()`.
- [x] **8 → 9** (`^9.7.1`): no further code changes needed. Reviewer text/field indexes
  re-verified (`/reviewers` 200), seed + login + `/books` all green; clean boot log on Node 22.
- [x] `npm run seed` verified against a local DB after each step.

## Phase 6 — Express 4 → 5 ✅ (completed 2026-06-21)

- [x] Upgrade `express` 4.16 → `^5` (installed 5.2.1).
- [x] **Fixed the error handler** (latent bug above): now
  `app.use(function (err, req, res, next) {...})` — 4 args, so Express registers it. Responds
  with JSON (`{ message, error }`) instead of rendering a view. Locked down by a fail-first
  regression test in `tests/app.test.js` (unknown route → JSON 404; verified it fails on the
  3-arg handler, which falls through to Express's default `text/html` 404).
- [x] Reviewed routing for Express 5 / `path-to-regexp@8`: grepped for `req.param(`, `app.del`,
  `res.sendfile`, status-first `res.json(obj, status)`, `req.host`, and bare `*` wildcards —
  **none present**. All routes use plain string paths + `:id` params (`registerBook` `/:id`,
  `book` `/private/:id`, `promotions`/`reviewer`/etc.), which are compatible. `router.js` mounts
  unchanged.
- [x] Dropped `jade`/views: this is a pure JSON API, so replaced `res.render` in both call sites
  with JSON — `routes/index.js` (`GET /` → `{ name, status: 'ok' }`) and the error handler.
  Removed the view-engine setup from `app.js`, deleted `views/`, uninstalled `jade`.
- [x] Removed `body-parser` from dependencies (zero code references after Phase 3).
- [x] Full smoke test on Node 22 against local Mongo: `GET /` (JSON ok), `/books` (200),
  `/reviewers` (200), `GET /promotions` → JSON 404 (route only defines `PUT /:id`, expected),
  and an unknown path → JSON 404. Clean boot log. `npm test` 18/18 green.
- [x] `npm audit` dropped from the Phase 0 baseline of 48 to **19** after removing jade's
  transitive tree and upgrading Express (full audit reconciliation tracked in Phase 8).

## Phase 7 — Integrations (Stripe, Nodemailer, Mailchimp) ✅ (completed 2026-06-21)

Three independent sub-phases, one commit each.

- [x] **`stripe` 8 → 22** (22.3.1). Pinned `apiVersion: '2026-06-24.dahlia'` (the version the
  v22 SDK targets) so an SDK bump never silently changes behavior via the account default.
  **Breaking change confirmed & fixed:** under the pinned API, `paymentIntents.create` with a
  bare `confirm: true` errors (`"...you must provide a return_url"`) because the account has
  dashboard-enabled redirect-capable methods. Added
  `automatic_payment_methods: { enabled: true, allow_redirects: 'never' }` — verified live
  against **Stripe test mode** (`pm_card_visa` → status `succeeded`). Updated the
  `paymentCheckout` test to assert the new option.
- [x] **`nodemailer` 6 → 9** (9.0.3). `createTransport`/`sendMail` API unchanged; **SMTP auth
  verified live** via `transporter.verify()` (no outbound send). Fixed a long-standing bug:
  every HTML template opened with `` `; `` (backtick + literal semicolon), so each email body
  started with a stray `;` — removed from all four templates in `lib/email.js`.
- [x] **Mailchimp: `superagent` → native `fetch`** across all four callers (`login.js`,
  `suscribeAuthor.js`, `deleteUser.js`, `registerReviewer.js`); removed the deprecated
  `superagent` dependency (Node 22 ships a global `fetch`). Preserved the Basic-auth header,
  JSON bodies, and the "treat 400 as success" semantics. **Read path verified live** against
  both real lists (GET → 200; 94 writers / 502 readers). Robustness gains: the login status
  sync can no longer abort login on a Mailchimp outage (guarded on `response.ok`, so a numeric
  error `status` is never persisted); `deleteUser`/`suscribeAuthor` fetches now live inside the
  existing try/catch (no detached `.end()` callbacks); dropped a stray debug `console.log` in
  `registerReviewer`. **Pre-existing bug left for a later pass:** `deleteUser` still reports
  "usuario borrado" without deleting when the Mailchimp unsubscribe fails.
- [x] `npm test` 18/18 green; live server boot + `/`, `/books`, `/reviewers` all 200.

## Phase 8 — Final cleanup & verification

- [ ] Confirm `dependencies` vs `devDependencies` split is correct.
- [ ] `npm audit` — compare against the Phase 0 baseline; address remaining advisories.
- [ ] `npx eslint .` clean (consider bumping ESLint config to a current `ecmaVersion`).
- [ ] Update `README.md` / `CLAUDE.md`: Node 22 requirement, `.nvmrc`, any changed env/setup.
- [ ] Full regression: `npm test`, `npm run seed` (local), `npm start` + manual route smoke.
- [ ] Squash/curate commits per phase and open the PR.

---

## Sequencing rationale

Tooling and tests first (Phases 0–3) so there's a safety net before touching auth, the
database layer, the framework, and paid integrations (Phases 4–7), which carry the real
breaking changes. Each phase is its own PR to keep blast radius small and bisectable.

## Progress log

| Date | Phase | Notes |
|------|-------|-------|
| 2026-06-18 | 0 | Plan created. Baseline captured (Node 14 pinned, Node 20 installed locally; lockfileVersion 1; superagent phantom dep). |
| 2026-06-18 | 0 | **Phase 0 complete.** Branched `chore/dependency-upgrade` off refreshed master. Clean reinstall → lockfileVersion 3, bcrypt drift fixed (4.0.1 → 5.1.1), superagent pinned as direct dep. Tests green (2/2). Audit baseline: 48 vulns (6L/24M/12H/6C). Smoke test passed against local Mongo. |
| 2026-06-18 | 1 | **Phase 1 complete.** `engines` → `>=22 <23`; added `.nvmrc` (22), README setup docs, and CI workflow. Installed Node v22.23.0, reinstalled (bcrypt rebuilt for v22). Fixed 4 `new Buffer` → `Buffer.from`. Tests 2/2 + smoke test green on Node 22. |
| 2026-06-18 | 2 | **Phase 2 complete.** Bumped cookie-parser ^1.4.7, cors ^2.8.6, morgan ^1.11.0, debug ^4.4.3, dotenv ^17.4.2, http-errors ^2.0.1. Added dotenv `{ quiet: true }` to silence the v17 boot log. Tests 2/2; smoke test incl. 404 path green. |
| 2026-06-19 | 3 | **Phase 3 complete** (branch `feature/test-stack-upgrade` off master). jest→^30, supertest→^7 (both devDeps); explicit jest node env. Replaced placeholder tests with 14 real route/middleware tests (mocked DB + services). Found & fixed a JWT-cookie race in `login.js` (callback→sync sign). 14/14 green on Node 22. |
| 2026-06-21 | 4 | **Phase 4 complete** (branch `feature/auth-security-upgrade` off master). bcrypt→^6 (native rebuilt for v22), jsonwebtoken→^9 with explicit `algorithms: ['HS256']` on all 3 verify sites. Added HS384-rejection regression test (15/15). Live login E2E verified with real bcrypt/jwt. |
| 2026-06-21 | 5 | **Phase 5 complete** (branch `feature/mongoose-upgrade` off master). Mongoose 5→6→7→8→9 (`^9.7.1`), one commit per major. Removed dead connect opts + set strictQuery; migrated cascade to `pre('deleteOne')` doc hook; deleteUser → async/await + `deleteOne()`; `.count()` → `countDocuments()`. backend-node-reviewer caught a Mailchimp `.end()` crash path + double-response, both fixed. 16/16 tests + seed + smoke green after each step. |
| 2026-06-21 | 6 | **Phase 6 complete** (branch `feature/express-5-upgrade` off master). express 4.16 → ^5 (5.2.1). Fixed the latent 3-arg error handler (→ 4 args, JSON response) + fail-first regression test. Dropped server-side views: `res.render` → JSON in `routes/index.js` and the error handler; deleted `views/`, uninstalled `jade`. Removed unused `body-parser`. Route audit: no Express-5 breaking patterns. 18/18 tests; live smoke (`/`, `/books`, `/reviewers`, JSON 404) green. Audit 48 → 19. |
| 2026-06-21 | 7 | **Phase 7 complete** (branch `feature/integrations-upgrade` off master). 3 commits. stripe 8 → ^22 (pinned apiVersion; fixed `confirm:true` → added `automatic_payment_methods {allow_redirects:'never'}`, verified live in Stripe test mode). nodemailer 6 → ^9 (SMTP auth verified via `.verify()`; fixed stray `;` in all 4 email templates). Mailchimp superagent → native `fetch` in 4 route files, removed superagent dep (read path verified live against both lists). 18/18 tests + boot smoke green. |
