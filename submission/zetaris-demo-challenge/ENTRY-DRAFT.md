# English entry draft

Prepared for the additional Zetaris Demo Challenge and updated after reading its official rules on 31 October. The one-sentence answer below is explicitly required; other blocks are reusable copy to fit the actual write-up. No entry has been submitted or consent accepted. See [the rules and remaining uncertainties](RULES-AND-VIDEO-CHECK.md).

## Project title

TalentLens — Traceable Recruiting with Zetaris

## Team / representative

- Project: TalentLens
- Team: Los pichones de Oveun
- Original hackathon team: Ariana García, Maria Rodriguez, Diego Rodríguez Domínguez
- New challenge's entrant/representative: the team must nominate one member and agree to entry and the content-use permission. Do not assume the email recipient and original team leader must be the same entrant.

Do not insert private contact details or personal credentials in the public repository. Enter the representative's own contact information directly into the verified form if requested.

## One-line summary

TalentLens uses Zetaris to join candidate profiles and CV documents, query the current candidate pool, and connect AI recommendations to inspectable source evidence.

## Required one-sentence answer: what impressed us about Zetaris

**Draft for the team's approval; only use it if it reflects your actual experience:**

Zetaris impressed us by making separate profile and CV sources available through one read-only view that our application could query and connect to exact, inspectable evidence behind each recommendation.

The video must separately include a 40–60 second personal/team explanation. This one-sentence written answer does not replace that segment. The rules permit Zetaris to quote the submitted statement with attribution in marketing and social material, so the team must approve the final wording before consenting.

## Short description

TalentLens helps recruiters compare a role with documented experience. Zetaris joins separate profile and CV sources into a read-only candidate view. Each Zetaris analysis queries that view first and keeps the SQL trace and exact document versions. NVIDIA Nemotron, through Meterless Nightshift, compares the evidence and critically reviews the draft. Recruiters inspect quotations and decide the next step.

## The problem

Candidate information can be split between profile records and document text. A recommendation becomes hard to assess when a recruiter cannot see which version of a CV was used, what supports a requirement, or what information is missing. TalentLens makes those sources and gaps visible while keeping hiring decisions with a person.

## How Zetaris contributes

Zetaris is the data layer for the sponsor workflow. In the reproducible demonstration, one synthetic CSV source contains profile records and another contains CV document text. A Zetaris view joins them by stable candidate ID. The application reads that view through Lightning REST using a dedicated SELECT-only account.

When the recruiter chooses “Analyze from Zetaris,” TalentLens checks the AI provider, performs a fresh bounded SELECT, validates the returned records, and uses only those returned candidates. Empty or failed queries stop that path instead of silently substituting cached CVs. Existing local uploads remain a separate selectable workflow.

Each successful report retains the SQL, UTC query timing, row count and limit, correlation IDs, local document IDs, versions and SHA-256 hashes. The recruiter can open a requirement cell to inspect its literal quotation in the exact source text. Changed CVs create new local document versions. This makes the handoff from Zetaris data to model interpretation inspectable.

## What the demo shows

1. Two separate synthetic profile/document sources and their Zetaris join view.
2. A real query returning three fictional candidates.
3. A fresh query inside the application's analysis request.
4. Query-to-document provenance beside the evidence matrix.
5. A literal CV quotation supporting a requirement and a gap that calls for a follow-up question.

Zetaris supplies the authorized data view. Nemotron performs semantic interpretation and critical review through Nightshift. Persistent Meterless H-MEM can retain attributed context for later roles, but it is a supporting feature rather than the main focus of this Zetaris demonstration.

## Working evidence

A real check passed on **27 October 2026 at 07:35 UTC**. The application queried Zetaris within its analysis request, retrieved the three known fictional CVs and completed three actual `nvidia/nemotron-3.5-lightning-30b-a3b` calls through Nightshift. Source versions and hashes matched the documents used. The saved report includes the query trace, source texts, complete output, executed model IDs and Nightshift receipts.

The repository also contains 50 application tests with simulated external transport and 13 passing official H-MEM checks, plus separate dated recordings. These counts and one successful live run are not an independent recruiting accuracy, fairness or availability guarantee.

## Scope and honest limits

This is a local single-user prototype. The synthetic demonstration uses **two CSV sources**, not several production enterprise systems. The SELECT returns at most 25 rows and is not an exhaustive search across a larger view. TalentLens stores local text snapshots and sends consented evidence to its configured AI provider; it does not claim zero copying or that no data leaves the computer. Literal quotations establish traceability, not the truth of a candidate's statement. There are no local compatibility percentages or automatic hiring/rejection decisions.

## Useful links

- Public source and setup: https://github.com/oveun-software/hackaton
- Real query, source documents, output and receipts: https://github.com/oveun-software/hackaton/blob/669fa56/examples/zetaris/verified-fresh-query.json
- Zetaris source/view recipe: https://github.com/oveun-software/hackaton/blob/669fa56/examples/zetaris/create.sql
- Source-mode walkthrough: https://github.com/oveun-software/hackaton/blob/669fa56/docs/ZETARIS-WORKFLOW.md
- New challenge consent: https://hackathon.genai.works/competition-consent/zetaris-demo-video
- Official rules and upload link: https://www.zetaris.com/zetaris-demo-challenge-official-rules
- Final Zetaris challenge video/file: **not yet prepared or uploaded**. Verify the content, actual duration limit, filename/date and team consent before delivery.

## Optional video description

TalentLens demonstrates an evidence-led recruiting workflow powered by Zetaris. Separate profile and CV sources become one authorized candidate view. A fresh query feeds each analysis, and the report preserves query details and exact source versions so recruiters can inspect every recommendation. All candidates in this demonstration are fictional. AI interpretations remain subject to human review.

Source code, setup and recorded real execution: https://github.com/oveun-software/hackaton

Do not publish this description or tag sponsors until the actual submission instructions and the final video are ready.
