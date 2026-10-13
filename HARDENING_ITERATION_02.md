# ECHOS — Hardening iteration 02

## Implemented

`src/verification-engine.js` introduces two *bounded* checks:

1. `verifyDerivations`: exact fixed-point arithmetic over referenced Step 1 numerical/money claims, supporting addition, subtraction, multiplication or division by a unitless factor; detects mismatched currency/units, legal entities and reporting periods, unsupported/uncorroborated claims, missing source review declarations, impossible denominators, and disagreement with a Step 4 observation. It never authenticates a source, adjudicates accounting treatments or proves the underlying causal relationship. Numeric observations without mapped derivations are flagged by the integrated workflow.
2. `discoverRequirements`: searches source-linked textual claims for financial, contractual, policy, legal, approval, tax, operational, timing and evidence clues. Candidates are explicitly provisional and unconfirmed; potentially unmapped areas appear in workflow warnings. No NLP model is installed, and lexical matches can be false positives or miss synonyms. No legal requirement is automatically enforced from this screening.

`src/workflow-engine.js` integrates both checks as `derivation_verification` and `requirement_discovery`, with `open_issues` entries `derivation_unresolved:*`, `financial_derivation_missing:*`, and `potential_requirement_gap:*`.

`src/case-engine.js` now retains a source claim's supplied `entity` and `period`, enabling comparison across legal entities and reporting periods.

## Example calculation input

```json
{
 "id":"ending_cash", "scenario_id":"base", "alternative_id":"accept", "criterion_id":"cash",
 "expected_unit":"money:USD",
 "expression":{"op":"subtract","args":[{"claim_id":"opening_cash"},{"claim_id":"supplier_payment"}]}
}
```

Supply the objects in `derivations` alongside the usual `/api/workflow/evaluate` payload. Both claims must carry the same entity, period, monetary currency and corresponding source references; the observations should agree with the calculation.

## Testing

24 focused test cases passed locally: existing workflow/hardening regressions plus new checks for numerical mismatch, currencies, entity and period consistency, unsupported evidence, candidate approval detection, missing derivations and division by zero. This is NOT the full Cloudflare/Python regression suite, a penetration test, independent finance validation or a live deployment check.

## Known scientific limitations and next actions

* Existing normalized claims do not perform document signatures, source authentication, consolidations, accounting standard interpretation or currency translation.
* Derivation metadata is analyst-declared, not independently established; consistent arithmetic is not equivalent to correct decision modeling.
* Requirement screening is *lexical* and open-world: absence of a candidate can never certify completeness. It has no validated precision/recall. A more rigorous next phase requires document-to-claim traceability, reference-based semantic retrieval, adversarial omissions and independent expert adjudication.
* Do not use output for actual financial, contractual or legal approvals without professional review.