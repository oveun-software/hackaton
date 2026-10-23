# Meterless H-MEM in TalentLens

TalentLens implements the official Meterless H-MEM engine contract inside the existing Node/Express/SQLite application. H-MEM remains separate from Nemotron: it stores and retrieves evidence-backed professional memory; Nemotron still extracts role requirements and interprets candidate evidence through Nightshift.

The implementation was built and checked against `Meterless/Meterless` revision `1742dec56a66e58eef9dda2d2b865823758ca8cd` (19 October 2026), starting with `engines/hmem/AGENTS.md`, its reference implementation, examples, deep-dive documents and official conformance runner.

## Runtime flow

```text
CV upload/update -> isolated text extraction -> versioned candidate_document
                                                   |
Nemotron call 1 -> literal role requirements       |
        |                                          |
        +-> H-MEM hybrid retrieval ----------------+
              | source/tenant/current-state verification
              v
       verified per-candidate memory context
              |
              v
Nemotron call 2 -> recommendation + literal evidence validation
              |
              v
supported current-document citations -> H-MEM long-term factual records
                                      -> conflict/supersession reconciliation
                                      -> append-only Trust Ledger
```

H-MEM retrieval and Nemotron reasoning are deliberately separate. A retrieved memory is untrusted context, not an instruction, and its existence does not prove that a requirement is met. Only a literal quote that still exists in an authorised source can enter the Nemotron comparison prompt or justify a result.

## Persistence and records

H-MEM uses the existing `data/talentlens.sqlite` database. It persists four record kinds:

- `hmem_memory`: canonical memory records, H-MEM graph links and TalentLens evidence metadata.
- `hmem_ledger`: append-only mutation/read/feedback audit entries. Entries contain operational state, not CV text.
- `hmem_conflict`: open and resolved contradictions with justification.
- `hmem_trace`: retrieval reason, ranker version, relevance, source version and prompt-injection trace.

Professional facts are stored in `long_term`. Each includes the canonical H-MEM fields plus `organizationId`, `candidateId`, `documentId`, `documentVersion`, `sourceLocation`, `evidenceText`, `verifiedAt`, `validityState`, `factKey`, `vacancyId` and `reportId`. `content` is the validated literal evidence, not a Nemotron opinion or recommendation.

The current source locator is an exact character interval in extracted text. PDF page numbers are `null` because the existing extractor stores normalised text rather than a page map.

## Retrieval

`server/hmem.js` implements the official eight-signal formula:

```text
raw = 0.35 semantic + 0.20 keyword + 0.10 tag + 0.10 domain
    + 0.15 entity + 0.05 layer + 0.05 recency - 0.20 superseded
score = clamp01(raw) * confidence
```

The deterministic lightweight embedder follows the official reference approach. The application adds strict pre/post conditions: configured organization only, authorised candidate IDs only, `current` validity only, no `review` tag, no `supersededBy`, and a live literal-source check. Default final threshold remains `0.35`.

## Updates, contradictions and human review

Uploading a new version keeps the candidate ID, creates a new document ID/version and immediately moves current facts to `pending_verification`. Those facts cannot be retrieved until a new analysis verifies the new document.

- Identical facts in the same document are deduplicated.
- A fact verified in a newer document creates explicit `supersedes`/`supersededBy` lineage.
- Increasing duration (for example, two to four years) is recorded as cumulative supersession.
- Decreasing duration or explicit opposing claims creates an open conflict and marks both memories `conflicted`.
- Open conflicts are excluded from recommendations until a recruiter keeps the earlier claim, the newer claim or both, with a written justification.
- Corrections require a literal quote in an existing authorised document. Deletion writes a non-content ledger entry and removes the memory/index record.

Dreaming is implemented for H-MEM conformance but is not invoked by the recruiting flow. This prevents synthetic proposals from becoming candidate facts without an explicit product approval surface.

## Organization and privacy boundary

`TALENTLENS_ORG_ID` fixes one organization per local process. Every candidate, document, report, memory, conflict and trace is scoped to it. An `X-TalentLens-Organization` value that differs from the configured organization is rejected. The browser never selects an organization.

This is strong tenant isolation for the existing local single-user prototype, but it is not production authentication. The repository had no user/session authentication before this integration. A remotely hosted multi-user deployment still needs authenticated identities, authorization roles and encryption-at-rest policy.

Deleting a candidate removes their source documents, H-MEM memories, conflict/index records and affected reviews. Historical report sources are redacted and their citations become `unclear`/unverifiable. The append-only ledger remains, but contains no CV quote or memory content.

## API surfaces

- `POST /api/candidates/:id/documents` — upload a new CV version.
- `DELETE /api/candidates/:id/documents/:documentId` — delete a CV version and all derived memories/traces; deleting the current CV also removes its candidate profile.
- `GET /api/candidates/:id/memory` — facts, source status, conflicts and audit history.
- `PATCH /api/memories/:id` — source-verified human correction.
- `DELETE /api/memories/:id` — delete an erroneous fact with a reason.
- `POST /api/memories/:id/feedback` — H-MEM confidence feedback.
- `POST /api/memory/conflicts/:id/resolve` — audited human conflict resolution.
- `DELETE /api/candidates/:id` — privacy deletion across documents, memory and report citations.

## Verification commands

```powershell
npm.cmd run check
npm.cmd test
npm.cmd run test:hmem:conformance
npm.cmd run demo:hmem
```

The conformance script runs the official `engines/hmem/conformance/runner.ts` directly against `server/hmem.js`. It expects the official checkout at `data/meterless-official/Meterless-main/engines/hmem`, or `HMEM_SPEC_DIR` pointing to another official `engines/hmem` directory.

On 23 October 2026 the result was **13/13 official checks passed**. The local suite covers persistence/restart, contextual and candidate-scoped retrieval, organization isolation, source verification, CV supersession, unresolved contradictions, deletion and credential/content non-disclosure.

## Three-minute jury demo

1. **0:00–0:35 — Establish the boundary.** Open Connections. Show Nightshift/Nemotron and the separate H-MEM card. Explain: Nemotron reasons; H-MEM remembers only source-backed facts.
2. **0:35–1:15 — First process.** Load the three fictional CVs, analyse the sample role and open one candidate's “Verified memory”. Show the exact quote, document version, source verification and Trust Ledger history.
3. **1:15–1:55 — Cross-process recall.** Restart TalentLens, create a different role (for example “Data Engineer” requiring Python, SQL and APIs), and analyse again. In the H-MEM panel show retrieved count, earlier-process count, per-memory relevance and which memories Nemotron actually used.
4. **1:55–2:35 — Change safety.** Choose “New CV version” for a fictional candidate. Explain that old facts become pending immediately. Analyse the updated CV; show supersession for cumulative experience or the open human-review conflict for incompatible claims.
5. **2:35–3:00 — Audit and proof.** Resolve a fictional conflict with a justification, then show the change history. Finish in a terminal with `npm.cmd run test:hmem:conformance` (13/13) and `npm.cmd test`.

For a credential-free terminal rehearsal, run `npm.cmd run demo:hmem`. It creates three fictional source documents, restarts the SQLite-backed service, performs a different-role retrieval and prints the trace and ledger count. It uses the real H-MEM implementation, not a profile-table shortcut.

## Known limitations

- No production user authentication; organization is fixed per local process.
- Source locations are character offsets, not PDF page numbers.
- Memory mining is intentionally limited to already validated recommendation evidence. It does not make an extra model call or promote free-form CV summaries.
- A new CV version leaves facts not re-observed as `pending_verification`; a broader full-document fact extraction pass would require another consented model workflow.
- Live Nightshift/Nemotron verification still depends on the local runtime, provider credentials and quota. Automated tests mock external services; H-MEM itself is local and deterministic.
