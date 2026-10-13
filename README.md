# ECHO-TRACE — Evidence-Conditioned Decision-Transition Engine

**Version:** 0.1.0 (October 2026) · **Maturity:** functional methodological prototype, not validated commercial software

A runnable, dependency-free Python application for building and independently evaluating financial decision transitions. It implements the research distinction between change detection, financial relevance, evidence adequacy, justified decision adaptation, and appropriate stability.

> **Repository status:** Local Python research prototype + deployable Cloudflare Workers demonstration. See [CLOUDFLARE_NOTES.md](CLOUDFLARE_NOTES.md). This repository is public; publishing source can affect future patent options. No open-source license has been granted.

## Deploy on Cloudflare Workers

The repository now includes `wrangler.jsonc`, a JavaScript Worker (`src/index.js`) that ports the four deterministic research models, and static browser assets (`public/index.html`). Existing Cloudflare Git deployments can use **`npx wrangler deploy`** from the **repository root**. See [Cloudflare deployment instructions](CLOUDFLARE_NOTES.md).

To preview locally with Wrangler:

```bash
npm install
npm run dev
```

To run Cloudflare Worker tests:

```bash
npm run test:worker
```

The Worker and Python versions are separate implementations. Python remains the reference research engine, and the public Cloudflare UI is **not** a secure blind test.

## Run the Python app

Requires **Python 3.10+**. No external packages, paid APIs or training needed.

```bash
git clone https://github.com/SE-66/ECHOS.git
cd ECHOS
python web_demo.py
```

Open **http://127.0.0.1:8765** in a browser. The interactive local app lets you:

1. Select **liquidity**, **pricing**, **budget**, or **profitability**.
2. Change financial inputs, policy thresholds, evidence status, or just the report title.
3. View independently calculated expected actions, constraint slack, provenance certificates, and the effect of the change.
4. Paste an AI's JSON answer and compare it with the rule oracle. The oracle is recalculated server-side.

This app uses **synthetic example rules**. It does not connect to live company data, AI APIs, bank accounts, ERP software, or the internet. It makes no irreversible or financial transactions. The Python app binds to localhost, while a separate JavaScript implementation is available for Cloudflare.

## Run regression tests

```bash
python -m unittest discover -s tests -v
```

## Run synthetic demonstration (not a real AI evaluation)

```bash
python echo_trace.py demo --target naive --output output/naive_demo
python echo_trace.py demo --target reference --output output/reference_demo
python echo_trace.py demo --target sticky --adaptive --budget 20 --output output/adaptive_example
```

Each command produces `.json` and `.md` reports. Four mock targets exist (`reference`, `naive`, `sticky`, `reactive`) solely to exercise evaluation code. Their scores say **nothing** about any actual AI model, Giskard, Patronus, or any competitor.

## Evaluate a real AI model manually without writing an API connector

Export public test cases and an **independent private key**:

```bash
python echo_trace.py export --cases output/public_cases.jsonl --key output/private_key.jsonl
```

The public file contains 44 unlabeled cases. It includes **no expected actions, correctness labels or scenario categories**, and case IDs are opaque. The separate private answer key must **never** be shared with the tested model or committed to a public repository. (Even case order should be randomized for formal independent testing.)

Send the **public records** to the AI you want to test, asking for the specified JSON shape. Collect responses in a JSONL file, one per row. Format:

```json
{"id":"ET-<opaque_id_from_public_cases>","answer":{"baseline_action":"APPROVE_WITHIN_RULE","updated_action":"DEFER_OR_FINANCE","changed_fields":["supplier_due"],"evidence_deficits":[],"reassessed":true,"explanation":"..."}}
```

Each answer's `id` **must** be copied from the relevant public case. The example action labels above are illustrative and may not be correct for the chosen case.

Then run:

```bash
python echo_trace.py score --answers output/my_ai_answers.jsonl --output output/my_ai_results
```

The scoring engine computes: baseline and updated action correctness, exact change detection, evidence-gap identification, declared reassessment, under/over-response and unsupported certainty. It also distinguishes action-adaptation, action-stability and evidence-abstention rates. Other measurements need independent validation.

### What is the AI actually answering?

Each exported case includes the decision question, explicitly specified corporate rule, a baseline financial state and a changed financial state. In the experiment, the model is *not* told the perturbation category or reference action. Its response is assessed against an independent formula with a mandatory evidence-abstention rule. The app tests **observable outputs**, not private internal reasoning.

## Technical design

Read **ALGORITHM_SPEC.md** for the architecture, formal definition, research link to ECHO, ACBS and DCAG, prior-art risks, patentability boundaries, test designs and development roadmap.

```
ECHOS/
├── echo_trace.py                 # Engine, deterministic oracle, generator, scorer, CLI
├── web_demo.py                   # Local Python 1-page browser app and rule-server
├── wrangler.jsonc               # Cloudflare Workers deploy configuration
├── package.json                 # Wrangler developer command
├── src/index.js                 # Cloudflare Worker rule and scoring API
├── public/index.html            # Cloudflare browser UI
├── cloudflare-tests/worker.test.js # Cloudflare adapter tests
├── ALGORITHM_SPEC.md             # Research/engineering design and novelty hypotheses
├── README.md                     # This file
├── CLOUDFLARE_NOTES.md          # Future deployment plan and security requirements
├── .gitignore                   # Excludes output/ and private answer keys
├── tests/test_echo_trace.py      # Regression tests
└── output/ (generated locally, NOT committed)
    ├── public_cases.jsonl       # Inputs WITHOUT evaluation labels
    ├── private_key.jsonl        # Answer key — keep confidential
    ├── naive_demo.{json,md}     # Synthetic baseline; NOT actual AI results
    └── reference_demo.{json,md} # Perfect synthetic reference; sanity test only
```

## Limitations / protections required before any paid deployment

- These are *toy but internally consistent* rule models. They cover neither real-world cash-flow timing in full nor contractual rules, accounting standards, probabilistic costs, multiple objectives, or uncertain forecasts.
- Evidence statuses are **asserted**, not authenticated. In production, use signed data ingestion, provenance, as-of dating, policy versions, and document verification.
- The four domains share manually specified financial dependencies. General organization-specific decisions require a validated modeling language, safe expression engine, units/currencies, and temporal semantics.
- The reported Wilson intervals assume independent Bernoulli observations; these intentionally correlated cases do **not** justify generalization to populations of decisions.
- The adaptive selector is a transparently specified **heuristic**, not a demonstrated improvement over random, metamorphic or commercial testing frameworks.
- The scorer checks structured declarations, not whether internal model explanations are faithful. Human review is necessary for non-rule-based financial judgments.
- Production use needs authenticated APIs, encrypted data storage, GDPR/client-specific privacy requirements where applicable, versioned evaluators, abuse controls, licensing, human oversight, and independent validation.
- We do **not** assert novelty, freedom to operate, patentability, outperformance of competitors, or safety for autonomous financial execution.
- **Do not publish full implementation if you are preserving a potential patent filing strategy without consulting patent counsel.**

## Source basis

Design was grounded in the supplied doctoral proposal *AI Behaviour in Financial Decision-Making Under Changing Decision Environments*, especially decision-state transitions, representation/evidence adequacy (DCAG), contextual sensitivity/stability (ACBS), human–AI verification and authority allocation. ECHO is treated as the user's named theoretical program, not as a formally validated external theory.

External approaches informed the differentiation analysis: FinanceBench (finance QA), Giskard (scenario/metamorphic testing), Ren–Byun–Wilder (decision-focused distribution shift), 2026 metamorphic-testing survey, and NIST AI RMF Measure function. See ALGORITHM_SPEC.md for links.