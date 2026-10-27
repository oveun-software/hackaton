# TalentLens demo video script

Target duration: **3 minutes 20 seconds**, including pauses and edits. Narration and on-screen product controls are English. This is a recording guide, not a completed video or submission.

## Preparation

- Start Docker Desktop, your Zetaris stack and Nightshift. Run `npm run doctor -- --require-zetaris`, then `npm start` if TalentLens is not already running. The doctor establishes connectivity and the model catalog, not successful inference.
- Open the app at `http://127.0.0.1:4317/?lang=en#vacancies`. Prepare a **new** Product engineer role with this description: `Professional TypeScript development experience is required. Experience developing Python APIs is preferred.` Use only the three public fictional Zetaris CVs.
- Prepare the Zetaris SQL Editor with the existing profile/document sources and `talentlens.candidates` view. The view joins those two fictional sources. Use the SELECT below to display the actual joined records.
- Prepare the real recording viewer at `http://127.0.0.1:4317/showcase.html?lang=en`. The full app serves it directly. Alternatively, `npm run demo` serves it on port 4319 without dependencies or credentials. The viewer replays real 26 October outputs; it does not make new model calls.
- Have the public repository open to `examples/zetaris/verified-fresh-query.json`, with `report.executions` easy to find. That file is the successful **27 October** verification, separate from the live run you will record and from the 26 October memory example.
- Record at 1920×1080 if available. Keep only the relevant window visible and adjust browser zoom so quotations are readable. Close notifications and keep credentials, `.env`, token screens and personal account details out of frame. Use English captions and a quiet background.

```sql
SELECT candidate_id, display_name, document_name, cv_text
FROM talentlens.candidates
LIMIT 25
```

## Timeline and exact narration

### 00:00–00:15 — Problem and user

**Screen:** TalentLens logo and the English role screen. Keep the prepared requirements readable. Small overlay: `Evidence for recruiters. Decisions stay human.`

**Voiceover:**

> TalentLens helps recruiters compare CVs with job requirements and understand the evidence behind each recommendation. Our agent makes gaps visible and proposes the next question to ask.

### 00:15–00:40 — Zetaris as the data layer

**Screen:** In the Zetaris SQL Editor, briefly show the profile and document sources, then the joined candidate view. Run the SELECT and show the three fictional records. Avoid scrolling through whole CVs. Overlay: `Zetaris: profile records + CV documents`.

**Voiceover:**

> Recruiting information often sits in separate systems. Zetaris joins profile records and CV documents into an authorized candidate view. TalentLens reads that view through a read-only connection. Nemotron handles the semantic comparison after the data is retrieved.

### 00:40–01:05 — Fresh query and Nightshift inference

**Screen:** Return to the new role. Select **Zetaris · fresh query**, grant consent and click **Analyze from Zetaris**. Capture the real query and analysis progress, then the result with its provider/model metadata. Use a small `Meterless Nightshift / NVIDIA Nemotron` overlay.

**Voiceover:**

> I select Zetaris, fresh query, give consent, and start the analysis. This request retrieves current candidates before inference. Meterless Nightshift routes the work to NVIDIA Nemotron, which extracts requirements, compares every returned candidate, and critically reviews its draft.

**Edit:** The real verified run took about two minutes including processing. Record the full wait, then cut or speed it up. Keep `Processing time shortened` visible over the edit. Preserve the actual click and returned result. Do not imply an instant response.

### 01:05–01:30 — Inspectable data and evidence

**Screen:** Open **Zetaris data access**, **Query and request identifiers** and **Documents used**. Show the SQL, returned-row count and one document version/hash. Then open a requirement cell with a literal quotation in its source context. Pause long enough to read the quote.

**Voiceover:**

> The report preserves the query, timestamps, returned rows, and exact document versions and hashes. Each assessment links to a source quotation. The recruiter can inspect what supports a requirement and where evidence is missing. The original source text remains available for review.

### 01:30–01:55 — An evidence gap

**Screen:** Switch visibly to the recorded viewer. Keep overlay **Recorded real run · 26 October 2026** throughout the next three sections. Choose **1 · Before clarification** and open Sam Torres's TypeScript cell. Show `Unclear`, the original quote about interest in learning TypeScript, and the follow-up question.

**Voiceover:**

> Here is a recorded real execution showing our memory workflow. Sam's original CV expresses interest in learning TypeScript. That does not establish professional experience. The agent marks the requirement as unclear and proposes a focused follow-up question.

### 01:55–02:20 — New evidence with attribution

**Screen:** Choose **2 · After clarification** and open Sam's same TypeScript cell. Show the separately attributed fictional interview answer about a completed billing dashboard, its source label and the changed assessment. Keep the fictional/recorded labels visible.

**Voiceover:**

> A recruiter records a fictional interview answer as a separate, attributed source. The next analysis supports the requirement using that statement. The original CV stays intact. This is additional evidence to inspect, rather than independent verification that the candidate's claim is true.

### 02:20–02:50 — H-MEM after restart

**Screen:** Choose **3 · Another role, retained context**. Show **What earlier context adds**: Sam's TypeScript evidence remains unclear under the current-CV-only condition and becomes supported with the earlier context. Open the evidence cell to show the historical clarification it cites. The recording metadata documents the application restart.

**Voiceover:**

> After an application restart, Meterless H-MEM retrieves that earlier source for another role. The agent can cite the attributed answer instead of losing useful context between processes. In this recorded comparison, the current CV alone remains unclear. With the earlier evidence, the requirement is supported. This example illustrates the behavior, not an average accuracy improvement.

### 02:50–03:10 — Actual model execution and reproducibility

**Screen:** First expand **Execution evidence** in the memory viewer and point to `actualModel` and `receiptId`. Then show the committed **27 October** fresh-query JSON's `report.executions` and query trace. Label the change of recording/date clearly. Finish on the README's setup/sample commands.

**Voiceover:**

> Execution records identify the actual Nemotron model and Nightshift receipts. The fresh-query check records three real calls and their documents. Judges can inspect these examples offline and follow the README to reproduce them.

### 03:10–03:20 — Close

**Screen:** Return to the evidence matrix, then finish with the logo and `github.com/oveun-software/hackaton`. A small `npm run demo` caption provides the account-free entry point.

**Voiceover:**

> TalentLens connects each recommendation to evidence, carries useful context forward, and keeps the next hiring step in human hands.

## Editing boundaries

The voiceover is approximately 330 words, about 2:40 at 125 words per minute. Leave the remaining 40 seconds for short pauses over the SQL, quotation and memory comparison. Target 3:20, with a hard export limit of 4:00.

- Record the product workflow. Slides can appear briefly, but should not replace the working system.
- Keep the **new live capture**, the **26 October memory replay** and the **27 October committed verification** clearly distinguished. Their request IDs and receipts belong to different executions.
- Do not say H-MEM proves the candidate is truthful, the critical pass guarantees correctness, or the system searches the whole database. The query is bounded to 25 returned rows.
- Local mode and Docker recovery need no screen time. The key demonstration is Zetaris retrieval, Nightshift/Nemotron execution, source inspection and H-MEM recall.
- Do not edit statuses or insert a made-up result if a new run differs. Use the real output, or a clearly labelled saved real recording.

References for the demonstrated behavior: [judge walkthrough](../docs/JUDGES.md), [fresh-query workflow and real verification](../docs/ZETARIS-WORKFLOW.md), [fresh-query recording](../examples/zetaris/verified-fresh-query.json), and [memory recording](../examples/zetaris/verified-review-workflow.json).
