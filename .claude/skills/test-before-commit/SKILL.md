---
name: test-before-commit
description: Backend skill that enforces running the unit test suite before every commit. Use this in the backend repo whenever you are about to commit changes (you have staged work and are running `git commit`). Run `npm run test` first; if any test fails, diagnose and fix the application code until the whole suite passes, then commit. NEVER commit with failing tests. If a test itself appears outdated or no longer valid (the code change is correct and the test encodes an obsolete expectation), do NOT modify or delete the test on your own initiative — stop and ask the user first.
---

# Test Before Commit (backend)

Every commit in the backend must be made on top of a green test suite. This skill
runs the unit tests before committing, fixes the code if they fail, and protects
the tests from being silently changed.

## When this applies

- Apply this **before any commit** in the backend repo — whether it's the first
  commit of a task or one of many while iterating.
- It runs **after** you've made and staged your changes, as the last gate before
  `git commit`.
- It complements `git-workflow` (branch naming, commit message rules); it does not
  replace it. Branch first per `git-workflow`, do the work, then run this gate
  before each commit.

## Workflow

### 1. Run the unit tests

From the backend project root:

```bash
npm run test
```

Wait for the full run to finish and read the output. Do not commit until you have
seen the result.

### 2a. If all tests pass

Proceed to commit following the `git-workflow` message rules (imperative subject,
≤100 chars). Done.

### 2b. If one or more tests fail

The default assumption is that **your code change is wrong, not the test**. Do the
following:

1. Read the failing test(s) and the assertion that failed. Understand what
   behaviour the test expects.
2. Inspect the application code you changed and find why it no longer satisfies
   that expectation.
3. **Fix the application code** so the behaviour is correct and the test passes.
   Keep the fix focused on the actual cause — don't paper over it.
4. Re-run `npm run test` and confirm the **whole** suite is green again (not just
   the test you were looking at — a fix can break something else).
5. Only then commit.

Repeat until `npm run test` passes with no errors.

### 3. Never commit red

Do not commit while any test is failing. Do not skip, comment out, mark as
`.skip`/`.only`, or otherwise neutralise a failing test to get a green run. A
disabled test is a failing test in disguise.

## When a test itself might be wrong

Sometimes a test fails not because the code is broken but because the test encodes
an expectation that is no longer valid (the requirement changed, the old behaviour
was itself a bug, an API contract was intentionally updated, etc.).

In that case:

- **Do NOT modify, rewrite, or delete the test on your own initiative.**
- Stop and ask the user first. Explain clearly:
  - which test is failing,
  - what it currently expects,
  - why you believe that expectation is no longer valid,
  - what change to the test you would propose.
- Wait for explicit confirmation before touching the test.

Only once the user confirms do you update the test, then re-run `npm run test` to
confirm the suite is green, and commit.

> The reason for asking first: a failing test is the project's early-warning system.
> Editing a test to make it pass can silently erase a real regression. The judgement
> call about whether a test is obsolete belongs to the user, not to you.

## Quick checklist

- [ ] Changes staged.
- [ ] `npm run test` run and output read.
- [ ] If failures and code is at fault → fixed the code, re-ran, suite green.
- [ ] If failures and the *test* seems obsolete → asked the user, did not touch the
      test unilaterally.
- [ ] No tests skipped, disabled, or commented out to force green.
- [ ] Only committed once the full suite passed.
