---
name: TaskFlow API preview routing
description: The storefront and API run as separate artifacts, so browser API calls need a development proxy.
---

The TaskFlow storefront and API are separate services. In development, the storefront must proxy `/api` requests to the API service; otherwise Vite serves its HTML fallback for API paths and protected features fail with misleading fetch or JSON errors.

**Why:** Chat polling, profile uploads, account loading, and owner controls all use relative `/api/...` URLs and fail together when the frontend service handles those paths instead of the API service.

**How to apply:** Keep the storefront Vite `/api` proxy pointed at the API artifact's development port, and verify both the local storefront URL and the HTTPS preview URL return the API health response. Refresh existing browser sessions after restarting the workflow.