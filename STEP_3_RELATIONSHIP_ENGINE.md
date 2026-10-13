# ECHOS Step 3 — Evidence-Scoped Relationships

**Status:** Initial implementation on `main`. This is graph tracing, not autonomous relationship discovery or quantified financial impact.

## What changed
ECHOS now allows structured connections between claims and decision variables, such as a proposed shortening of supplier payment terms affecting a cash forecast and a budget constraint. Each connection records a relationship type, scope, source IDs, optional jurisdiction and time period. The algorithm traces indirect impacts across several connected variables and labels unsupported paths as requiring review.

## Integration
The `POST /api/case/relationships` endpoint consumes a Step 1 case, Step 2 context annotations and a `graph` containing `nodes`, `relationships`, `changed_claim_ids`, `scenario`, and optional `jurisdiction`. The engine's exported function is `traceRelationships(reconstructed, context, graph)`.

Example graph:

```json
{"nodes":[{"id":"cash","type":"financial","label":"Cash forecast"}],"changed_claim_ids":["payment_terms"],"relationships":[{"from":"payment_terms","to":"cash","relation":"affects","status":"declared","source_ids":["treasury_memo"]}]}
```

## Boundaries
- Relationships are entered or proposed by a user or external process, not autonomously inferred from contracts.
- An attached source is evidence metadata, not independent verification of a claimed relationship or its causal direction.
- Structural reachability does not establish magnitude, probability, financial materiality or correctness of a decision.
- Scope mismatches and non-effective rules should not silently propagate.
- Neither legal applicability nor validity is established by this engine.

## Next work
Source-grounded candidate relationship discovery; reviewed financial propagation rules; scenario comparisons; counterfactual stress tests; external expert validation; independent testing of human/AI responses.