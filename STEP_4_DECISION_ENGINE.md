# ECHOS — Step 4: Comparing defensible business alternatives

**Status:** Bounded prototype, not autonomous financial advice, legal advice, or an optimization engine.

## Purpose
Compare two or more business alternatives across multiple scenarios using **explicit user-supplied criteria**:
- **Hard requirements:** quantitative thresholds, approvals, required categorical conditions. A failure blocks that alternative *under the stated rule*.
- **Objectives:** documented quantitative outcomes to maximize or minimize; not arbitrary weights or universal scores.
- **Evidence:** documented, declared, uncertain, disputed, or missing. Unknowns never count as satisfying a hard requirement.
- **Scenarios:** baseline, stress or other specified conditions, assessed individually.

The API is `POST /api/decision/compare` and accepts:
```json
{
  "decision": "Accept or negotiate supplier payment terms",
  "alternatives": [
    {"id":"accept","label":"Accept 30-day terms"},
    {"id":"negotiate","label":"Negotiate phased terms"}
  ],
  "criteria": [
    {"id":"cash","label":"Ending cash","type":"number","role":"hard","operator":"gte","threshold":"100","source":"Treasury policy"},
    {"id":"approval","label":"Management authorization","type":"boolean","role":"hard","operator":"eq","threshold":true,"source":"Approval matrix"},
    {"id":"savings","label":"Discount benefit","type":"number","role":"objective","goal":"maximize","source":"Cost analysis"}
  ],
  "scenarios": [{"id":"base","label":"Base"},{"id":"stress","label":"Stress"}],
  "observations": {
    "base": {
      "accept":{"cash":{"value":"120","evidence":"documented"},"approval":{"value":true,"evidence":"documented"},"savings":{"value":"15","evidence":"documented"}},
      "negotiate":{"cash":{"value":"130","evidence":"documented"},"approval":{"value":true,"evidence":"documented"},"savings":{"value":"10","evidence":"documented"}}
    },
    "stress": {
      "accept":{"cash":{"value":"90","evidence":"documented"},"approval":{"value":true,"evidence":"documented"},"savings":{"value":"15","evidence":"documented"}},
      "negotiate":{"cash":{"value":"115","evidence":"documented"},"approval":{"value":true,"evidence":"documented"},"savings":{"value":"10","evidence":"documented"}}
    }
  }
}
```

## Intended interpretation
- Accept: passes base case but breaches the stated liquidity constraint in stress.
- Negotiate: satisfies the stated conditions in both scenarios.
- The engine does **not** assume a probability for stress, assume an optimal choice, or turn legal validity into a numerical score.
- Dominance is reported only when two alternatives satisfy all hard requirements in every modeled scenario, all compared objectives have **documented** values, and one is at least as good in every objective/scenario and strictly better in one.

## Relation to ECHO research
Steps 1–3 reconstruct claims, contextualize obligations, and trace possible affected relationships. Step 4 **does not automatically import or verify their outputs yet**: a reviewed analyst must establish the alternatives, criteria, scenarios and observations. Making that handoff provenance-safe is future work. Step 5 will evaluate human/AI reactions to changes against independent expert and computational references.

## Scientific and implementation limitations
A documented evidence flag is user-supplied, not a cryptographic verification. The engine can miss omitted criteria, alternatives, scenario dependencies, cross-currency mismatches and correlated financial risks. No probabilistic inference, valuation model, causal effect identification or legally binding determination has been made. It should not be used to approve actual expenditures. Eight initial Step 4 tests passed locally.
