# Cloudflare deployment: next stage, not configured yet

This repository contains a Python 3.10+ localhost prototype based on `http.server.ThreadingHTTPServer` and the Python standard library. It is **not** yet compatible with Cloudflare Pages or Cloudflare Workers as a drop-in deployment. Running `python web_demo.py` binds to 127.0.0.1 and is designed only for local exploration.

Before public deployment:
1. Decide on the Cloudflare architecture: port the deterministic engine to a TypeScript Worker with server-side independent scoring, or use an appropriate container-based hosting option for the Python server. Do not assume a standard Python HTTP server runs unchanged on Workers.
2. Keep the reference oracle and private grading keys on the server; never expose the private test labels to candidate models or browser clients. The current `/api/evaluate` intentionally displays reference calculations for **demonstration**, not blind evaluations.
3. Implement authentication, authorization, request quotas, input-size limits, audit logs, abuse controls and privacy safeguards before accepting private financial documents.
4. Add deployment configuration and CI only after the hosting choice and integration tests are complete.
5. Validate results on independently reviewed financial scenarios before positioning the service as commercial AI assurance.

No Cloudflare deployment has been performed by this initial GitHub repository setup.