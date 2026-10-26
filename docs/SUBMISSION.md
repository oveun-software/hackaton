# TalentLens — submission notes

## Problem and users

Recruiters need to connect role requirements with relevant experience across CVs, while retaining a clear explanation of why a person was recommended. TalentLens presents qualitative recommendations with document citations, unresolved questions and a human-controlled next step.

## New work and provenance

TalentLens is newly written application code inspired by the pre-existing Cora recruiting concept from OVEUN. No Cora product code, accounts, databases, indexes, documents or services are reused. The implementation, interface, multilingual experience, extraction pipeline and provider connectors are independent. Development has used Codex desktop. Cursor is optional under the Official Rules updated on 23 October. The TalentLens folder was opened in Cursor and the official Codex extension installed; these setup steps alone are not evidence that the product was developed in Cursor.

The proposed track is **Wildcard / Tinkerer**, reflecting the existing concept. No track has been selected or entry submitted through this application.

## Sponsor technology contribution

| Technology | Implemented contribution | Verification |
| --- | --- | --- |
| NVIDIA Nemotron | Interprets job requirements, compares all supplied CVs and orders evidence-led recommendations; writes in the selected language | Live three-CV analysis passed using Nemotron 3.5 Lightning through Nightshift. Requirement/candidate coverage and all literal quotations were validated. The NVIDIA key stays in Nightshift, outside the repository |
| Meterless Nightshift | OpenAI-compatible provider adapter with authenticated model discovery, runtime headers, routing IDs and long inference timeout | Nightshift 1.2.1 is installed. Authenticated discovery and real JSON inference passed. The fast profile, structured result tool and streaming completed both analysis stages. The actual Nemotron Lightning model and receipt IDs were captured for both calls; privacy and verification settings were preserved |
| Meterless H-MEM | Persistent evidence-backed professional memory, canonical hybrid retrieval, document/version lineage, contradiction review and Trust Ledger audit | Implemented in the existing Node/Express/SQLite application. The official H-MEM conformance runner passes 13/13 checks; local tests cover restart persistence, contextual/tenant isolation, source verification, supersession, contradictions and privacy deletion |
| Zetaris | Lightning REST adapter importing an authorised candidate join view with source provenance and a 25-row bound | Real local deployment, two fictional CSV sources, join view and separate GENERAL user with SELECT-only grant are configured. The application imported all three records successfully. REST contract/error tests pass |
| Cursor | Optional development environment under the updated rules | Installed with the official Codex extension; future use must be described accurately if competing for the Cursor-built product award |

Sponsor names in the product identify actual integration capabilities; the UI does not claim a verified connection merely because an adapter exists.

## Distinctive approach

Nemotron performs semantic interpretation and recommendation. Application code verifies identifiers, full candidate/requirement coverage and literal citations instead of implementing a parallel scoring engine. There are no candidate percentages. Recruiters can inspect the source text, ask targeted interview questions and save a human review state. Four complete interface languages and language-aware analysis help teams review the same workflow in their preferred language. Report translations preserve the original source quotations and decision statuses.

## Demonstration and delivery status

The local product, four-language UI, logo, fictional sample workspace, model workflow, translation validation and Meterless H-MEM integration are implemented. The three-CV live AI analysis passed on 22 October, with actual model proof and literal-source validation. On 26 October, the 29-test suite and official 13-check H-MEM runner passed again. Official conformance downloads are pinned and hash-verified, including in CI. Regression checks now cover deletion during analysis/translation and replacement of a source document.

The [delivery package](../submission/README.md) contains an English application draft, ten-slide editable PowerPoint, PDF and actual product screenshot. The extended real-service check **passed on 26 October**: two roles, three fictional Zetaris CVs, an application restart and one verified earlier memory retrieved and used in the second analysis. All five model calls confirmed Nemotron Lightning through Nightshift and retained receipts. [Full recorded evidence](../examples/zetaris/verified-hmem-workflow.json) includes both reports and the memory trace. The current HackOS account is a member, and the portal allows only the team leader to create/manage submissions. The leader must copy the prepared draft into the portal. **No video has been produced, no candidacy has been submitted and nothing has been marked complete.** Public repository visibility is required before final delivery and is subject to owner review. Do not describe draft preparation as a saved or submitted portal entry.

For a demo, use fictional data, show a role and its CV collection, run the actual Nemotron workflow through Meterless, open a supporting citation and an evidence gap, then save a recruiter-controlled next step. Show the actual Zetaris source and federated query rather than implying local uploads demonstrate federation.

The [Official Rules updated on 23 October 2026](https://hackathon.genai.works/resources?id=01a08ff1-54cc-709a-bfe7-6b34452b676b), sections 8.1 and 10.1, require Zetaris as the data layer, at least one working Meterless Engine and Meterless Nightshift as the primary AI provider. NVIDIA models connect through Nightshift; Cursor is optional and any AI coding tool is permitted. Submission requires a public source repository and setup documentation, a 1–4 minute demo video, a slide deck and an explanation of sponsor contribution. Three sample inputs/outputs, traces and offline sample mode are recommended in the Rules. The [Technical Execution Guide](https://hackathon.genai.works/resources?id=01a08ff1-54b1-7670-9441-a1e73ff43a6e) describes these in more detail and defers to the Rules. The deadline is **27 October 2026, 23:45 UTC**. Check the organiser's latest notices before final submission.
