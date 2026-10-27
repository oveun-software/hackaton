# TalentLens — submission notes

## Problem and distinctive behavior

Recruiters and small hiring teams need to connect role requirements with professional evidence, understand gaps and retain context across vacancies. TalentLens extracts atomic criteria, presents a clickable evidence matrix and asks a concrete next question where support is missing or unclear. A recruiter can record an attributed answer, rerun the review and inspect exactly what changed. H-MEM can retrieve that source for a later vacancy after restart.

Nemotron performs semantic interpretation and recommendation. A separate call critically reviews the draft against the sources. Application code checks identifiers, coverage and literal quotations; it implements no candidate score, percentages or automatic hiring/rejection. A matching citation establishes traceability, not the truth of a statement. Four interface/report languages preserve the original source wording.

## Sponsor contribution

| Technology | Implemented contribution | Evidence |
| --- | --- | --- |
| NVIDIA Nemotron | Atomic requirements, comparison, questions and critical review | Actual Nemotron 3.5 Lightning executions, source validation and receipts in the workflow and evaluation |
| Meterless Nightshift | Primary authenticated AI provider, routing, structured streaming and actual-model checks | Ten real calls in the latest clarification/restart/comparison workflow; all four evaluation groups also executed |
| Meterless H-MEM Engine | Persistent source-backed memory, hybrid retrieval, version lineage, conflict review and Trust Ledger | 13/13 official checks at pinned revision 1742dec56a66e58eef9dda2d2b865823758ca8cd; restart, attribution, deletion and dispute tests |
| Zetaris | Data layer joining fictional profile/document sources, fresh bounded Lightning REST query before analysis and visible provenance | Real deployment/import verified previously; new fresh-query route covered by six simulated workflow tests. See [current verification status](ZETARIS-WORKFLOW.md) |
| Cursor | Optional environment under the current rules | Installed with the official Codex extension; installation alone is not claimed as Cursor-built development |

## Reproducible evidence

- **50/50 application tests**, with mocked external transport: exact-source validation, critical review, questions, translation invariants, conflict exclusion, attribution across restart, deletion and in-flight invalidation.
- **13/13 official H-MEM checks:** pinned and hash-verified runner, also run in CI.
- **16 fictional cases / 32 assessments:** actual Nemotron output matched all authored expectations, with zero unsupported positives in this set. One CV instruction attack did not inject its marker. The critical review changed zero evidence cells; no incremental quality improvement from it is claimed. [Method](../evaluation/README.md), [outputs and receipts](../evaluation/results.json).
- **Real clarification workflow, 26 October:** three reports, restart and paired no-memory condition. Sam's TypeScript evidence changes from unclear to supported after an attributed answer. In the later role, the earlier source is retrieved and cited; the current-CV-only result remains unclear. Ten calls retain actual model and receipt IDs. One stochastic comparison is illustrative, not a general causal estimate. [Recording](../examples/zetaris/verified-review-workflow.json).
- **Guided fictional-CV pilot:** timed manual/assisted rounds, random task/order assignment, actual answers and local JSON export. Implemented without inventing recruiter participants, observations or productivity gains. [Protocol](../evaluation/RECRUITER-PILOT.md).

Run `npm run demo` using only Node.js, without API keys or accounts. This mode makes no AI requests and is labelled as saved execution. Fresh inference uses `npm run evaluate` and `npm run verify:review` with each developer's configured services.

For judges, the [clean-clone walkthrough](JUDGES.md) distinguishes the offline viewer, automated checks and new inference. [Four paired scenarios](../examples/judges/README.md) expose exact English role/CV inputs, real outputs, citations and model receipts; the first three are entirely English, and the fourth adds a deliberate Spanish-source test. `npm run test:recordings` checks these exports against the authoritative evaluation. No demo user or shared account is needed for the local app.

## Provenance and track

TalentLens is new application code inspired by OVEUN's pre-existing Cora recruiting concept. No Cora product code, accounts, databases, indexes, documents or services are reused. Development used Codex desktop. The proposed track is **Wildcard / Tinkerer**, reflecting the existing concept. No track or development-tool award is claimed as selected in the portal.

## Delivery status and requirements

The [delivery package](../submission/README.md) includes the English draft, ten-slide editable PowerPoint, PDF, product captures, fictional inputs and recorded outputs. The repository is public with owner authorization. **No video has been produced, no candidature submitted and nothing marked complete.** The current HackOS account is a member; only the team leader can create/manage submissions. Maria Rodriguez must review and transfer the prepared content using her account.

The [Official Rules updated on 23 October 2026](https://hackathon.genai.works/resources?id=01a08ff1-54cc-709a-bfe7-6b34452b676b), sections 8.1 and 10.1, require Zetaris, at least one working Meterless Engine and Nightshift as the primary AI provider. NVIDIA connects through Nightshift; Cursor is optional. Deliverables include public source/setup instructions, a 1–4 minute video, slides and sponsor explanation. Recorded examples, traces and offline sample mode are recommended. The [Technical Execution Guide](https://hackathon.genai.works/resources?id=01a08ff1-54b1-7670-9441-a1e73ff43a6e) defers to the Rules. Deadline: **27 October 2026, 23:45 UTC**. Recheck organiser notices before final submission.
