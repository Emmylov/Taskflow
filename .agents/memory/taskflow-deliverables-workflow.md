---
name: TaskFlow deliverables workflow
description: Product decision for handling project handoffs, file versions, and customer review.
---

TaskFlow deliverables are a project-level library separate from chat. Owners submit named file versions; customers preview each version, approve it, or request changes with feedback. Chat remains the place for discussion, not the system of record for handoff status.

**Why:** A growing service operation needs a searchable, reviewable handoff surface instead of burying final files among conversation attachments.

**How to apply:** Keep future production features attached to the project deliverables model: version history, review state, feedback, activity events, and role-specific controls. Add task assignment and milestones around this workflow rather than replacing it with more chat features.