# ECHOS — Hardening Iteration 03

This iteration adds passage-level requirement candidates to the integrated workflow.

`src/passage-engine.js` provides `inspectPassages`: every passage has a known source ID, excerpt, optional claim, locator, entity, jurisdiction, declared effective period and explicit criterion/alternative mappings. The engine reports candidate modality (`claimed_obligation`, `proposal`, `exception`, `historical`, `hypothetical`, `permission`, `prohibition`, or `ambiguous`) and relevant cues, date flags, and missing metadata. Effects on alternatives are *candidate links*, never proven financial impacts.

`src/workflow-engine.js` accepts `evidence_passages` and reports results under `passage_review`. Claimed obligations, prohibitions, exceptions and ambiguous passages are escalated to workflow open issues. Unmapped criteria and alternatives are also flagged.

Limitations: classification uses transparent English phrase heuristics; source passages and metadata are caller-supplied. No legal enforceability, source authenticity, precedence, independent semantic comprehension or exhaustive discovery is established. The engine does not automatically block an option on the strength of an excerpt alone.

Twelve focused local tests passed. A separately annotated expert corpus and full repository tests are still required.