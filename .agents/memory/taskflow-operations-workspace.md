---
name: TaskFlow operations workspace
description: Durable product decisions for project lifecycle visibility and payment reconciliation.
---

The owner workspace should default to active projects only. Closing a project removes it from the working inbox but does not delete it; closed projects remain available through an explicit Archived filter. Marking a bank transfer paid should use an in-app confirmation dialog, with the transfer reference treated as optional reconciliation metadata rather than a required field.

**Why:** An operations dashboard needs to stay focused as project volume grows, while historical work and payment context must remain recoverable.

**How to apply:** Keep customer history intact in the client portal. Keep closed work out of the default owner queue. Never use a browser prompt for payment actions; explain optional reference fields in the product UI.