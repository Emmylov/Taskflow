---
name: OpenAPI path grouping
description: Non-obvious YAML structure required when adding multiple operations to one API path.
---

When adding GET and POST operations for the same route path, keep both methods under one OpenAPI path mapping. Do not create a second `post` key for that path.

**Why:** Orval rejects duplicate HTTP method keys during code generation, even though the server routes may be valid.

**How to apply:** Before running API codegen, inspect the path block and group every method for a shared path together.