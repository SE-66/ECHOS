# ECHOS Phase 1 — Evidence-led Case Reconstruction

## Purpose

This is a strictly bounded foundation for later financial analysis. It reconstructs a supplied business case from typed claims, their documentary sources, effective periods, and declared relationships. It does not interpret unrestricted documents, authenticate evidence, establish legal compliance, or prescribe decisions.

## API

`POST /api/case/reconstruct` accepts JSON:

```json
{
  "case_id": "supplier_renegotiation",
  "as_of": "2026-10-13",
  "sources": [
    {"id":"contract","title":"Signed supplier agreement","kind":"contract","review_declared":true},
    {"id":"proposal","title":"Supplier proposed amendment","kind":"correspondence"}
  ],
  "claims": [
    {"id":"old_terms","key":"payment_days","type":"number","unit":"days","kind":"fact","value":60,"source_ids":["contract"]},
    {"id":"proposed_terms","key":"payment_days","type":"number","unit":"days","kind":"fact","value":30,"source_ids":["proposal"]},
    {"id":"consent","key":"consent_received","type":"boolean","kind":"unknown","value":null}
  ],
  "required_keys": ["payment_days", "consent_received", "cash_forecast"],
  "links": [
    {"from":"proposed_terms","to":"consent","relation":"affects"}
  ]
}
```

The response supplies `claims`, `sources`, `unresolved`, `conflicts`, `gaps`, and `links` for independent investigation. An `as_of` date is required in formal research; absent dates default to the server date and should not be considered sufficient for archival studies.

### Important distinction

The sample deliberately puts both existing and proposed payment terms under the same key without marking proposal scope. The conflict report flags them for review; it **does not prove the contract is internally contradictory**. The next phase must model actors, modalities (current/proposed/conditional), scope, jurisdictions, and competing versions explicitly.

## Current limits

- Claims and links are supplied structurally. No LLM parsing or autonomous relation discovery.
- `review_declared` records only a supplied declaration, not independent source authentication.
- Required information keys must be supplied; there is no exhaustive requirement discovery.
- Same-key incompatible claims are **review candidates**, not formal legal or factual contradictions.
- Records are stateless and not stored. API is for synthetic or non-sensitive data only until authentication, storage protection and data retention controls exist.
- Future phases: (2) grounded semantic interpretation and scoped propositions; (3) evidence-backed dependency discovery and multi-alternative reasoning; (4) independent blind human/AI transition testing.

## Verification

`node --test cloudflare-tests/case-engine.test.js` checks conflicts, period handling, unknowns, source expiry, unsupported claims, invalid references, and typed-value validation.