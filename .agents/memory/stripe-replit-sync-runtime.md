---
name: Stripe sync runtime integration
description: Environment-specific constraints for Stripe connector credentials and stripe-replit-sync migrations.
---

The Stripe connection API returns the server credential under `settings.secret`; `secret_key` is not guaranteed. The `stripe-replit-sync` package must remain external to the API server bundle so its runtime migration directory is available.

**Why:** The managed Stripe connection can be healthy while a bundled server reports a missing key or starts without `stripe.accounts`, because the connector shape and package-relative migration path differ from the older template assumptions.

**How to apply:** Accept both supported secret field names when loading Stripe credentials, and add `stripe-replit-sync` to the server bundler’s external dependencies whenever using its migrations.