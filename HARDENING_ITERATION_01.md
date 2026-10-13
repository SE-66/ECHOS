# ECHOS Hardening Iteration 01 — Cross-stage consistency, observation provenance, coverage challenge

13 October 2026. Engineering correction arising from ECHOS Adversarial Audit (2026-10-13).

## Implemented
- Propagates unresolved assessments and unknown comparison cells into workflow-level open issues. A disputed numeric observation cannot return a clean workflow status merely because the separately declared decision-bank review is complete.
- Requires a structured observation proof mapping for each scenario, alternative, and criterion cell. Reports missing source links, missing calculation/derivation, missing period, and missing entity. Rejects unknown source identifiers, duplicates and extraneous proof links. A source marked reviewed is still *declared* provenance, not authenticated evidence.
- Requires a coverage review containing reviewer, review date, source reference, and an entry for each of eleven categories: financial, contractual, legal, policy, approval, tax, operational, timing, evidence, alternatives and scenarios. Each area requires a finding, rationale and source reference. Unresolved areas keep the workflow blocked from a clean declaration.
- Keeps `action_justification='not_independently_established'` regardless of model output; rule passes are conditional calculations, not permission to act.
- Corrects the checked-in integration test syntax fixture and updates its expectations to require explicit coverage review.

## Local verification
In a clean local package with the existing step 1–5 source modules, `node --test cloudflare-tests/hardening.test.js cloudflare-tests/workflow.test.js` resulted in 14/14 passing. Existing original audit regression checks were rewritten into affirmative requirements. This does NOT establish full repo regression success, live deployment or financial/legal validity.

## Remaining blockers (not addressed)
- Automatically discovering omitted company-specific legal, policy or financial obligations.
- Independent authentication of legal rules, contracts, accounting data and reviewer identity.
- Numerical derivation verification, currency/entity/period dimensional validation, linked financial forecasts.
- Rule precedence, legally meaningful exceptions and definitive authority determination.
- Actual human and multi-model trials, preregistered expert reference judgments and independent holdout scenarios.

These safeguards prevent some premature conclusions but do not establish completeness. Absence of detected gaps does not imply completeness of the real-world decision environment.