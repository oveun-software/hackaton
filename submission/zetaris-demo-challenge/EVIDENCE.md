# Evidence index for the Zetaris demo

All paths below refer to the existing TalentLens build. The dated evidence is preserved unchanged. These checks support the product demonstration. The additional event's official conditions were inspected on 31 October; unresolved placeholders and the existing-video check are recorded in [RULES-AND-VIDEO-CHECK.md](RULES-AND-VIDEO-CHECK.md).

| Claim to demonstrate | Evidence | What it establishes |
| --- | --- | --- |
| Separate profile/document sources joined by Zetaris | [Join/view SQL](../../examples/zetaris/create.sql), [profiles.csv](../../examples/zetaris/profiles.csv), [documents.csv](../../examples/zetaris/documents.csv) | Two fictional CSV sources and their join by stable candidate ID |
| Real candidate retrieval inside analysis | [27 October real execution](../../examples/zetaris/verified-fresh-query.json), `report.dataAccess` | Exact SELECT, three returned rows, UTC timing, query/request IDs and document lineage |
| Exact documents used by the model | Same file, `report.sources`, `report.evidenceSources` and `report.dataAccess.documents` | Source text, document IDs/versions, SHA-256 and report quotations |
| Actual model execution | Same file, `report.executions` | Three actual NVIDIA Nemotron Lightning calls with Nightshift receipts |
| Fresh-query behavior and failure handling | [Server workflow](../../server/index.js), [adapter](../../server/providers.js), [workflow tests](../../tests/zetaris.test.js) | Returned-candidate scope, source versioning, no silent cached fallback, concurrency/deletion handling |
| Reproducible inputs and validated saved output | [Fixture recipe](../../examples/zetaris/README.md), `npm run test:recordings` | Offline consistency of sources, hashes, citations and recorded metadata |
| Persistent attributed context (supporting feature) | [26 October memory recording](../../examples/zetaris/verified-review-workflow.json), [H-MEM guide](../../docs/HMEM-INTEGRATION.md) | A separate real clarification/restart workflow and source-attributed recall |

## Recorded real check

- Verified at: **2026-10-27 07:35:00 UTC**.
- View: `talentlens.candidates`.
- Rows returned: **3**, query limit **25**.
- Query ID: `014dc62e-3e20-4c15-9550-9d5c957223fd`.
- Model: `nvidia/nemotron-3.5-lightning-30b-a3b` through Meterless Nightshift.
- Completed model calls: **3**.
- Inputs: Alex Rivera, Sam Torres and Dani Vega, all explicitly fictional.

No new live inference was performed when preparing/updating this package on 30–31 October. The date above belongs to the original recorded check.

## Reproduce without provider calls

```sh
npm ci
npm run test:recordings
```

For a broader application check, `npm test` runs simulated external transports. There were 50 passing application tests and 13 passing official H-MEM checks in the verified build. A saved recording is not a fresh response to an arbitrary new CV.

## Repeat the real source-to-model path

Follow [individual setup](../../docs/TEAM-SETUP.md) and [Zetaris workflow](../../docs/ZETARIS-WORKFLOW.md), then:

```sh
npm run doctor -- --require-zetaris
npm run verify:zetaris
```

The second command uses the three exact public fictional fixtures, an isolated temporary database, a fresh query inside the analysis request and actual configured provider access. It writes to ignored `data/live-zetaris-analysis.json`. It requires running services and available provider quota; the doctor alone does not establish successful inference. Keep new outputs separate from the committed 27 October record unless deliberately publishing a dated replacement.

Only share public fictional inputs, approved output and configuration placeholders. Every teammate/evaluator uses their own permitted service access.
