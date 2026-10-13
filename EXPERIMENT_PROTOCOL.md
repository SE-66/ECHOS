# ECHO-TRACE comparative validation protocol — proposed research study

## Main empirical proposition

**H1 (falsifiable)**: At matched test budgets and with common target AI systems, ECHO-TRACE-guided evaluation detects a greater proportion of independently verified financial decision-transition failures than a conventional static question-answering test suite and than a non-adaptive randomized paired-scenario suite.

The prototype itself has **not** tested H1. An absence of a significant difference is not evidence of equivalence; prespecify equivalence margins if desired.

## What exactly gets compared

A. **Static accuracy comparator:** one financial state at a time, same source facts, reference action checked, without an explicit baseline-to-updated relation test.

B. **Paired random comparator:** identical eligible financial state-pairs sampled randomly, evaluate change recognition and final decision.

C. **Paired boundary-stratified comparator:** same eligible cases, stratified by materiality, margin from decision boundary, evidence adequacy and domain.

D. **ECHO-TRACE adaptive comparator:** select paired cases based on predefined coverage and previous observed failures, with exactly the same available candidate pool and total query budget as B/C.

Do not compare a weaker prompt in A with a richly instructed prompt in D without independently accounting for that difference. Include a matched-format, matched-budget sensitivity analysis.

## Case development and independence

- Use at least four domains: budget, pricing, liquidity and profitability; recruit expert financial controllers to review rules, assumptions, source documents and action rubrics.
- Define a full reference set of **valid** and **invalid** decision responses, rather than assuming a single action where multiple are defensible.
- Include irrelevant, relevant/non-action-changing, action-changing, policy-changing, evidence-missing, joint-change and near-boundary families. Include temporal order and conflicting evidence in the next study release.
- Partition by *underlying case family and source company*, not merely by individual variation, to avoid train/test contamination.
- Produce a held-out, externally authored evaluation set. Conceal scenario labels, boundary status and reference outcomes from tested agents.
- Freeze test data and scoring rules before collecting results; record all revisions and excluded cases.

## Experimental factors

- Target models: at least three independently operated real models; specify model IDs/build versions, decoding settings, prompt templates and tool access.
- Repetitions: at least five independent runs per case/model/condition, with run IDs and complete structured outputs.
- Decisions: model-only first; human-only and human+AI are separate, participant-recruited studies with appropriate ethical consent and preregistration.
- No external browsing unless all compared conditions receive the same tools and information.
- For risk of contamination, record any training/fine-tuning access to the test set and treat these runs separately.

## Primary end point

**Verified failure discovery yield per 100 model calls:** number of distinct externally adjudicated decision-transition failures discovered, divided by target calls used, with all duplication rules preregistered. Also compare **failure family coverage** and boundary-near miss rates.

## Secondary measures

- Updated action accuracy conditional on scenario family
- Correct recognition of changed fact/rule/evidence fields (precision/recall)
- Evidence deficit recall / false alarm rate
- Contextual adaptation sensitivity and stability (report separately before any composite ACBS)
- Decision-context adequacy, conditioned on evidence status (proposed DCAG operationalization)
- Cost and wall-clock runtime per verified failure; reproducibility across repeats
- Calibration, refusal/abstention appropriateness and response variance

## Adjudication and analysis

For deterministic rule scenarios, validate by an independent exact decimal implementation. For judgmental scenarios, use >=2 blinded expert adjudicators, record disagreements and arbitrate under a prespecified rubric; do not treat an LLM judge as conclusive ground truth.

Use a hierarchical model or cluster bootstrap at the source-case level to respect within-case and within-model dependence. Report confidence intervals, effect sizes and error decomposition; use multiple-comparison control for secondary tests. To compare discovery strategies, randomize their order and use equal call budgets. Include ablations removing (1) evidence modelling, (2) dependency mapping, (3) boundary selection and (4) adaptive selector. Track reviewer time separately from model-call cost.

## Success/failure gates

1. **Engineering reliability:** invariant checks and regression tests pass; no answer-key leakage; reproducible exports; deterministic reference computations.
2. **Construct validity:** subject-matter experts agree that scenarios and expected responses operationalize the claimed concepts; inter-rater agreement measured.
3. **Incremental utility:** better verified failure yield or reduced cost against strong baselines on *held-out* cases, with uncertainty quantified.
4. **Generalizability:** results persist on independently created, multi-domain and real-document cases.
5. **Patent investigation:** only after a concrete technical implementation has emerged, compare with patent claims and prior art; distinguish commercial value from patent eligibility.

## Appropriate conclusions

A positive result would show a *measured empirical improvement under the defined experimental conditions*. It would **not** prove universal financial understanding, superiority to every competitor, or patentability.