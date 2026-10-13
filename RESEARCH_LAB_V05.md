# ECHOS Research Lab v0.5 — Scope and controls

Research prototype; not legally validated or autonomous legal interpretation.

## Working functions
- `/lab.html`: candidate contract/policy obligations (text excerpts and source locations), potential missing requirements (heuristic screening), provenance/date/jurisdiction checks for user-supplied legal-rule records, and live evaluation against selected Cloudflare Workers AI models.
- POST `/api/lab/extract`: basic phrase/pattern extraction with traceable excerpts. It does not independently read PDFs, resolve ambiguity, classify legal obligations accurately, or certify interpretation.
- POST `/api/lab/gaps`: decision-bank screening, not exhaustive missing-rule discovery.
- POST `/api/lab/legal`: checks user-supplied records for a matching declared jurisdiction, declared effective period, a source reference, and named reviewer. The `source_review_recorded` state means ONLY that these fields were declared. No rule is independently verified from the internet, court database, or official gazette. No Lebanese legal corpus is bundled.
- POST `/api/lab/test-ai`: runs one or two allowlisted Cloudflare Workers AI models over identical scenarios and returns raw responses. **No correctness score** is reported without blinded expert reference answers. `ECHOS_LAB_KEY` must be configured as a Cloudflare Worker secret, and the corresponding `x-echos-lab-key` header is required.

## Deployment
`wrangler.jsonc` includes the `AI` binding. Cloudflare account must have access to Workers AI; model usage may be billed. For AI endpoint access, configure a secret from Cloudflare or via `npx wrangler secret put ECHOS_LAB_KEY`, storing a strong unique secret. Never commit secrets or enter confidential contract text in the public demonstration. Static lab interface is exposed at `/lab.html`; first three endpoints are publicly available and operate only on pasted text sent per request (no application storage), so rate limiting/abuse prevention and enterprise authentication are future work.

## Priorities before claiming full capabilities
1. Document parsing of supported formats with reliable paragraph/page references and human verification of extracted obligations, exceptions, temporal scope.
2. Jurisdiction-specific legal source connectors, change monitoring, authoritative source retrieval and qualified review; no unverified rules labeled as verified.
3. Explicit decision graph completeness assessment, uncertainty analysis, cross-document conflicts and organizational exceptions.
4. Provider-agnostic controlled AI evaluation with real held-out cases, repeated runs, independent reference scoring, leakage controls, access governance, and performance comparisons.

## Commands
`npm run test:worker` and `python -m unittest discover -s tests -q`.