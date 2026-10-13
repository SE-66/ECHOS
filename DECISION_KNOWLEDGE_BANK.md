# ECHOS v0.4 — Financial Decision Knowledge Bank and Mixed-Evidence Situation Engine

**Status: working, bounded research prototype; not a legal compliance tool or automatic financial decision adviser.**

## The research problem

Organizations face decisions that cut across departments and contain nonnumeric facts: internal policies, contract amendments, approvals, insurance, supplier capability, applicable legal regimes and unknowns. Financial values, operational rules, documents and decision authority may change independently. A change that affects several requirements should not be treated as a single-variable calculator update. This implements part of the ECHO decision-transition research, but does **not** independently validate ECHO, ACBS, or DCAG.

## Two distinct assets

1. **Decision Bank:** `src/decision-bank.js` holds 32 searchable decision archetypes (not 32 validated or fully executable financial decision models). Tags connect finance with HR, legal, management control, procurement, risk, operations, and governance. The bank is a discovery index; future research must add validated, versioned requirement templates per jurisdiction and firm.
2. **Situation Engine:** `src/situation-engine.js` accepts user-defined business decisions, evidence-linked facts, numeric dependencies and typed approval/contract/policy predicates. Multiple requirements can apply to multiple decisions. It recomputes baseline and changed conditions and traces changed facts to affected requirements and decisions. The same input can influence many decisions.

## Input and rule types

- Fact types: `money`, `number`, `boolean`, `enum`, `text`, `date`.
- Evidence states: `declared_verified`, `unverified`, `missing`, `disputed`, `expired`. The *declared* label is not proof of authentication.
- Source types: `company_policy`, `contract`, `statute`, `regulation`, `accounting_record`, `commercial_document`, `management_assertion`, `other`.
- Provenance fields: reference, jurisdiction, optional effectivity dates and reviewer.
- Derived financial nodes: consistent-unit `sum` and `subtract`; others are deliberately unsupported rather than guessed.
- Requirements: `comparison` over declared financial values, or `predicate` on qualitative facts.
- Conditional applicability: `when` with bounded `all`, `any`, `not`, and simple predicates, evaluated with three-valued logic (yes/no/unknown).
- Status per requirement: `passes`, `fails`, `needs_review`, `not_applicable`.
- Mandatory failures take precedence over uncertainty, but unknown and advisory requirements stay visible in detail.
- Expired sources force a review; an unreviewed statutory/regulatory rule never silently produces a compliance verdict.

### Scope of a decision bank

An archetype such as *Supplier contract renegotiation* describes possible domains and evidence to inspect. The bank is not a catalog of universal policy thresholds or fixed contract obligations. Neither the bank nor the simulator assumes what Lebanese law says. Rules must be supplied with authenticated sources and reviewed by competent finance/legal professionals before production use.

## Example: supplier agreement change

The working example has four connected decisions: contract approval, liquidity maintenance, procurement budget authority, supplier risk acceptance. Seven named rules include liquidity, budget, corporate approval, fictional supplier consent, fictional internal cross-border review, exception approval and a non-binding risk alert.

- **Amendment requested, price unchanged:** monetary checks remain stable; fictional agreement consent becomes required and missing, so the contract decision is blocked.
- **Cross-border arrangement with missing legal review:** the fictional internal policy triggers review; ECHOS does not infer legal compliance.
- **Purchase rises and cash rises equally:** cash condition remains satisfied, but the budget reserve may fail: financial offsets do not erase distinct requirements.
- **Board approval revoked:** the finance figures stay identical but governance requirements fail.
- **Disputed purchase amount:** affected numerical requirements are unresolved; other independently supported failures remain visible.

The example's policy and contract clauses are invented to demonstrate the schema; they are not based on actual company policies or legal requirements.

## Routes

- `GET /` — new Decision Knowledge Bank and mixed-type Situation Explorer.
- `GET /connected.html` — v0.3 numerical Connected Decision Studio.
- `GET /legacy.html` — v0.2 single-rule explorer.
- `GET /api/bank` — 32 archetype records.
- `GET /api/situation/example` — scenario schema and preset changes.
- `POST /api/situation/evaluate` — `{ "model": {...}, "changes": {"board_approval":{"value":false}} }`.

## Deliberate boundaries and future research

- No autonomous discovery of correct rules from uploaded documents, legislation, corporate policies or case law.
- No automatic reconciliation of contradictory authorities, legal hierarchies, exclusions, exceptions, or multiple countries' laws. Unknown applicability must go for professional review.
- No multi-period cash-flow engine, foreign exchange, company consolidation, optimization, probabilistic inference, or agent action execution.
- No validated real-world decision outcomes, empirical benchmarking against commercial systems, or causal identification.
- No persistence, document authentication or secure organization-specific tenant environment.

A subsequent research-grade system should provide: (1) source-linked candidate rule extraction with human approval, (2) versioned enterprise facts/policies/contracts, (3) cross-jurisdiction applicability and explicit exception/conflict handling with manual resolution, (4) temporal and organizational entity graph, (5) controlled transition test generation, and (6) independent human/AI behaviour measurement.

## Prior art and novelty

We should align with—not pretend to invent—existing Decision Model and Notation (OMG DMN), W3C provenance modeling (PROV), and OASIS LegalRuleML ideas. These already treat decisions, knowledge requirements, sources, dates, jurisdictions and legal norms. The commercial and scholarly contribution of ECHOS would depend on a validated, finance-specialized **decision-transition evaluation mechanism** beyond those established ideas.

References: https://www.omg.org/dmn/ ; https://www.w3.org/TR/prov-primer/ ; https://www.oasis-open.org/standard/legalruleml-core-specification-version-1-0-oasis-standard/