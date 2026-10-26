# Submission package: pending review

The project is **not submitted or marked complete**. No video is included, as requested.

| Material | Location and status |
| --- | --- |
| English application text | [APPLICATION-DRAFT.md](APPLICATION-DRAFT.md), prepared for the leader to copy into HackOS |
| Ten-slide English PowerPoint | [TalentLens-Deck.pptx](TalentLens-Deck.pptx), editable content and real product visual |
| PDF copy of the deck | [TalentLens-Deck.pdf](TalentLens-Deck.pdf), ten pages for straightforward upload/review |
| Product visual | [assets/product-overview.png](assets/product-overview.png), actual English UI |
| Setup and individual accounts | [team setup](../docs/TEAM-SETUP.md) |
| Sponsor contribution and existing-work disclosure | [submission notes](../docs/SUBMISSION.md) |
| Three fictional inputs and recorded model outputs | [Zetaris examples](../examples/zetaris/README.md) |
| Official Engine check | `npm run test:hmem:conformance`, 13/13 passed locally on 26 October |
| Application checks | `npm run check`, `npm test` and `npm run secrets:check` |
| Full live restart/recall check | `npm run verify:live`; latest outcome recorded below |
| Video | Intentionally not produced |
| HackOS draft | Not saved: current member account cannot create/manage submissions. Maria Rodriguez is the leader |
| Final submission | Pending user review and a video. Do not finalize |
| Public repository | Required by the rules. Check current GitHub visibility before delivery |

## Running the demonstration

Use the fictional Zetaris sources, each developer's credentials and the free hosted NVIDIA development endpoint. Start Zetaris and Nightshift, run `npm run doctor`, then `npm run verify:live`. The verification uses a separate temporary SQLite database and deletes only that temporary workspace afterwards. It makes real provider requests and does not change the recruiter's normal workspace.

For a deterministic offline memory demonstration, run `npm run demo:hmem`. It reopens SQLite and retrieves earlier facts, but makes **no AI requests**. Without services, `npm start` still supports roles, local document browsing and fictional input data. A saved model output must always be identified as recorded evidence.

The H-MEM conformance command obtains just two official files from a fixed Git revision, checks their SHA-256 hashes and caches them under ignored `data/`. No vendor binaries, registry credentials or account data belong in this package.

## Latest full live verification

**Passed on 26 October 2026.** Two different roles analysed the three exact fictional CVs imported from the real Zetaris view. The application restarted between roles and the second analysis retrieved and used one verified memory from the first. All five model calls confirmed `nvidia/nemotron-3.5-lightning-30b-a3b` through Nightshift and retained execution receipts. The first role took two calls and the second took three, including one bounded correction. All final citations and candidate/requirement coverage passed validation.

The complete fictional inputs, outputs, H-MEM trace and execution IDs are in [verified-hmem-workflow.json](../examples/zetaris/verified-hmem-workflow.json). The earlier three-CV live run from 22 October is preserved separately. This is recorded verification evidence; a new run still depends on service availability, model output and provider quota.

## Remaining delivery actions

- The leader must create/save the portal draft using the prepared application text.
- Confirm public repository visibility after owner review of source and history.
- Record and attach the 1-4 minute video in a separate task.
- Final submission remains pending explicit user approval.
