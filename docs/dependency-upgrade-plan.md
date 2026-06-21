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
- [ ] **`jade` is deprecated**: renamed to `pug` in 2016. Only used by the boilerplate error
  view (`views/`). Migrate to `pug` or drop server-side views entirely (this is a JSON API).
- [ ] **`body-parser` is redundant**: `app.js` already uses `express.json()` /
  `express.urlencoded()`. `body-parser` is only used by the throwaway `tests/app.js`. Remove
  once tests are reworked.
- [ ] **Latent bug — error handler is not registered**: `app.js` declares
  `app.use(function (err, req, res) {...})` with only **3 args**. Express only recognizes an
  error handler when it has **4 args** (`err, req, res, next`). As written it's treated as
  normal middleware and never runs on errors. Fix during the Express phase.
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

## Phase 5 — Database: Mongoose 5 → 9 (incremental)

Highest-risk phase. **Step through one major at a time** (5→6→7→8→9), running tests between
each, rather than jumping straight to 9.

- [ ] **5 → 6**: Remove deprecated connect options `useNewUrlParser`, `useCreateIndex`,
  `useFindAndModify` (and `autoIndex` handling) from `lib/connectMongoose.js` **and**
  `scripts/seed.js` — they're no longer recognized. `strictQuery` default changed.
- [ ] **6 → 7**: **Breaking for this repo** — the `pre('remove')` document hook in
  `models/user.js` (which cascades deletes to `book`/`reviewer`) no longer fires;
  `Document.prototype.remove()` was removed. Migrate to `pre('deleteOne', { document: true,
  query: false })` (or `findOneAndDelete`) and update any call sites that delete a user. Also
  audit callback-style queries — callbacks were removed in 7; everything must be
  `async/await`/Promises (the codebase already mostly uses `await`).
- [ ] **7 → 8** and **8 → 9**: review each changelog for index build and type changes; the
  text/field indexes on `models/reviewer.js` should be re-verified.
- [ ] Verify `npm run seed` against a local DB after each step (it uses `insertMany`,
  `deleteMany`, and the removed connect options).

## Phase 6 — Express 4 → 5

- [ ] Upgrade `express` 4.16 → 5.x.
- [ ] **Fix the error handler** (see latent bug above): change to
  `app.use(function (err, req, res, next) {...})` so Express registers it.
- [ ] Review routing: Express 5 uses `path-to-regexp@8` (named wildcards, no bare `*`),
  removed `app.del`, `req.param(name)`, and changed some `res`/`req` behaviors. The route
  files here use plain string paths and `:id` params, which are compatible, but verify
  `routes/registerBook.js` (`/:id`) and the `router.js` mounts.
- [ ] Decide on `jade`/views: migrate the error view to `pug` **or** replace `res.render`
  in the 404/error handlers with JSON responses (preferred for a pure API) and drop `jade`
  + the `views/` setup.
- [ ] Remove `body-parser` from dependencies once `tests/app.js` no longer uses it.
- [ ] Full smoke test of every mounted route in `routes/router.js`.

## Phase 7 — Integrations (Stripe, Nodemailer, Mailchimp)

- [ ] `stripe` 8 → 22 — **largest API jump**. Pin an `apiVersion` when constructing the client:
  `require('stripe')(key, { apiVersion: '2025-...' })`. Re-verify
  `paymentIntents.create({ amount, currency, payment_method, confirm: true })` in
  `routes/paymentCheckout.js` against the current API (the `confirm`/`payment_method` flow and
  error shapes changed across versions). Test with Stripe test keys.
- [ ] `nodemailer` 6 → 9 — `createTransport` config and the template-send flow in
  `lib/email.js` are broadly compatible; verify SMTP auth options and run a real send to a
  test inbox. Note: the HTML templates in `lib/email.js` start with a stray `` ;`` after the
  backtick — clean up while here.
- [ ] Mailchimp call in `routes/login.js`: now that `superagent` is explicit (Phase 0),
  either keep it pinned or replace with Node's built-in `fetch`. Verify the
  `Authorization: Basic` header and member-status sync still work.

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
