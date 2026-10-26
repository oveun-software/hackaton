# Evidence review and documented clarification

TalentLens helps a recruiter inspect what a candidate's sources support, identify what remains unclear, and record the next useful clarification. It does not make a hiring decision or compute a candidate score.

## Working product flow

1. Import fictional CVs from Zetaris or upload authorised documents.
2. Nemotron extracts atomic professional requirements: independently checkable skills have separate rows. Required and preferred criteria retain their meaning.
3. Source-verified H-MEM context is retrieved for the current organisation and candidates. Open disputes, superseded facts and review-tagged memories are excluded.
4. Nemotron drafts a comparison with exact source quotations and document IDs.
5. A second Nemotron call critiques the draft against the original sources, including negations, interest versus experience, contradictory statements and injected instructions. It returns the final report and concise observations, not private chain-of-thought. This pass can still make mistakes.
6. The application validates every candidate, requirement, citation and source ID. Unclear/missing rows need a concrete follow-up question. One bounded correction is permitted per model stage; failure returns an error rather than a fabricated result.
7. Open a matrix cell to inspect the source, highlighted quote, explanation and next question. Record an authorised candidate statement or recruiter observation with a source reference.
8. Explicitly consent and rerun. The report shows changed evidence states/citations compared with the prior report for the same role and language. Previously extracted requirements are reused only for an unchanged role description and a current version-2 report.
9. Source-backed clarification evidence can become H-MEM context for another role. The UI labels it as an attributed statement, not independently verified truth.

## Data and lifecycle

- Clarifications are separate `candidate_document` records, with `kind: clarification`, candidate, vacancy, question, source type, reference and recording time. The current CV is not overwritten.
- Current-role clarification sources enter that role's prompt directly. Another role receives earlier clarification evidence only if H-MEM retrieves it.
- A repeated analysis cannot clear an open memory conflict. Both ingestion and retrieval enforce this guard, including records written by older app versions.
- Missing evidence means an unresolved knowledge gap, not inability. Sources can be inaccurate; an exact citation establishes traceability.
- A source/candidate deletion removes relevant memories, snapshots and generated commentary, review findings, follow-up questions and history changes. In-flight requests are invalidated on source changes.
- `matchedMemoryIds` means a final citation also appears in supplied memory. It is not proof of causal model use. Legacy `usedMemoryIds` remain readable in historical artifacts, with the same qualified UI wording.
- Progress labels reflect actual backend stages, not a simulated completion percentage.

## Reproduction

```sh
npm test
npm run test:recordings
npm run test:hmem:conformance
npm run evaluate
npm run verify:review
npm run demo:publish-recording
```

The first three commands use no external inference. The last three require the separately configured services and call the provider. The configured NVIDIA development endpoint does not provision paid infrastructure; service availability and quotas still apply.

The real workflow script checks the exact public fictional Zetaris fixtures before inference, uses an isolated temporary database, records actual model/receipt IDs, restarts the application, and compares a second-role result with a no-memory run. It does not operate on the user's normal workspace database.

The recorder translates narrative fields to Spanish, French and German while preserving source quotations, statuses, ordering and provenance. The static viewer at `public/showcase.html` makes no AI calls and has no account dependency. It is explicitly a recorded execution, not a live agent.

## Limits of the evidence

The memory comparison is one stochastic run per condition. It illustrates access to a missing historical source; it does not establish average quality, latency or token savings. The 16-case evaluation is a small maintainer-authored diagnostic set. Independent recruiter testing, production authentication and OCR remain outside the current prototype. See the [evaluation protocol](../evaluation/README.md) and [recruiter pilot](../evaluation/RECRUITER-PILOT.md).
