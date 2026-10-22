---
name: Workspace React peer dependency
description: Avoid duplicate React runtimes when a workspace package exposes React hooks.
---

Workspace packages that expose React components or hooks must treat React as a peer dependency, not a bundled runtime dependency. The consuming app should also dedupe React and React DOM in its Vite resolver.

**Why:** A second React instance causes invalid hook calls even when the TypeScript build succeeds.

**How to apply:** When adding or troubleshooting a shared React package, check the package dependency graph and the app bundler dedupe configuration before changing component code.