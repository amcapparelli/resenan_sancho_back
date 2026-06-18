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
- [ ] **Dependency classification**: `jest`, `supertest`, and `body-parser` are under
  `dependencies` but are dev/test-only. Move to `devDependencies`.
- [ ] **`jade` is deprecated**: renamed to `pug` in 2016. Only used by the boilerplate error
  view (`views/`). Migrate to `pug` or drop server-side views entirely (this is a JSON API).
- [ ] **`body-parser` is redundant**: `app.js` already uses `express.json()` /
  `express.urlencoded()`. `body-parser` is only used by the throwaway `tests/app.js`. Remove
  once tests are reworked.
- [ ] **Latent bug — error handler is not registered**: `app.js` declares
  `app.use(function (err, req, res) {...})` with only **3 args**. Express only recognizes an
  error handler when it has **4 args** (`err, req, res, next`). As written it's treated as
  normal middleware and never runs on errors. Fix during the Express phase.
- [ ] **Deprecated `Buffer`**: `routes/login.js` uses `new Buffer(...)` → replace with
  `Buffer.from(...)` (also required for newer Node).
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

## Phase 1 — Node 22 LTS

- [ ] Bump `engines.node` in `package.json` to `>=22 <23` (or pin `22.x`).
- [ ] Add `.nvmrc` with `22` and document `nvm use` in the README.
- [ ] Install/switch local toolchain to Node 22 and reinstall (`nvm install 22 && nvm use 22`,
  then `rm -rf node_modules && npm install`) so native modules (bcrypt) build against Node 22.
- [ ] If/when CI exists, set the workflow Node version to 22. (No CI config found in repo yet —
  consider adding a GitHub Actions workflow that runs `npm ci && npm test`.)
- [ ] Replace `new Buffer(...)` with `Buffer.from(...)` in `routes/login.js`.
- [ ] Smoke test on Node 22.

## Phase 2 — Low-risk patches & minors (quick wins)

Bump together; behavior changes are minimal. Verify the server boots and logs after each.

- [ ] `cookie-parser` 1.4.4 → 1.4.7
- [ ] `cors` 2.8.5 → 2.8.6
- [ ] `morgan` 1.9.1 → latest 1.x
- [ ] `debug` 2.6.9 → 4.x (API compatible; just a major version of the logger)
- [ ] `dotenv` 8 → 17 — review: newer versions changed default quoting/expansion behavior and
  print to stderr on missing file; confirm `.env` still loads in `lib/connectMongoose.js`.
- [ ] `http-errors` 1.6.3 → 2.0.1 — used via `createError(404)` in `app.js`; API is stable.

## Phase 3 — Test stack + real safety net (do BEFORE the risky phases)

The biggest risk in this upgrade is that there are **no tests covering real routes**. Build a
minimal safety net first so later phases have something to validate against.

- [ ] Upgrade `jest` 25 → 30 and `supertest` 4 → 7. Move both to `devDependencies`.
- [ ] Update Jest config if needed (Jest 27+ changed the default test environment to `node`,
  which suits this API; verify `testEnvironment`).
- [ ] Replace the placeholder `tests/app.js` car/test app with tests that import the **real**
  `app.js`. Mock Mongoose models and external services (Stripe, Nodemailer, Mailchimp).
- [ ] Cover the highest-value flows: `login` (JWT issue + cookie), `verifyToken` middleware,
  `register`, `registerBook` ownership check, `paymentCheckout` promo math.
- [ ] Add `npm test` to run green on Node 22.

## Phase 4 — Auth & security libraries

- [ ] `bcrypt` 5/4 → 6.0.0 — native module; requires Node 18+ (fine on 22). Forces a rebuild;
  confirm prebuilt binaries exist for Node 22 or that build tools are present. Hashing/compare
  API is unchanged (`models/user.js` `hashPassword`, `login.js` compare).
- [ ] `jsonwebtoken` 8 → 9 — **breaking**: stricter defaults; pass an explicit `algorithms`
  option to `jwt.verify` (e.g. `{ algorithms: ['HS256'] }`) in `lib/auth.js` and
  `routes/login.js`. Review the `expiresIn` sign options (still supported). Drops Node < 12.
- [ ] Re-run the Phase 3 auth tests.

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
