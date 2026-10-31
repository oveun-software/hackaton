# Zetaris-focused demo video

**Proposed duration: 2:50**, including the required 40–60 second personal/team explanation. The official page was checked on 31 October and still contains `[X] minutes` for the maximum length. Confirm the final limit; 2:50 is our edit proposal. Narration and product controls are English.

The objective is to show what Zetaris actually does: source registration/join, a fresh application query and inspectable document lineage. The original hackathon's general 3:27 video should not be assumed sufficient for this new challenge.

## Prepare the screens

1. Start your existing Docker/Zetaris stack and Nightshift. Run `npm run doctor -- --require-zetaris`; this checks connectivity, not inference. Start the application with `npm start` if needed.
2. Open your Zetaris SQL Editor on the existing fictional dataset. Prepare the definitions in [create.sql](../../examples/zetaris/create.sql). **Display the existing join definition; do not rerun CREATE statements on objects that already exist.**
3. Prepare the SELECT below and verify that it returns exactly Alex Rivera, Sam Torres and Dani Vega. They are fictional. Do not use personal CVs for the recording.
4. Open `http://127.0.0.1:4317/?lang=en#vacancies`. Create a new Product engineer role with: `Professional TypeScript development experience is required. Experience developing Python APIs is preferred.` Select **Zetaris · fresh query**.
5. Capture the whole actual analysis once. Edit out the processing wait with `Processing time shortened` visible. Keep the request and returned result from the same run. If using the saved 27 October output, label it `Recorded real run · 27 October 2026` and do not present it as a new live request.

```sql
SELECT candidate_id, display_name, document_name, cv_text
FROM talentlens.candidates
LIMIT 25
```

## Timeline and narration

### 00:00–00:12 — User and problem

**Screen:** TalentLens role requirements. Small overlay: `Fictional candidates · Human review`.

> TalentLens helps recruiters connect job requirements to CV evidence. Zetaris brings separate candidate records together so the agent can work with an inspectable source.

### 00:12–00:35 — Zetaris sources and join

**Screen:** Zetaris SQL Editor. Show the two source tables, `TALENTLENS_FILES.profiles` and `TALENTLENS_FILES.documents`, then the `talentlens.candidates` join definition. Execute the read-only SELECT and show the three records.

> Here, profile records and CV text live in two separate synthetic CSV sources. Zetaris joins them by candidate ID into one authorized view. The application reads that view through Lightning REST with a dedicated read-only account.

### 00:35–00:55 — The application queries Zetaris

**Screen:** Return to the prepared new role. Show **Zetaris · fresh query**, grant consent and press **Analyze from Zetaris**. Keep a short genuine progress shot, then cut to its returned report. Label the shortened wait.

> Each analysis starts with a fresh query. TalentLens uses only the candidates returned by that request. A failed or empty read stops this workflow. NVIDIA Nemotron then interprets the evidence through Meterless Nightshift.

### 00:55–01:20 — Query and document provenance

**Screen:** Expand **Query and request identifiers** and **Documents used** above the matrix. Pause on SQL, returned rows, UTC timing and one document version/hash. Show the report's provider/model metadata. Avoid opening tokens or provider credential settings.

> The report keeps the SQL, timestamps, returned-row count and request identifiers. It also records the exact CV versions and hashes used. These details let a reviewer trace the model's input back to the Zetaris query. Local snapshots preserve that evidence for later inspection.

### 01:20–01:45 — A useful recruiting result

**Screen:** Open Alex Rivera's TypeScript cell, its literal quotation and source context. Then open a gap/unclear cell with a follow-up question. Use what the actual run returns; do not edit an assessment to match a preferred outcome.

> This assessment opens directly onto the original source quotation. Where support is missing, the agent proposes a follow-up question. A separate model pass reviews its claims, while application checks validate citations. The recruiter can inspect the evidence and choose the next step.

### 01:45–02:35 — Required team explanation (50 seconds)

**Screen:** A team member can speak on camera, or use their own voiceover over the actual joined view, query and report. Keep the segment continuous, clearly introduced with `What impressed us about Zetaris`. Time the final spoken take: it must last 40–60 seconds. The speaker should edit the draft below to reflect their actual experience. It is not a claim that the team has already approved this wording.

> What stood out to us was being able to connect the candidate profile to the CV text and then inspect that data handoff. We wanted each recommendation to show where its input came from. With Zetaris, we could expose one read-only view and query it before each analysis. The report then kept the query, source versions and hashes alongside the model's quotations. For us, the useful moment was opening a recommendation and tracing it back to the exact document it used. Zetaris supplied the candidate data, and our application preserved the evidence for a person to review.

### 02:35–02:50 — Sponsor contribution and close

**Screen:** Return briefly to the Zetaris joined view, then the report trace. End with the TalentLens logo and repository link. If displaying receipt JSON, use the recording belonging to the displayed run and label its date.

> Zetaris provides the connected data view. TalentLens makes its use visible in each recommendation. Source code, fictional inputs and a real execution trace are available in our public repository.

## Edit notes

- Target approximately 2:50, leaving reading time for the query and quotation. The personal explanation must itself last 40–60 seconds. Adjust the overall edit if the organiser specifies a maximum.
- Spend at least half the edit on Zetaris and its data/query trace. H-MEM can be mentioned briefly if time permits; a long memory replay would dilute this entry's focus.
- Show genuine UI interactions and query results. A logo slide or sponsor name alone does not demonstrate the integration.
- Keep the three candidates labelled fictional. Hide notifications, private account details, `.env`, bearer headers and API-key screens.
- Client-generated query/request IDs are correlation identifiers, not signed Zetaris receipts. Nightshift receipts are separate model-execution metadata.
- Do not claim production data federation, exhaustive candidate search, zero data movement, measured recruiter productivity gains or guaranteed model correctness.
- Export a test copy and check readability, audio, event format and reviewer access before the final upload. No final video has been produced by this package.
- The [rules/reuse check](RULES-AND-VIDEO-CHECK.md) records the conflicting closing dates, required filename/write-up and the separate team/content permission. Do not submit merely by reusing the original HackOS link.
