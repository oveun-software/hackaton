# TalentLens — submission notes

## Problem and users

Recruiters need to connect role requirements with relevant experience across CVs, while retaining a clear explanation of why a person was recommended. TalentLens presents qualitative recommendations with document citations, unresolved questions and a human-controlled next step.

## New work and provenance

TalentLens is newly written application code inspired by the pre-existing Cora recruiting concept from OVEUN. No Cora product code, accounts, databases, indexes, documents or services are reused. The implementation, interface, multilingual experience, extraction pipeline and provider connectors are independent. The first implementation was developed in Codex desktop. Use of Cursor must be documented accurately before submission; it has not been verified as completed.

The proposed track is **Wildcard / Tinkerer**, reflecting the existing concept. No track has been selected or entry submitted through this application.

## Sponsor technology contribution

| Technology | Implemented contribution | Verification |
| --- | --- | --- |
| NVIDIA Nemotron | Interprets job requirements, compares all supplied CVs and orders evidence-led recommendations; writes in the selected language | Automated tests use a mock provider; a live key and actual model run remain required |
| Meterless Nightshift | OpenAI-compatible provider adapter with authenticated model discovery, runtime headers, routing IDs and long inference timeout | Mock contract tests pass; a real runtime run and proof of its Nemotron lane remain required |
| Zetaris | Read-only Trino adapter importing an authorised candidate view with source provenance and bounded paging | Mock protocol tests pass; the hackathon’s actual access method and federated view still need validation |
| Cursor | Development tool required by the published event rules | Actual development use and evidence remain required |

Sponsor names in the product identify actual integration capabilities; the UI does not claim a verified connection merely because an adapter exists.

## Distinctive approach

Nemotron performs semantic interpretation and recommendation. Application code verifies identifiers, full candidate/requirement coverage and literal citations instead of implementing a parallel scoring engine. There are no candidate percentages. Recruiters can inspect the source text, ask targeted interview questions and save a human review state. Four complete interface languages and language-aware analysis help teams review the same workflow in their preferred language. Report translations preserve the original source quotations and decision statuses.

## Demonstration and delivery status

The local product, four-language UI, logo, fictional sample workspace, model workflow, translation validation and automated tests are implemented. Live sponsor service validation is pending. A video, slide deck and submission form have not been produced or submitted by this application. Do not describe pending integrations or development-tool use as completed.

For a demo, use fictional data, show a role and its CV collection, run the actual Nemotron workflow through Meterless, open a supporting citation and an evidence gap, then save a recruiter-controlled next step. Show the actual Zetaris source and federated query rather than implying local uploads demonstrate federation.

The [event rules](https://hackathon.genai.works/event/open-agent-hackathon-2026), reviewed on 22 October 2026, require Zetaris, Meterless and Cursor; source code and setup documentation; a 1–4 minute demo video; a slide deck; and an explanation of sponsor contribution. The deadline is **27 October 2026, 23:45 UTC**. Check the organiser’s latest notices before final submission.
