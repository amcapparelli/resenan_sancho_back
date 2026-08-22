---
name: model-names
description: Mongoose model registration names used in this project
metadata:
  type: project
---

Models are registered with lowercase singular names: `mongoose.model('user', ...)`, `mongoose.model('book', ...)`, `mongoose.model('reviewer', ...)`. Cross-model references in hooks use these exact strings (e.g. `this.model('book')`).

**How to apply:** When reviewing `this.model('x')` or `.populate()`/ref usage, verify the string matches these lowercase singular names.
