# ECHOS — Step 2: Context Interpretation (v0.6 research module)

## Purpose
Take **Step 1** evidence-linked claim records and annotate their decision context before concluding that claims conflict. A signed 60-day agreement and a proposed 30-day amendment are not the same decision state.

## Workflow
1. POST a Step 1 compatible case (`sources`, `claims`, etc.) and explicit `annotations` to `/api/case/context`.
2. Step 1 reconstructs claims and sources, without authentication.
3. Step 2 contextualizes claims using user/reviewer-supplied metadata: `modality` (existing, proposed, hypothetical, historical, forecast), `force` (binding_claim, offer, recommendation, permission, prohibition, observation, unknown), `actor`, `entity`, `jurisdiction`, `scenario`, applicable dates, condition and exception references, declared authority source, and `reviewed`.
4. Incompatible values with different contexts are returned as **distinguished pairs**, not contradictions. Same-context mismatches are **potential conflicts requiring review**, never definitive findings of legal conflict.
5. Missing provenance, review, effective dates, conditions and exceptions remain explicit unresolved issues.

## Example request
```
POST /api/case/context
Content-Type: application/json
{
  "case_id":"supplier_terms",
  "as_of":"2026-10-13",
  "sources":[{"id":"contract","title":"Existing supplier contract"},{"id":"offer","title":"Supplier amendment proposal"}],
  "claims":[
    {"id":"old","key":"payment_days","kind":"fact","type":"number","unit":"days","value":60,"source_ids":["contract"]},
    {"id":"new","key":"payment_days","kind":"fact","type":"number","unit":"days","value":30,"source_ids":["offer"]}
  ],
  "annotations":[
    {"claim_id":"old","modality":"existing","force":"binding_claim","actor":"supplier","authority_source_id":"contract","reviewed":false},
    {"claim_id":"new","modality":"proposed","force":"offer","actor":"supplier","reviewed":false}
  ]
}
```

Expected: the two claims are distinguished as existing versus proposed, not presented as a proven contradiction. Legal enforceability and the validity of the document remain unverified.

## Research limitations
- **Not natural-language understanding**: metadata is supplied, not extracted reliably from raw documents. It can serve as a validated reference representation for later extraction experiments.
- Does not decide whether a law applies, a term is enforceable, an exception is triggered, or an authority has legal precedence.
- Equal-context claims are merely potential inconsistencies; source chronology and amendment validity require separate review.
- Existing Step 1 conflict flags still appear in the reconstructed result; Step 2's contextual classification supersedes those flags for *interpretation*, without erasing history.
- No scoring of external AI systems and no autonomous legal compliance verdict.

## Reproduce tests
`node --test cloudflare-tests/context-interpreter.test.js`