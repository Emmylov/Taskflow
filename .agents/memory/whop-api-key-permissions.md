---
name: Whop API-key permissions
description: Scope checks needed when configuring TaskFlow billing with a direct Whop API key.
---

Whop account identity and product access are separate permissions. An API key can successfully return its account while product or pricing-variant listing fails with `access_pass:basic:read`. Using the API key directly does not grant scopes it lacks. The user resolved the TaskFlow key permissions; the direct key now lists products and variants successfully.

**Why:** The prior 403 was a key-scope issue, not a missing or disconnected Whop integration. Reopening it after the user confirmed the fix would repeat a solved problem.

**How to apply:** When setting up Whop billing, verify account identity and product/variant read access before creating anything. If the user says permissions are fixed, retry the current direct key before suggesting connector changes. Keep the key in Replit Secrets and do not expose it in logs or chat.
