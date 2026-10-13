# ECHO-TRACE — Algorithmic architecture and experimental specification

**Working expansion:** Evidence-Conditioned Human–AI Observation and Transition Reasoning, Assessment & Counterfactual Evaluation

**Status:** Prototype v0.1. No novelty, patentability, superior performance, or scientific validation asserted.

## 1. Design thesis — from the research to an executable oracle

The supplied integrated doctoral proposal defines the **decision-state transition** as the unit of analysis. Its central distinction is between recognizing an environmental change, assessing its decision relevance, reassessing representation/evidence adequacy, and responding by appropriate adaptation **or** appropriate stability. It also defines proposed (not yet validated) measurement constructs **ACBS** (AI Contextual Behavioural Sensitivity) and **DCAG** (Decision-Context Adequacy Gap); human–AI reliance, verification and function-specific authority are downstream.

ECHO-TRACE instantiates this in an independent testing engine. It does not pretend to make a finance-trained LLM internally understand a change. Instead it describes **how to test observable decision-context competence** under verifiable reference rules and independently documented evidence constraints.

### Three boundaries (original integrated design hypothesis; not established novelty)

1. **Decision / feasibility boundary:** An explicit corporate financial rule ceases or begins to hold.
2. **Evidence / knowability boundary:** Necessary evidence becomes invalid, disputed, expired, or unavailable even when numerical values stay fixed.
3. **Authority / delegation boundary:** A candidate human or AI system could be assigned a function only after sufficient external empirical evidence of task-specific competence and appropriate oversight requirements. **Authority is not automatically granted in v0.1.**

The key non-equivalences are:

- Change in information ≠ change in a decision requirement.
- Decision-relevant change ≠ necessary change of action.
- Unchanged numeric decision ≠ adequate evidence.
- Correct decision on one case ≠ reliable model behaviour.
- Justified response ≠ proven explanation faithfulness.

## 2. State ontology

A financial decision state is a tuple:

\[ S_t = (F_t, E_t, P_t, M_t, R_t) \]

where:
- `F`: structured financial facts (amounts, prices, costs);
- `E`: evidence quality/provenance status (verified, disputed, expired, missing);
- `P`: policy and decision constraints (e.g., minimum liquidity buffer);
- `M`: contextual metadata, including document labels and, in production, as-of timestamps;
- `R`: financial relationships (a versioned, validated model).

The independent reference oracle evaluates:

\[ O(S_t) = (a_t, k_t, g_t, \pi_t) \]

where `a` is the rule-based justified action, `k` an evidence-adequacy state, `g` signed rule slack and `π` a reproducible decision certificate.

For a simple threshold rule: `g(F,P) >= 0` is compliant; `g(F,P) < 0` is noncompliant. If necessary evidence is unavailable, the justified action is **REQUEST_EVIDENCE** even if numerical slack can still be computed from asserted values. This is an operational **normative design decision**, not a universal finance principle.

The transition unit is:

\[ T_t = (S_t, \Delta_t, S_{t+1}, O(S_t), O(S_{t+1})) \]

with `Δ` containing independently identified changed facts, changed evidence status, changed policy and presentation-only modifications.

## 3. Reference decision classification

Reference conditions are classified using both *numeric decision* and *evidence*:

| Evidence adequacy | Numeric decision requirement | Expected reference outcome |
|---|---|---|
| Adequate at t, adequate at t+1 | Action flips | `ADAPT_DECISION` |
| Adequate at t, adequate at t+1 | Slack changes but action stays | `REASSESS_BUT_PRESERVE` |
| Adequate at t, adequate at t+1 | No financial/evidential relevance | `PRESERVE_INVARIANT` |
| Adequacy lost | Any numeric conclusion | `EVIDENCE_REQUIRED` |
| Adequacy regained | Re-evaluate | `EVIDENCE_RESTORED` |

This creates cross-cutting test families rather than a single classification of "adaptation".

For a decision with `g == 0`, the rule is satisfied. Boundary probes must therefore preserve the original equality semantics. Financial and temporal complexities can lead to sets of defensible decisions rather than a single action; the prototype currently handles the deliberately narrower single-rule case.

## 4. Architecture / execution path

```text
Decision spec (not a language-model guess)
   ├─ typed financial variables / valid ranges
   ├─ verified/approved rule representation
   ├─ evidence requirements and policy owner
   └─ baseline B0 + versioned context
                     │
                     ▼
           State normalization
         /      |         \
     financial evidence     metadata
         \      |         /
                     ▼
      INDEPENDENT REFERENCE ORACLE
  decision boundary & evidence boundary
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
   Controlled transition    Boundary probing
    generation (C states)  + minimal counterexamples
         └───────────┬───────────┘
                     ▼
          Blind public test suite
                     │
              Human or AI model
                     │
                     ▼
             Structured outputs
                     │
                     ▼
           Independent comparison
    ├─ change detection
    ├─ decision relevance / response
    ├─ evidence-abstention discipline
    ├─ behavioural stability/adaptation
    └─ failure taxonomy + certificate hashes
                     │
                     ▼
       Research report / oversight evidence
```

**Safety boundary:** No live finance system is modified, and no model receives power to execute financial transactions. A production advisory system must have a separate authorization, escalation and human review workflow.

## 5. Why the reference is separate from the AI under test

A model can correctly repeat its own wrong answer, hallucinate evidence, or justify a mistaken recommendation fluently. A second model grading it does not eliminate shared failure modes. ECHO-TRACE's v0.1 rule oracle uses deterministic Decimal arithmetic, explicit constraints and a required evidence-status mapping. Later ambiguous judgments must use independently agreed reference criteria, multiple expert assessors and transparent adjudication.

The reference engine is the **test instrument**, not a universal oracle of all financial decisions. No inference of internal consciousness or internal reasoning is made.

## 6. Perturbation families in the executable prototype

For **each** of 4 demonstration domains, 11 scenarios are constructed:

1. Presentation-only change: numeric and evidence invariance.
2. Economically relevant small change with stable decision.
3. Critical evidence disputed.
4. Critical evidence expired.
5. Policy threshold moved just below a decision boundary.
6. Policy threshold moved just above it.
7. Financial attribute immediately below its decision boundary.
8. Financial attribute at its decision boundary.
9. Financial attribute immediately above it.
10. Multiple offsetting changes with invariant decision slack.
11. Cross-boundary financial change combined with missing policy evidence.

**44 scenarios total**, generated with a fixed seed and four manually specified independent rules. More scenarios do not establish scientific comprehensiveness. The current generator explicitly tests both relevant changes that should change the action and relevant changes that should not.

### Original design hypothesis to investigate: paired boundary certificates

For each test, construct a *pair of independently generated certificates* for B0 and Cx containing:

- declared financial rule and signed slack;
- critical evidence status;
- domain-specific calculations;
- justified reference action;
- deterministic hashes of recorded certificate content;
- typed transition relation.

A "minimal financial counterexample" candidate is a near-boundary test that changes one input by a predefined epsilon; the current bisection approach only approximates numeric proximity within a bounded interval and does **not** prove global minimality.

## 7. Implemented scoring — candidate ACBS/DCAG indicators

A model returns structured declarations for baseline action, updated action, changed variables, evidence deficits and whether it reassessed. Its response is compared against the independent reference.

- **Adaptation correctness:** correct updated action for known-evidence transitions requiring a changed action.
- **Stability correctness:** correct updated action when action stability is appropriate (including relevant-but-no-flip and irrelevant cases).
- **Evidence abstention:** correctly request missing/disputed/expired critical information.
- **Change detection:** exact agreement on changed financial, evidence and presentation attributes.
- **Evidence deficit recognition:** exact agreement on problematic evidence sources.
- **Whole-case pass:** all deterministic observable checks pass.

Metrics are deliberately *separate*. No arbitrary single-number "AI trust score" is claimed. The above measurements are candidate operational indicators related to ACBS and DCAG, not validated ACBS/DCAG scales.

### Failure attribution

`change_detection`, `evidence_recognition`, `baseline_decision`, `updated_decision`, `declared_reassessment`, plus interpretable labels for `under_response`, `over_response`, and `unsupported_certainty`.

Attribution is **output-based**: a mismatch between reference and observed output. It cannot prove an internal mechanistic cause of error.

## 8. Adaptive counterexample sampling

The implemented prototype contains a transparent heuristic selector:

\[Q(c)= 4/(1+n_{family}) + 2/(1+n_{domain}) + 1.5\cdot f_{family}/(1+n_{family}) + 1_{evidence\ required}\]

where `n` counts previously tested families/domains and `f` is observed failure count. The selector emphasizes underexplored categories and revisits prior failure families. It is **not** a proven optimal adversarial search algorithm. A candidate future invention would replace this with validated information-gain/expected-cost optimization and repeated held-out evaluation.

## 9. Existing prior art and novelty threats

The design must NOT be marketed as the first scenario-generation, counterfactual, financial benchmarking, or metamorphic-testing method.

| Existing method / product | Already establishes | What our empirical studies must still show |
|---|---|---|
| Patronus FinanceBench — https://docs.patronus.ai/docs/research_and_differentiators/financebench | Financial question-answer evaluation against evidence and reference answers | Added predictive validity of linked *decision-state* changes versus finance QA |
| Giskard Scan — https://docs.giskard.ai/oss/scan | Generated behavioural scenarios, checkers, reusable test suites | Better domain-grounded test quality or reduced false errors compared to configured Giskard |
| Giskard metamorphic tests — https://legacy-docs.giskard.ai/en/stable/open_source/customize_tests/test_model/index.html | Input transformations with expected output relations | That the dual evidence/decision certificate reveals additional classes of failures |
| Ren, Byun & Wilder (2024) — https://proceedings.mlr.press/v244/ren24a.html | Decision-focused evaluation under distribution shift | Added value of explicit financial decision-context and evidence mechanisms |
| InvestLogicBench (2026) — https://arxiv.org/abs/2608.06108 | Finance decision-process and event-grounded evidence evaluation | Generalization across FP&A, pricing, budgeting, liquidity, not solely investment decisions |
| Metamorphic testing survey (2026) — https://arxiv.org/abs/2605.13898 | Broad metamorphic evaluation/test-generation literature | Novel implementation or experimental result after review of this literature |
| NIST AI RMF Measure — https://airc.nist.gov/airmf-resources/airmf/5-sec-core/ | Documented testing, uncertainty, independent evaluation and continuous monitoring | Demonstrable task-specific validation, not merely adopting these practices |

**Patent warning:** A broad claim for "using a graph and counterfactual tests to identify AI financial failures" would be vulnerable to existing techniques. A patentable implementation is not currently identified. Technical invention counsel should conduct claim-level prior art and eligibility assessment in each relevant jurisdiction before any publication of potentially patent-sensitive technical design.

## 10. How to show actual improvements instead of promising 'best on the internet'

**H1: Failure-finding uplift.** On pre-registered, independently constructed financial test sets, ECHO-TRACE detects more genuine context-sensitive decision failures than static FinanceBench-style Q&A or unconstrained scenario generation, measured at an identical test budget.

**H2: False-alarm reduction.** Explicit decision/evidence boundary certificates reduce false positives on relevant-but-stable and cosmetic changes compared with a generic language-model judge.

**H3: Evidence discipline.** Explicit evidence-boundary scenarios reveal a larger range of unsupported-certainty failures compared with correctness-only testing.

**H4: Efficiency.** On equivalent held-out testing tasks, adaptive counterexample selection finds a predefined target number of independently verified failures with fewer model calls than seeded random testing. It must be compared to *strong* existing active/adversarial test selectors, not only random.

### Required evaluation controls

- Independently constructed held-out corporate cases with varying domains, data quality, ambiguity and external validity.
- Human-verified references; inter-rater agreement for non-deterministic judgment.
- Real models tested in isolated, parameter-logged sessions; stable software/provider versions.
- Repeated runs to estimate model stochasticity; independent experimental subjects and test ordering.
- Matched budgets and identical input access across all comparison methods.
- No hidden answers, category words or specimen example leaks into prompts.
- Ablations removing evidence checking, financial dependency logic, boundary generation and adaptive selection.
- Robustness to context restatement, currency conversions, multiple time horizons, conflicting evidence, threshold drift, unit mismatch, policy expiry and latent constraints.
- Measure error severity, false positive findings, precision/recall, macro-average by domain, test cost and uncertainty.
- Independent replication and appropriate statistical designs accounting for within-case correlations.

## 11. Product roadmap

**v0.1 (delivered):** Working independent oracle, 4 financial domains, 44 controlled cases, evidence/decision transition rules, boundary probing, adaptive *heuristic* test selector, encrypted? **No** (demo stores plain JSON; do not use sensitive customer data), browser interface, report generator, zero external dependencies, regression tests.

**v0.2:** Validated typed financial graph, currency/unit types, time-indexed cash flows, compound rules, reference sets (multiple justifiable actions), provenance signatures, authenticated input adapters, JSON schema validation, versioned rule registry, anonymized dataset curation.

**v0.3:** API adapters for target LLMs and human experiments, scheduled repeat tests, model/settings trace ledger, confidence calibration and externally adjudicated scoring for non-rule tasks.

**v1.0:** Cross-domain and multi-company pilots, governance workflow, privacy/access controls, enterprise deployment security, independent risk review, external benchmarking, and scientific publication subject to intellectual-property counsel.

## 12. Decision on technical scope

The 4 demo domains were chosen for transparent mathematical reference outcomes. **They are not the bounds of the research program**. Broader management-control, finance and AI governance decisions—including ambiguous cases—must be introduced with rigorous reference construction, not forced into threshold-rule outputs.

In this architecture, **the model under test is not itself the adjudicator**. The engine measures externally observable transition behaviour; authority remains a downstream policy recommendation, subject to human oversight, not an automatic entitlement derived from a scalar benchmark score.