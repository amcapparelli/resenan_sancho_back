# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Backend for **Reseñan Sancho**, a platform that connects book authors with literary reviewers (bloggers, booktubers, bookstagrammers). Authors register books and pay (via Stripe) to promote copies; reviewers browse books and request copies, which triggers email notifications to authors. Express + MongoDB (Mongoose) REST API. Domain language and user-facing messages are in **Spanish**.

Runs on **Node 22 LTS** (`engines.node` = `>=22 <23`, pinned in `.nvmrc`). Use `nvm use` before working.

## Commands

```bash
npm start        # Run the server (bin/www), defaults to PORT 9000
npm test         # Run Jest tests in tests/
npm run lint     # ESLint 9 (flat config in eslint.config.js)
npm run seed     # Populate a LOCAL db with mock data (see README.md)

npx jest tests/login.test.js            # Run a single test file
npx jest -t "sets a token cookie"       # Run tests matching a name
```

ESLint uses `eslint:recommended` + 2-space indent, single quotes, semicolons required
(config: `eslint.config.js`). CI runs `npm run lint` and `npm test` on every push/PR.

There is no build step. The seed script refuses to run unless `MONGOOSE_CONNECTION_STRING` contains `localhost`, and it **deletes all users/books/reviewers** before inserting.

## Architecture

**Request flow:** `bin/www` → `app.js` (Express **5** setup, CORS, JSON/cookie parsing, connects Mongoose via `lib/connectMongoose`) → `routes/router.js`. This is a pure JSON API: there are no server-side views — the 404/error handler responds with JSON (the error handler takes all **4** args `(err, req, res, next)` so Express registers it).

**Routing convention.** Routes are wired in one place, not via filesystem conventions:
- `lib/namedRoutes.js` maps a logical name → URL path (single source of truth for paths).
- `routes/router.js` is a `Router` class whose constructor mounts each route module at its `namedRoutes` path. **To add a route: create `routes/<name>.js`, add the path to `namedRoutes.js`, then `require` + `app.use` it in `router.js`.**
- Each route file is a self-contained `express.Router()` exporting itself.

**Authentication.** `lib/auth.js` exports `verifyToken()`, a middleware factory. Apply it per-route as `verifyToken()` (note the call). It reads a JWT from the `token` cookie or the `access-token` header, verifies against `JWT_SECRET`, and attaches the decoded payload to `req.authData`. The decoded `req.authData.user._id` is a string, so ownership checks compare it both directly (`author !== req.authData.user._id`) and via Mongoose's `.equals()` (`book.author.equals(...)`) — follow the existing pattern. Login (`routes/login.js`) signs the JWT and sets an httpOnly cookie.

**Models** (`models/`, all lowercase model names `'user'`, `'book'`, `'reviewer'`):
- `user` — has `statics.hashPassword` (bcrypt, 14 rounds) and a `pre('deleteOne', { document: true, query: false })` hook that cascades deletes to the user's books and reviewer profile. Delete a user via `userDoc.deleteOne()` (not the removed `.remove()`) so the cascade fires.
- `book` — references `author` (user) and tracks `copies` / `freePromoAvailable` for the promotion flow.
- `reviewer` — references `author` (user), holds genres/formats and social links (blog, booktube, bookstagram, goodreads, amazon); has text + field indexes.

**Conventions to preserve:**
- Strip sensitive fields from responses with `utils/removeKeys.js` (`removeKeys(user._doc, 'password')`).
- Genre values are stored as 3-letter **codes** (`utils/constants/genres.js`, e.g. `ROM`, `FAN`); the `name` is the display label.
- Promotion tiers (id/copies/price in cents) live in `utils/constants/promotions.js`. Prices have a "testing" vs "normal" value noted in comments — be careful when editing.

**Integrations** (all keyed off env vars):
- **Stripe** (`routes/paymentCheckout.js`) — `paymentIntents.create` to charge for promotion copies. The client pins `apiVersion` and the charge sets `automatic_payment_methods: { enabled: true, allow_redirects: 'never' }` (server-side card charge, no redirect flow — required by the current API when `confirm: true`).
- **Nodemailer** (`lib/email.js`) — exports a shared `transporter` plus HTML template builders (password reset, book-copy request, promo confirmations). Used by routes like `registerBook`, `paymentCheckout`, `orderBook`.
- **Mailchimp** (`routes/login.js`, `registerReviewer.js`, `suscribeAuthor.js`, `deleteUser.js`) — syncs email subscription status via the Mailchimp REST API using the built-in **`fetch`** (no HTTP client dependency). Mailchimp returns HTTP **400** for an already-existing member, which the code treats as success; on a non-2xx response the JSON body's `status` is a numeric HTTP code (not a subscription string), so guard on `response.ok` before reading it.

## Environment

Requires a `.env` file (loaded by `dotenv` in `lib/connectMongoose.js`). Variables in use:
`MONGOOSE_CONNECTION_STRING`, `PORT`, `FRONTEND_URL`, `JWT_SECRET`, `STRIPE_SECRET`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASSWORD`, `MAIL_CHIMP_INSTANCE`, `MAIL_CHIMP_API_KEY`, `LIST_UNIQUE_ID`, `WRITERS_LIST_UNIQUE_ID`.

## Tests

`tests/` covers the **real** `app.js` with Jest + supertest, mocking side effects at import time: `lib/connectMongoose`, `stripe`, the Mongoose models (via `tests/helpers/modelMock.js`), `bcrypt`, and — for the Mailchimp routes — the global `fetch`. No real DB or network is touched. Follow the existing files when adding tests: `auth`, `login`, `register`, `registerBook`, `registerReviewer`, `paymentCheckout`, and `app` (bootstrap/404). Bug fixes must ship with a fail-first regression test (see the `regression-test-on-bugfix` skill).

## Workflow de PRs
- Al crear una pull request, aplica la skill `version-bump-backend`:
  sube la versión en `package.json` (semver) según el tipo de cambio
  antes de abrir la PR.
- El bump va en la rama de la PR, nunca directo en master.
