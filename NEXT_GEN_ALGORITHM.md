# ECHOS Next-Generation Algorithm — Release 0.2

## What the app does in ordinary terms

ECHOS evaluates a financial rule before and after business information changes. It answers:

1. Did the numbers, supporting evidence, or only the document presentation change?
2. Did the financial rule remain satisfied, become unsatisfied, or become satisfied again?
3. If two or more figures changed together, how much did each contribute to the numerical movement relative to the rule?
4. Can we rely on the inputs, or must we obtain better evidence first?

It **does not** independently understand arbitrary financial statements, authenticate documents, advise on a full business decision, execute financial transactions, or use a commercial LLM. The browser interface is a **public synthetic scenario explorer**, not a secure AI research benchmark.

## What is new relative to release 0.1

Release 0.1 compared baseline and changed rule decisions. Release 0.2 adds an *explanation layer* for simultaneous changes with exact decimal arithmetic and explicit handling of unverified evidence. The customer-facing interface now presents business-language results before technical diagnostics.

The new component is called **Rule-Cushion Attribution (RCA)** within the ECHO-TRACE architecture. This is a project name for an implementation of established finite-difference/fair-allocation mathematical ideas, **not** a claim of a new mathematical theory or patentable algorithm.

### 1. Independent rule check

For each domain, define an explicit quantitative condition:

| Domain | Rule cushion (must be non-negative) |
|---|---|
| Liquidity | cash − proposed spend − supplier payments due − minimum buffer |
| Budget | total budget − committed spend − proposed spend − required reserve |
| Profitability | revenue − variable costs − fixed costs − required minimum profit |
| Pricing | price − variable cost − (minimum margin × price) |

All numerical values are parsed as fixed-point decimals; no floating-point arithmetic is used inside the Worker rule evaluator. Pricing policy is also checked using the exact margin ratio in the original rule engine. RCA uses pricing's **monetary margin above the policy** instead, to put contributions in comparable units and preserve a zero decision boundary. Pricing values use a single product unit; other examples use their scenario financial units (currency is not asserted).

An important limitation: an independent financial rule is **not** an independent answer for unrestricted financial decisions. It only establishes compliance with the stated scenario constraint.

### 2. Numeric allocation for simultaneous changes

Let `B` be baseline, `N` be updated state, `D` be the set of changed numerical fields, and `f(S)` be rule cushion.

For each changed field `i`, compute its factorial-weighted marginal contribution across subsets of other changed fields:

```
phi_i = Σ_{T ⊆ D\\{i}} [ |T|! (n-|T|-1)! / n! ]
                   · [ f(B changed on T∪{i}) − f(B changed on T) ]
```

The sum over all contributions equals `f(N) − f(B)` before display rounding. This is a finite Shapley-style allocation. ECHOS uses exhaustive subsets only because the demo supports at most four financial variables per domain. **No causal or counterfactual real-world claim is inferred** from the allocation; it is solely a decomposition of a stated formula under changes to input values.

This matters when multiple updates offset one another:

- Initial liquidity rule cushion: 300,000.
- Supplier payments rise by 150,000 (cushion impact −150,000).
- Cash rises by 150,000 (cushion impact +150,000).
- Final cushion remains 300,000, and the rule-based decision remains the same.
- The system still identifies both changes and records that the decision was reassessed.

### 3. Evidence is a separate boundary

A field has an evidence status: `verified`, `missing`, `disputed`, `expired`, or `unverified`.

When an input required by a rule is not marked `verified`, the reference decision becomes **REQUEST_EVIDENCE** even if its numeric calculation appears positive. The UI explicitly states that these statuses are **asserted by the user**, not authenticated by the app.

Thus, changes in financial numbers and changes in evidential availability are **not collapsed into one score**.

### 4. Plain-English decision brief

The Worker adds `insights` alongside the previous `oracle` response in `/api/evaluate`:

```
{
  "insights": {
    "title": "The numbers changed, but the decision can stay",
    "summary": "...",
    "rule_cushion_before": "300000",
    "rule_cushion_after": "300000",
    "contributors": [
      { "field": "cash", "impact": "150000", "direction": "increases_cushion" },
      { "field": "supplier_due", "impact": "-150000", "direction": "reduces_cushion" }
    ],
    "evidence_status": "all_marked_verified",
    "next_step": "..."
  }
}
```

The response remains compatible with existing 0.1 clients because `oracle` and `case` retain their previous structure. The financial-reference engine remains separate from any AI answer being scored.

## Test cases

New automated tests cover:

- Two changes that exactly offset each other.
- Nonlinear pricing interactions among price, cost, and margin policy.
- Evidence disappearing while numeric financial impact remains unchanged.
- API explanation accuracy and invalid-input rejection.

The existing Python research engine remains at its earlier algorithmic capabilities; this 0.2 user-explanation module currently operates in the Cloudflare JavaScript Worker. The Python reference and JavaScript rule classifications were previously cross-tested on all 44 existing scenarios; a fresh parity test is required after any change to financial reference rules.

## Roadmap: the genuine next-generation research challenge

The 0.2 algorithm is a real usable, **small-domain explanatory evaluator**. The next research phase should implement:

1. Versioned, dated and traceable evidence extracted from actual authorized financial documents.
2. Validated financial dependencies spanning multiple budgets, cash-flow schedules, counterparties, constraints, and time periods.
3. Controlled scenario generation based on those dependencies, with reference cases reviewed by financial experts.
4. Search for small financial changes that expose an AI's incorrect response, across new, unseen scenarios.
5. Blind evaluation of independent AI models and human–AI teams with an answer key that is not exposed in the demo.
6. Function-specific authority and review recommendations only after empirical validation.

No present finding establishes patent novelty, model superiority, or financial-advice reliability. Publish further technical IP only after an appropriate patent-disclosure review if patent protection is intended.