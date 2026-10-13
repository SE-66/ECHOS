# ECHOS 0.3 — Connected Decision Engine (configurable research prototype)

## Why the existing app was not enough

Versions 0.1 and 0.2 each checked *one* fixed financial rule (cash, budget, profit or pricing). A real proposed action is usually subject to **several interacting requirements**. One outlay may reduce cash **and** available budget; new project revenue can affect margins and profitability; the same information may be relevant to more than one business function.

This version adds a generalized model of financial **inputs**, **derived relationships**, **decision requirements**, **evidence status**, **entity**, **currency/unit**, and **reporting period**. It is not a new pretrained AI model, and it does not autonomously discover arbitrary accounting relationships from prose or documents.

## Concrete example

Decision: should Example Manufacturing Co. approve a $600,000 expansion investment in Q4 2026?

Baseline, using provided financial figures:

- Cash after investment and scheduled payments: $2,000,000 - $600,000 - $100,000 = $1,300,000, versus required cash $1,000,000 → cash requirement passes.
- Uncommitted budget: $1,500,000 - $700,000 - $600,000 = $200,000, versus minimum reserve $150,000 → budget requirement passes.
- Operating profit: $950,000 + $150,000 - $850,000 - $80,000 = $170,000, versus required $70,000 → profitability requirement passes.

Changing investment amount to $700,000 affects both the cash and budget calculations. Cash still passes ($1,200,000); budget fails ($100,000 vs $150,000 required). The whole decision is *not approved under the stated constraints* although one constraint is satisfied.

If supplier payments grow from $100,000 to $450,000 and project revenue shrinks from $150,000 to $30,000 simultaneously, cash and profitability both fail while budget continues to pass.

If project revenue is marked disputed, the profit calculation is provisional, not a reason to confidently approve. An independently verified failure of another requirement is still surfaced.

## A configurable model rather than domain dropdowns

The new `src/context-engine.js` accepts a JSON object specifying:

- `inputs`: named monetary quantities with evidence status, source, unit, time period and entity;
- `calculations`: explicit acyclic expression nodes (`sum`, `subtract`, `product`, `divide`, `min`, `max`);
- `conditions`: multiple decision constraints comparing calculated and input values (`gte`, `lte`, `gt`, `lt`, `eq`);
- `changes`: a partial map of updated input values and/or evidence status.

The engine validates dependencies, rejects cycles and unknown inputs, and checks that additions/subtractions and comparisons do not silently mix units, entities or periods. It computes which **requirements depend on every changed input**, flags one-to-many overlaps, preserves a separate assessment per requirement, and does not treat an unknown requirement as verified compliance.

It returns one of three constrained statuses: `WITHIN_RULES`, `RULES_NOT_MET`, `NEEDS_EVIDENCE`. These statuses are about *supplied conditions*, not optimal business action, economic benefit, legal authorization or future certainty.

### Available routes

- `GET /` — Connected Decision Studio (new default page)
- `GET /legacy.html` — older single-rule explorer
- `GET /api/connected/example` — example configuration and demonstration changes
- `POST /api/connected/evaluate` — configurable evaluation. Body: `{ "model": {...}, "changes": { "investment": { "value": "700000" } } }`

The browser allows editing input values/evidence, showing each changed input's connected requirements, and loading a **custom structured JSON** model in an advanced panel. This is a technically usable configurability mechanism, not yet a friendly automated document importer or natural-language model builder.

## Deliberately absent from 0.3

1. **Automatic extraction and validation** of transactions, contracts, financial statements, external conditions and organizational policy.
2. **Multi-period cash-flow scheduling, currency conversion, consolidation and cross-entity transfer logic**. Current rules require consistent periods and units and reject mismatches rather than guessing.
3. **Causal identification** or statistical learning of the true real-world dependencies; the dependency structure is explicitly specified and needs independent review.
4. **Search/optimization over competing business alternatives**. A single proposed action is checked against multiple stated requirements.
5. **Independent AI testing and human–AI experiments**. The old Python harness exports synthetic blind test cases, but the connected model has not been calibrated as a benchmark.
6. **Scientific validation** of ACBS, DCAG, ECHO or a new algorithm, and any demonstration of superiority versus existing platforms.
7. **Independent document authentication**. Evidence labels are asserted by the user.

## Research and technical novelty caution

Dependency graphs, financial knowledge graphs, temporal constraints, counterfactual tests and multi-constraint reasoning have substantial prior art. ECHOS 0.3 is a configured combination using established computational methods, not a demonstrated novel or patent-eligible invention. Related work includes 2026 research on dependency-aware integrity controls for financial AI (AICOS; Kalafatoglu, SSRN), HERMES (temporal financial knowledge graph), and counterfactual risk temporal knowledge graphs. A proper novelty and performance claim requires detailed literature/patent comparison and independent evaluation.

If a future technical invention is sought for patenting, have it legally reviewed *before* publishing its details in this public repository. Existing public disclosures may affect novelty.