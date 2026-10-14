# ECHOS Architecture v4 — Decision Episodes, Not Supplier Workflows

## Product definition
ECHOS is an evidence-aware financial decision research workbench. Its unit of analysis is a **decision episode**, not a financial category or a supplier contract. Users define their own decision; domain templates are optional illustrations. Categories must never act as exhaustive rules.

## Architectural spine
1. **Decision reality and temporal state**: the user records prior and current conditions, assessment date and deadline. Actual, proposed, and hypothetical states must remain distinguishable.
2. **Representation / knowledge**: claims, sources, documents, numbers, context, contradictions, gaps and derivations. ECHOS does not independently authenticate underlying records.
3. **Decision requirements**: finance, law/contract, operations, approval, tax and other relevant gates; applicability and evidence sufficiency are tracked.
4. **Option and scenario space**: user-supplied alternatives and numerical constraints, reviewed conditionally rather than approved globally.
5. **Response under change**: research should test whether a human, AI or human–AI decision process preserves, reassesses, qualifies or escalates when appropriate; no validated ERS/ACBS calculation exists yet in this product.
6. **Authority and outcome**: human only, human assisted, joint review, AI-led reviewed and bounded delegation are research conditions, not automatic permission grants.
7. **Traceability**: the integrated workflow returns its limitations, conditional comparison, provenance and a separate `decision_episode` result.

## Implemented in this iteration
- Blank-case entry instead of supplier as default.
- Optional templates: budget variance, customer credit, capital investment, forecasting/capacity, supplier contracts.
- Guided prior/current context, materiality hypothesis, deadline and proposed authority.
- A new `src/episode-engine.js` records these declarations and explicitly reports missing prior/current conditions.
- `src/workflow-engine.js` integrates `decision_episode`; optional legacy callers remain supported.
- Five regression tests ensure caller judgments cannot become established materiality or authorized delegation.
- Case exports preserve the new episode fields.

## Not implemented / research gaps
- Open-domain semantic extraction of facts, actual applicable rules, or independently inferred financial causes.
- Expert-audited distinction between material and immaterial change, or validated Expected Response Standard.
- ACBS measurement, comparison of human and AI response trajectories, DSE equivalence, or evidence-to-authority calibration.
- Independent reconciliation of contracts, audit evidence, forecasts, and financial calculations beyond declared arithmetic.
- State history/persistent projects, secure multiuser authentication, permissions and participant blinding.
- Domain-independent causal inference or reliable action recommendation.

## Validation priorities
Use held-out cases across the five decision families and C0–C5 perturbations. Measure false omission, false obligation, erroneous stability/adaptation, evidence sufficiency, response variability, adjudicator reliability, and whether the user-facing results retain epistemic boundaries. Treat the system as a research prototype until these are established.
