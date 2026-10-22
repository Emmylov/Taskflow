---
name: TaskFlow schema readiness
description: Development schema requirements for verifying owner workspace routes.
---

Before exercising owner Templates or team-management routes, apply and verify the current development database schema; source tables can exist before the database has been updated.

**Why:** An otherwise healthy API and storefront can return route failures when newly added TaskFlow tables are absent from the development database.

**How to apply:** Treat schema readiness as part of authenticated workspace verification, and keep any automated check isolated from production data.