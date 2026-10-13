# ECHOS v0.6 — Integration and real-pilot protocol

## Implemented

`POST /api/workflow/evaluate` accepts a `case` (Step 1), `annotations` (Step 2), `graph` (Step 3), `decision` (Step 4), and `provenance` links from decision criteria to claims/graph nodes. Each existing engine is called independently. The output contains stage-level audit trails and warnings when links are unmapped or evidence is uncertain.

**Important:** This is **not** autonomous generation of decision models. Users/researchers must still supply and independently review contextual annotations, links, criteria, scenario values, and their provenance. A successful linked status does not certify a law, contract or financial assumption.

`POST /api/workflow/evaluate` is a *public demonstration* API: do not provide confidential company data or participant identity. Experiment secrets and independently verified reference keys belong in controlled local infrastructure, not public Cloudflare assets. The optional `experiment` option suppresses private keys in API output; prefer the local CLI for scientific studies.

## Pilot study setup: separately implement and recruit

Target initial **pilot**, not an asserted sample-size calculation: 3–4 AI systems, 8–12 finance professionals and 20–30 expert-reviewed baseline decisions, with multiple changes across liquidity, procurement, budget, pricing and governance/policy conditions. Recruit consenting adults using institutional ethics/IRB and data-processing approvals, as required. Do not upload real personal/client records into public demos. Use synthetic or appropriately de-identified scenarios.

Balance the experimental conditions: human-only, AI-only, human using AI, and AI with structured human review. Randomize case order and control case difficulty, response budget, access to tools, context, and feedback. Blind subjects to change taxonomy and expected action; blind assessors to condition when feasible. Avoid contamination between baseline and change tests and disclose limitations of cross-condition learning.

Obtain independent expert ratings and deterministic rule checks where appropriate. For ambiguous cases use multiple defensible responses and document adjudication/disagreements. Pre-register primary outcomes: appropriate decision adaptation, appropriate stability, evidence restraint, missed change, overreaction, underreaction, and incomplete responses. Report per-category counts and uncertainty intervals rather than a single 'trust score'. Test the human/AI delegation hypothesis only after observable performance is established.

Measure inter-rater agreement and model run-to-run variability. Perform repeats with controlled temperature/seed where supported. Add comparisons against unstructured prompt evaluation and standard paired counterfactual testing. Use held-out cases and avoid tuning against the test set.

## What remains unbuilt

Automated document interpretation and true cross-stage model construction; a participant study interface; multiple external provider adapters with cost/consent guardrails; authenticated private test-key storage; experimental randomization, participant enrollment, expert review and formal statistical analysis. No real human participants or commercial AI models were tested as part of this integration.