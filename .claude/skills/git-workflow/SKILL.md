---
name: git-workflow
description: Standard Git branching and commit workflow to follow when starting a new task. Use this whenever you begin work on a NEW feature or a NEW bug fix from scratch — for example when the user says "let's start a new feature", "fix this bug", "implement X", "add support for Y", or otherwise kicks off a fresh unit of work. It ensures you branch off an up-to-date master, name branches consistently (feature/ or bugfix/), and keep commit messages short. Do NOT use this skill when you are still iterating on a task already in progress (you are already on a feature/ or bugfix/ branch) — in that case just commit normally following the message rules below.
---

# Git Workflow

A consistent workflow for starting new tasks and committing changes.

## When to run the full branch setup (and when not to)

Run the **full setup** (steps 1–3) only when starting a brand-new unit of work from scratch: a new feature or a new bug fix that doesn't yet have a branch.

Do **NOT** run the setup when:
- You are iterating on a task already underway (you're already on a `feature/...` or `bugfix/...` branch for this work).
- The user asks for a follow-up change, fix, or refinement to something you just built in this session.

To check whether you're mid-task, look at the current branch first:

```bash
git rev-parse --abbrev-ref HEAD
```

If it's already a `feature/` or `bugfix/` branch matching the current work, skip to **Committing** below. If it's `master` (or an unrelated branch) and the user is starting something new, run the setup.

If you're unsure whether this counts as a new task or a continuation, ask the user briefly before creating a new branch — creating an unnecessary branch mid-task fragments the work.

## Starting a new task

### 1. Switch to master and update it

```bash
git checkout master
git pull
```

`git pull` brings in the latest changes from the `origin` remote so the new branch starts from current code, not a stale local copy. If `git pull` reports conflicts or a non-fast-forward, stop and surface the problem to the user rather than forcing it.

### 2. Create a new branch

Branch off master immediately. Choose the prefix by the kind of work:

- `feature/` — a new feature or capability.
- `bugfix/` — fixing an existing error or defect.

Use a short, descriptive, kebab-case name after the prefix.

```bash
git checkout -b feature/short-description
# or
git checkout -b bugfix/short-description
```

**Examples:**
- New search filter by genre → `feature/genre-search-filter`
- Login modal not closing → `bugfix/login-modal-not-closing`
- Add Stripe webhook handling → `feature/stripe-webhook`
- Fix typo on home page → `bugfix/home-page-typos`

If it's genuinely ambiguous whether the work is a feature or a bug fix, ask the user which prefix fits.

### 3. Proceed with the work

You're now on a clean branch off up-to-date master. Do the actual task.

## Committing

Commit messages must be **100 characters or fewer** (the subject line). Short messages stay readable in logs, `git log --oneline`, and pull-request lists.

Keep the message a concise, imperative summary of *what changed*. If you need more detail, put it in the commit body (after a blank line) — the 100-character limit applies to the subject line, not the body.

Before committing, verify the length. For example:

```bash
MSG="Add genre filter to book search"
[ ${#MSG} -le 100 ] && git commit -m "$MSG" || echo "Commit message too long (${#MSG} chars), shorten it."
```

**Examples:**
- Good (33 chars): `Add genre filter to book search`
- Good (28 chars): `Fix login modal close button`
- Too long (>100 chars): trim it down — drop redundant words, describe the change not the reasoning, move details to the body.

Make small, focused commits so that if something goes wrong you can step back without losing much work.
