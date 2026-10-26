# TalentLens application draft

**Prepared for review, not submitted. Video intentionally excluded.**

The current HackOS account is a member. On 26 October the Submission Hub stated that only the team leader can create/manage submissions. Maria Rodriguez must review and transfer this content. These are ready-to-paste sections, not a claim that inaccessible portal fields have been filled. Adapt them to the leader's actual form and character limits.

## Title and short description

**TalentLens**

An AI recruiting workspace that connects each job requirement to CV evidence, asks the next useful question and shows what changes when a recruiter adds context.

## Problem and target users

Recruiters and small hiring teams must compare nuanced requirements with documents, explain their shortlist and identify what to ask next. Prior conversations lose context when another vacancy opens. A generic compatibility percentage does not show whether a claim is supported, ambiguous or absent. TalentLens brings those distinctions, sources and human-controlled next steps into one workspace.

## Solution

TalentLens imports an authorised Zetaris view or text-based PDF, DOCX and TXT CVs. After explicit consent, Nemotron extracts atomic requirements, compares every supplied candidate and critically reviews the draft against original sources. A clickable matrix exposes exact quotes, explanations and concrete follow-up questions.

A recruiter records an authorised answer or observation as a separate attributed source, preserving the CV. Reanalysis shows changed assessments and citations. H-MEM retains source-backed context for later vacancies, with document versions, dispute review and deletion. An attributed statement is not independently verified truth. The model proposes; a human chooses the next step. There is no local candidate scoring engine or automated hiring/rejection.

English, Spanish, French and German cover controls, errors, illustrations, report narratives and exports. Translations preserve source quotations, statuses and ordering.

## Agent workflow and architecture

1. Zetaris joins separate fictional profile/document sources into a candidate view; TalentLens reads it through Lightning REST with a SELECT-only user.
2. Nemotron extracts independent required/preferred criteria through Nightshift.
3. H-MEM retrieves relevant earlier context scoped to the organisation and current candidates. Source verification and conflict exclusion happen before prompt construction.
4. Nemotron drafts the comparison; a separate Nemotron call critically reviews claims, negations, contradictions and gaps.
5. Application code validates IDs, full coverage and literal quotes against the identified source. A failed stage has one bounded correction, up to six calls for a new role.
6. The recruiter opens evidence, records a clarification and reruns. Stable requirements allow a meaningful before/after comparison.
7. SQLite persists reports, attributed sources and H-MEM/Trust Ledger state. Deletion and source changes invalidate in-flight requests.

Stack: Node.js 22+, Express 5, built-in SQLite, native JavaScript/CSS, bounded child-process document extraction, Zetaris Lightning REST, Meterless Nightshift, NVIDIA Nemotron and a persistent Meterless H-MEM implementation.

## Sponsor contributions

**Zetaris:** real data layer joining profile and CV sources; bounded read-only REST import with provenance.

**Nightshift:** primary authenticated provider, streamed structured result tool, actual executed model checks and retained receipt IDs.

**H-MEM Engine:** source-backed professional context across restarts and vacancies, hybrid retrieval, document/version lineage, conflict exclusion and human resolution. Official conformance passes 13/13 checks at revision `1742dec56a66e58eef9dda2d2b865823758ca8cd`.

**NVIDIA Nemotron:** requirement interpretation, semantic comparison, targeted questions and separate critical review. The verified model is `nvidia/nemotron-3.5-lightning-30b-a3b`. Application code validates output rather than inventing a parallel hiring score.

## Verification and measured limits

- **36 application tests** with mocked external transport: coverage and exact citations, critical review, translation integrity, clarification lifecycle, attribution across restart, conflicts, privacy deletion, source replacement and in-flight invalidation.
- **13 official H-MEM checks**, pinned and SHA-256 verified in local and CI runs.
- **16 fictional profiles, 32 criterion/candidate assessments:** real Nemotron output matched all authored expectations; zero unsupported positives in this set. Covers interest versus experience, negation, contradiction, adjacent skills, leadership versus participation, Spanish evidence and one CV instruction attack. The critical pass changed zero cells, so no incremental quality gain is claimed. Full outputs, model receipts and dataset hash are in `evaluation/results.json`.
- **Live clarification/restart workflow on 26 October:** three reports plus a current-CV-only comparison, ten actual Nemotron Lightning calls. Sam's TypeScript evidence changes from unclear to supported after an attributed answer. After restart, a later role retrieves and cites that answer; the paired no-memory result remains unclear. One stochastic comparison illustrates source access, not average causal benefit. Evidence: `examples/zetaris/verified-review-workflow.json`.
- **Guided fictional-CV pilot implemented:** two timed manual/assisted rounds with random task/order assignment, actual answers and local JSON export. No real recruiter participants or productivity gains are asserted. Source-location accuracy and question quality require human observation.

The authored evaluation is small and is not an independent benchmark, fairness certification or hiring-outcome study.

## Judge demonstration

Run `npm run demo` from a clone with Node.js 22.16+. No sponsor credentials, dependency installation or API requests are needed for the recorded viewer. Explore before/after clarification and retained context, inspect a source, then try the guided CV review. Saved outputs are explicitly labelled recorded. Fresh inference is separately reproducible with the individual setup instructions and `npm run verify:review`.

Judge walkthrough: https://github.com/oveun-software/hackaton/blob/main/docs/JUDGES.md . Four paired job/CV inputs and real outputs, including three entirely English scenarios: https://github.com/oveun-software/hackaton/tree/main/examples/judges . TalentLens runs locally without a demo login; sponsor credentials are needed only for new live inference.

## Novelty, provenance and tools

TalentLens is new code inspired by OVEUN's pre-existing Cora concept. It reuses no Cora code, accounts, databases, indexes, documents or services. Development used Codex desktop. Cursor is installed with its official Codex extension, but installation alone is not claimed as a Cursor-built product award.

Proposed track: **Wildcard / Tinkerer**, subject to the leader confirming the exact portal option.

## Current limits and future work

Local single-user prototype, one configured organisation per process, no production authentication. Up to 25 CVs and 200,000 source characters per analysis; scanned documents need OCR. Literal citations establish traceability, not truth or guaranteed fairness. Next: real recruiter observations, broader quality/bias evaluation, production access control and OCR. No measured productivity or real hiring outcome is claimed.

## Links and materials

- Repository and setup: https://github.com/oveun-software/hackaton
- Team accounts: https://github.com/oveun-software/hackaton/blob/main/docs/TEAM-SETUP.md
- PowerPoint: https://github.com/oveun-software/hackaton/blob/main/submission/TalentLens-Deck.pptx
- PDF: https://github.com/oveun-software/hackaton/blob/main/submission/TalentLens-Deck.pdf
- Evaluation: https://github.com/oveun-software/hackaton/tree/main/evaluation
- Sponsor/provenance notes: https://github.com/oveun-software/hackaton/blob/main/docs/SUBMISSION.md
- Video: **leave blank**. No video or placeholder URL has been created.
- Hosted app: none. The account-free recorded viewer runs locally; do not enter localhost as a public demo URL.

## Leader's draft-saving procedure

1. Open https://hackathon.genai.works/submissions using the leader's own account.
2. Confirm the roster: Ariana García, Maria Rodriguez and Diego Rodríguez Domínguez. The rules say the roster locks when the first submission is created.
3. Create a draft only if the portal explicitly offers that state. Copy/adapt the sections and attach/link the slides.
4. Keep video blank. If mandatory even for a draft, retain this file and stop before final submission.
5. **Do not press Submit, Finalize, Complete, Mark completed or equivalent.** Do not accept new legal terms for someone else.
6. Keep the candidature pending until the user authorises delivery. Published deadline: 27 October 2026, 23:45 UTC (28 October, 00:45 in mainland Spain).

Sources: [Official Rules updated 23 October](https://hackathon.genai.works/resources?id=01a08ff1-54cc-709a-bfe7-6b34452b676b), [Technical Execution Guide](https://hackathon.genai.works/resources?id=01a08ff1-54b1-7670-9441-a1e73ff43a6e). Check current notices before final submission.
