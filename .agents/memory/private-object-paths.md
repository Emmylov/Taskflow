---
name: Private object path variants
description: Storage routes need to handle private object URLs written with or without the bucket prefix.
---

Protected media paths are not guaranteed to have one representation: existing records may include the storage bucket prefix while newer upload responses may expose a normalized application path. Readers should authorize the user-scoped path first, then try compatible normalized signing candidates rather than assuming one prefix.

**Why:** Profile image records exposed both `/objects/profiles/...`-style application paths and `/objects/.private/profiles/...`-style stored paths during the same project.

**How to apply:** When adding or changing private object upload/download routes, keep database paths opaque to clients, normalize only at the protected application boundary, and test both legacy and newly-created records.