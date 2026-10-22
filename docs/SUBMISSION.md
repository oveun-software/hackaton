# TalentLens — submission notes

## Problem and users

Recruiters need to connect role requirements with relevant experience across CVs, while retaining a clear explanation of why a person was recommended. TalentLens presents qualitative recommendations with document citations, unresolved questions and a human-controlled next step.

## New work and provenance

TalentLens is newly written application code inspired by the pre-existing Cora recruiting concept from OVEUN. No Cora product code, accounts, databases, indexes, documents or services are reused. The implementation, interface, multilingual experience, extraction pipeline and provider connectors are independent. Development has used Codex desktop. Cursor is optional under the Official Rules updated on 22 October. The TalentLens folder was opened in Cursor and the official Codex extension installed; these setup steps alone are not evidence that the product was developed in Cursor.

The proposed track is **Wildcard / Tinkerer**, reflecting the existing concept. No track has been selected or entry submitted through this application.

## Sponsor technology contribution

| Technology | Implemented contribution | Verification |
| --- | --- | --- |
| NVIDIA Nemotron | Interprets job requirements, compares all supplied CVs and orders evidence-led recommendations; writes in the selected language | Live three-CV analysis passed using Nemotron 3.5 Lightning through Nightshift. Requirement/candidate coverage and all literal quotations were validated. The NVIDIA key stays in Nightshift, outside the repository |
| Meterless Nightshift | OpenAI-compatible provider adapter with authenticated model discovery, runtime headers, routing IDs and long inference timeout | Nightshift 1.2.1 is installed. Authenticated discovery and real JSON inference passed. The fast profile, structured result tool and streaming completed both analysis stages. The actual Nemotron Lightning model and receipt IDs were captured for both calls; privacy and verification settings were preserved |
| Meterless Engine | Required: at least one of H-MEM, Markovian, World Model or Scout Intent must power a working feature | Not yet implemented; requires a meaningful feature integration and passing test. The Nightshift provider adapter is not an Engine |
| Zetaris | Lightning REST adapter importing an authorised candidate join view with source provenance and a 25-row bound | Real local deployment, two fictional CSV sources, join view and separate GENERAL user with SELECT-only grant are configured. The application imported all three records successfully. REST contract/error tests pass |
| Cursor | Optional development environment under the updated rules | Installed with the official Codex extension; future use must be described accurately if competing for the Cursor-built product award |

Sponsor names in the product identify actual integration capabilities; the UI does not claim a verified connection merely because an adapter exists.

## Distinctive approach

Nemotron performs semantic interpretation and recommendation. Application code verifies identifiers, full candidate/requirement coverage and literal citations instead of implementing a parallel scoring engine. There are no candidate percentages. Recruiters can inspect the source text, ask targeted interview questions and save a human review state. Four complete interface languages and language-aware analysis help teams review the same workflow in their preferred language. Report translations preserve the original source quotations and decision statuses.

## Demonstration and delivery status

The local product, four-language UI, logo, fictional sample workspace, model workflow, translation validation and automated tests are implemented. Real Nightshift/Nemotron JSON inference and the Zetaris import passed on 22 October 2026. The complete three-CV live AI analysis also passed, with actual model proof and literal-source validation. The required Meterless Engine feature remains pending. A video, slide deck and submission form have not been produced or submitted by this application. The repository is still private and must be made public for submission with the owner's authorization. Do not describe pending integrations or development-tool use as completed.

For a demo, use fictional data, show a role and its CV collection, run the actual Nemotron workflow through Meterless, open a supporting citation and an evidence gap, then save a recruiter-controlled next step. Show the actual Zetaris source and federated query rather than implying local uploads demonstrate federation.

The [Official Rules updated on 22 October 2026](https://hackathon.genai.works/resources?id=01a08ff1-54cc-709a-bfe7-6b34452b676b), sections 8.1 and 10.1, require Zetaris as the data layer, at least one working Meterless Engine and Meterless Nightshift as the primary AI provider. NVIDIA models connect through Nightshift; Cursor is optional and any AI coding tool is permitted. Submission requires a public source repository and setup documentation, a 1–4 minute demo video, a slide deck and an explanation of sponsor contribution. Three sample inputs/outputs, traces and offline sample mode are recommended in the Rules. The [Technical Execution Guide](https://hackathon.genai.works/resources?id=01a08ff1-54b1-7670-9441-a1e73ff43a6e) describes these in more detail and defers to the Rules. The deadline is **27 October 2026, 23:45 UTC**. Check the organiser's latest notices before final submission.
