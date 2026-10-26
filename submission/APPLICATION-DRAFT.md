# TalentLens application draft

**Status: prepared for review, not submitted. Video intentionally excluded.**

The signed-in HackOS account is a team member. On 26 October, the Submission Hub stated: “Only the team leader can create and manage submissions.” Maria Rodriguez must create/save the team's draft. The form itself is not accessible to members, so the sections below are ready-to-paste content, not a claim that the portal fields have been filled. Match them to the leader's actual form and its character limits.

## Project title

TalentLens

## Short description

An AI recruiting workspace that connects job requirements to CV evidence, explains candidate recommendations and remembers verified professional facts across hiring processes.

## Problem and target users

Recruiters and small hiring teams must compare CVs against nuanced role requirements, explain their shortlist and identify what to ask next. Relevant experience is scattered across documents, and earlier reviews lose context when a new vacancy opens. TalentLens brings the job description, original CV evidence, unresolved questions and recruiter-controlled next steps into one workspace.

## Solution

TalentLens imports an authorised candidate view from Zetaris or accepts text-based PDF, DOCX and TXT CVs. After explicit consent, NVIDIA Nemotron reads the job description, extracts requirements and compares every supplied CV. It proposes qualitative recommendations with literal source quotations, evidence gaps and interview questions. The application validates identifiers, candidate and requirement coverage and exact quotations before saving a report. It preserves the model's ordering and implements no separate candidate scoring or automatic hiring/rejection logic. Recruiters inspect the documents and choose the next step.

The interface supports English, Spanish, French and German, including its illustrations, errors and exports. Report translation preserves decisions, source quotations and evidence statuses.

## Agent workflow and architecture

1. Zetaris federates two fictional CSV sources into a joined candidate view. TalentLens uses Lightning REST with a SELECT-only account.
2. Nemotron extracts requirements from the job description through Meterless Nightshift.
3. Meterless H-MEM retrieves relevant earlier professional evidence, scoped to the configured organisation and current candidates. The app verifies each source before adding memory to the comparison prompt.
4. Nemotron compares all current CVs with the role and verified prior context, then returns structured recommendations and questions.
5. The app validates the result and persists reports and supported literal evidence in SQLite. H-MEM retains document versions, retrieval traces and Trust Ledger history.
6. A recruiter reviews citations, resolves memory conflicts and records an interview, hold or pending state. Deletion and document updates invalidate requests already in flight.

Stack: Node.js 22+, Express 5, built-in SQLite, browser-native JavaScript/CSS, bounded child-process document extraction, Zetaris Lightning REST, Meterless Nightshift, NVIDIA Nemotron and a persistent implementation of Meterless H-MEM.

## Sponsor contribution and what is distinctive

**Zetaris:** provides the data layer, joining separate candidate and document sources into a bounded, read-only candidate view. The demo demonstrates a real REST import, with source provenance retained in reports.

**Meterless Nightshift:** serves as the primary authenticated AI provider. TalentLens streams a structured result tool and records the actual executed model plus receipt IDs, rather than treating a requested model name or an online catalog as proof of inference.

**Meterless H-MEM Engine:** remembers source-backed professional facts across restarts and different vacancies. Hybrid retrieval follows the official contract. Candidate/document/version lineage, source verification, conflict review and deletion keep memory inspectable. The official conformance runner passes 13/13 checks at pinned specification revision `1742dec56a66e58eef9dda2d2b865823758ca8cd`.

**NVIDIA Nemotron:** performs requirement interpretation, semantic CV comparison and evidence-led recommendations. The verified model is `nvidia/nemotron-3.5-lightning-30b-a3b`, routed through Nightshift. Application code validates the output and its citations. H-MEM adds verified earlier context without implementing a parallel hiring score.

## Verification and evidence

- `npm test`: 29 automated tests, including source/candidate deletion during inference, translation invalidation, document replacement, evidence validation, memory persistence, source verification and organisation isolation. External services are mocked in this suite.
- `npm run test:hmem:conformance`: 13 official checks. Missing official files download automatically from a pinned revision and must match SHA-256 hashes.
- `npm run verify:live`: actual application API, real Zetaris, Nightshift and Nemotron. It verifies the exact three public fictional CVs, runs one role, restarts the app against an isolated database, runs another role and requires verified earlier memory in the comparison input. It checks actual model IDs and receipts. See the package status for the latest run outcome.
- Historical successful three-CV live output: `examples/zetaris/verified-analysis.json` (22 October 2026). This is recorded evidence, not a substitute for a current live run.
- Full live workflow passed on 26 October 2026: two roles, three fictional CVs, a process restart and one verified previous memory retrieved and used. Five Nightshift receipts confirm Nemotron Lightning across both reports, including one bounded correction. Full evidence: `examples/zetaris/verified-hmem-workflow.json`.
- Product screenshot and ten-slide English presentation accompany this draft.

## Novelty, existing work and development tools

TalentLens is new application code inspired by OVEUN's pre-existing Cora recruiting concept. It reuses no Cora product code, accounts, databases, indexes, candidate documents or services. The UI, extraction pipeline, provider adapters and memory integration are independent. Development used Codex desktop. Cursor is installed with the official Codex extension, but we do not claim a Cursor-built product award based on installation alone.

Proposed track: **Wildcard / Tinkerer**, subject to the leader confirming the exact portal option. Do not claim a different track or a development-tool award without evidence.

## Current limits and future work

This is a local single-user prototype, with one configured organisation per process and no production authentication. It supports up to 25 CVs and 200,000 characters per analysis. Scanned documents require OCR before upload. Literal quotation validation establishes traceability, not the truth of a CV or guaranteed fairness. Next steps are OCR, production identity and access control, broader prompt-injection and bias evaluation, and larger consented evaluation datasets. No measured productivity gain or real hiring outcome is claimed.

## Links and files

- Repository: https://github.com/oveun-software/hackaton
- Setup: https://github.com/oveun-software/hackaton/blob/main/README.md
- Team access and individual accounts: https://github.com/oveun-software/hackaton/blob/main/docs/TEAM-SETUP.md
- Slide deck: https://github.com/oveun-software/hackaton/blob/main/submission/TalentLens-Deck.pptx
- PDF deck: https://github.com/oveun-software/hackaton/blob/main/submission/TalentLens-Deck.pdf
- Sponsor and provenance notes: https://github.com/oveun-software/hackaton/blob/main/docs/SUBMISSION.md
- Demo video: **leave blank**. No video has been produced in this task. Never add a placeholder URL to satisfy validation.
- Hosted app: none. Judges can run the local app using the README. Do not enter localhost as a publicly accessible demo URL.

## Leader's draft-saving procedure

1. Open https://hackathon.genai.works/submissions using the team leader's own account.
2. Confirm the roster: Ariana García, Maria Rodriguez and Diego Rodríguez Domínguez. The rules state that the roster locks when the first submission is created.
3. Create a draft only if the portal explicitly offers that state. Copy the fields above and attach/link the slide deck. Review the exact track name and form limits.
4. Keep the video field empty. If video is mandatory even to save a draft, retain this file and stop before final submission.
5. **Do not press Submit, Finalize, Complete, Mark completed or any equivalent action.** Do not accept new legal terms on someone else's behalf.
6. Keep the candidacy pending until the user authorises final delivery. The published deadline is 27 October 2026 at 23:45 UTC, which is 28 October at 00:45 in mainland Spain.

Source: [Official Rules, updated 23 October](https://hackathon.genai.works/resources?id=01a08ff1-54cc-709a-bfe7-6b34452b676b) and [Technical Execution Guide](https://hackathon.genai.works/resources?id=01a08ff1-54b1-7670-9441-a1e73ff43a6e). Check current organiser notices before final submission.
