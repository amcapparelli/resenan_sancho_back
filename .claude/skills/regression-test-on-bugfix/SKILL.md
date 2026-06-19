---
name: regression-test-on-bugfix
description: >
  Enforces that every bug fix ships with a regression test that fails before
  the fix and passes after it, so the same bug can never silently come back.
  Use this skill proactively whenever the work is a bug fix — when the user
  says "fix this bug", "this is broken", "X doesn't work", "it crashes when…",
  "regression", "it used to work", or whenever you are (or are about to be) on
  a `bugfix/` branch. Applies to both the frontend (Next.js / React /
  TypeScript, tested with Jest + React Testing Library) and the backend
  (Node / Express / Mongoose, tested with Jest + supertest). Do NOT use it for
  new features (`feature/`) or pure refactors with no behavioural bug — those
  follow normal testing practice, not this fail-first regression rule.
---

# Regression test on every bug fix

A bug that was fixed once and comes back is worse than a new bug: it means the
fix was never protected. This skill makes the regression test a **required
deliverable of the bug fix**, not an optional follow-up. No bug fix is "done"
until a test reproduces the bug and now passes.

This complements `git-workflow`: that skill puts you on a `bugfix/` branch;
this one governs what must be inside that branch before it can merge to master.

## The non-negotiable rule

**Every bug fix must include at least one automated test that fails on the
buggy code and passes on the fixed code.** The test asserts the *correct*
behaviour for the exact input that triggered the bug.

If you cannot write such a test, stop and say so explicitly before merging —
do not quietly skip it. See "When a test is genuinely hard" below.

## Workflow (fail-first)

Follow this order. The point is to *prove* the test catches the bug, not just
to add a test that happens to pass.

### 1. Reproduce the bug as a failing test — before fixing the code

Write the test first, against the current (broken) code, and run it. It **must
fail**, and it must fail *because of this bug* (read the failure message and
confirm it's the right failure, not a setup error). A test that passes against
broken code proves nothing.

Name the test after the observed behaviour, in English, e.g.
`does not crash when synopsis is empty`, not `bug 123`. Code, names and
comments stay in English; user-facing strings asserted in the test stay in
Spanish, per the project convention.

If a regression already references an issue/ticket, mention it in a comment
(the *why*), not in the test name.

### 2. Apply the fix

Make the minimal change that fixes the bug. Don't fold unrelated refactors
into the same step.

### 3. Confirm the test now passes — and the rest still does

Re-run the new test (now green) and then the **full suite** (`npm test`) to
make sure the fix didn't break anything else. Both must pass before the branch
is mergeable. Master auto-deploys from Heroku, so a red suite must never reach
it.

### 4. Commit fix and test together

The test and the fix belong in the same logical change so the protection
travels with the fix. Keep the commit subject ≤100 chars (per `git-workflow`),
e.g. `Fix crash on empty synopsis + regression test`.

## What a good regression test asserts

- **The specific failing input.** Reproduce the exact case that broke
  (the empty field, the null author, the special character, the second click),
  not a generic happy path.
- **Behaviour, not implementation.** Assert the observable result (no crash,
  correct status code, modal closes, right error message), so the test keeps
  protecting even if the internals are refactored later.
- **One bug, one focused test.** If a fix addresses several distinct bugs, add
  a test per bug.

## Frontend bugs (Next.js / React / TypeScript)

Tooling: **Jest + React Testing Library** (`@testing-library/react`,
`@testing-library/user-event`). Co-locate the test next to the component:
`BookCard.tsx` → `BookCard.test.tsx`.

Test through user-visible behaviour, not internal state:

- **Render / crash bugs** (e.g. card crashes when `coverUrl` is undefined):
  render with the offending props and assert it renders without throwing and
  shows the fallback.
- **Interaction bugs** (e.g. "Ver más" toggle, modal won't close, double
  submit): drive it with `userEvent` and assert the resulting DOM
  (`screen.queryByRole(...)` is gone, button disabled, etc.).
- **Conditional-UI bugs** (e.g. logged-out user sees the logged-in CTA): render
  each relevant prop combination and assert the right element appears.

Query by role/label/text the user would perceive
(`getByRole('button', { name: /pedir ejemplar/i })`), not by test-ids unless
nothing else works. Assert Spanish copy exactly as the user sees it.

## Backend bugs (Node / Express / Mongoose)

Tooling: **Jest + supertest** for routes; plain Jest for controllers/services
and model logic. Mirror the source path under the test folder the project
already uses.

- **Route / API bugs** (wrong status, wrong payload, missing auth check): hit
  the endpoint with supertest using the input that triggered the bug and assert
  status + response body. For an auth bug, assert the unauthenticated request is
  rejected (e.g. `401`), which is exactly the regression you want locked down.
- **Validation / sanitisation bugs** (e.g. Mongo operator injection like
  `{ $gt: '' }` slipping into a string field): send the malicious/edge input and
  assert it's rejected or coerced safely.
- **Business-rule bugs** (e.g. a book with 0 available copies still showing in
  search; a copy not being decremented on contact): assert the rule directly on
  the controller/service result.

**Database safety still rules everything** (per the `senior-backend` agent):
never write a test that runs destructive operations against real or production
data. Use an in-memory Mongo (`mongodb-memory-server`) or a disposable test DB,
seed only what the test needs, and confirm `MONGODB_URI` is not production
before running. A regression test must never become a way to lose data.

For Stripe-related bugs, reproduce against Stripe **test mode** / mocked Stripe
only — never live keys.

## When a test is genuinely hard

Some bugs are awkward to test (a third-party outage path, a Heroku-only
environment quirk, a visual-only glitch). The rule is not "skip the test" — it
is "don't pretend it's covered". In that order, prefer to:

1. **Narrow the target.** Usually the *logic* underneath the hard-to-test
   surface can be extracted and unit-tested even if the outer integration can't.
   Test that.
2. **Mock the boundary.** Stub the external service (Stripe, SMTP, Mailchimp)
   and test your code's handling of its success/failure responses.
3. **If truly untestable**, say so explicitly in the PR/summary: what the bug
   was, why an automated regression test isn't feasible, and how you verified
   the fix manually. This is the rare exception, surfaced for the human to
   accept — not a silent omission.

## Definition of done for a bug fix

- [ ] A test reproduces the bug and **failed** on the unfixed code.
- [ ] The fix is applied (minimal, focused).
- [ ] That test now **passes**.
- [ ] The **full suite** passes (`npm test`).
- [ ] Fix + test committed together, subject ≤100 chars.
- [ ] Any untestable exception is explicitly flagged, not hidden.
