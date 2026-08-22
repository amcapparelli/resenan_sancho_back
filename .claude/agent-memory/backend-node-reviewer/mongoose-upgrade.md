---
name: mongoose-upgrade
description: Incremental Mongoose dependency upgrade (5 to 9) being done in phases on feature branches
metadata:
  type: project
---

The team is upgrading Mongoose incrementally: 5→6→7 done by Phase 5 (branch `feature/mongoose-upgrade`), with 8→9 still to come in later phases. Stripe/Nodemailer/Mailchimp/superagent modernization is deferred to a later "Phase 7".

Key migration patterns applied: `pre('remove')` document hook → `pre('deleteOne', { document: true, query: false })`; `userDoc.remove()` → `userDoc.deleteOne()`; removed `useNewUrlParser`/`useCreateIndex` connect options; set `strictQuery` explicitly.

**Why:** Node engine pinned to `>=22 <23`; modern Mongoose required for support.

**How to apply:** During this migration, do NOT flag the superagent/Mailchimp callback flow as needing rewrite (deferred to Phase 7) — but DO flag genuine bugs in it. Focus review on Mongoose/Express correctness.
