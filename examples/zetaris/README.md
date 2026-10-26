# Synthetic recruitment sources

These three fictional profiles were written for TalentLens. They contain no real applicants, proprietary documents or third-party dataset. They are sample inputs, never fabricated model outputs. Regenerate them from `server/demo.js` with `npm run samples:zetaris`.

`verified-analysis.json` is a recorded **real model output**, generated on 22 October 2026 from these three inputs through local Zetaris → Nightshift fast → NVIDIA Nemotron 3.5 Lightning. It includes the exact inputs, validated recommendations/citations and the two execution receipt IDs, with no credentials or reasoning. It can be inspected offline; it is not presented as a new live analysis. `npm run verify:live:single` repeats this earlier one-role check and writes to ignored `data/live-verification.json`. The full restart/memory check is `npm run verify:live`, which writes to ignored `data/live-verification-hmem.json`.

`profiles.csv` represents profile records and `documents.csv` represents CV document text. Zetaris joins the sources into `talentlens.candidates`; Nemotron performs all semantic comparison afterward. Zetaris's join is by stable ID, with no keyword matching or compatibility score.

Copy both CSV files to `/home/zetaris/customer-data/shared/talentlens/` in the local bundle's driver container, using `docker compose cp` from the bundle directory. The bundle's customer-data volume persists those files. Run `create.sql` once in your own Zetaris SQL Editor, one statement per execution. It creates only `TALENTLENS_FILES` and the `talentlens` container/view, and deliberately contains no DROP statements. On an existing instance, inspect any object with the same name before reusing it.

Verify `SELECT candidate_id, display_name, document_name, cv_text FROM talentlens.candidates LIMIT 25` returns exactly three records. Use a dedicated read-only key for the application and set `ZETARIS_SYNTHETIC=true` when importing this sample so the UI labels the documents as fictional. For real authorised data, leave that setting false.

Create a separate GENERAL user in Zetaris user management with your own strong password. As administrator, assign that user to the `talentlens` view container, then grant only SELECT on the actual view (container assignment alone did not provide SELECT in the tested bundle):

```sql
GRANT SELECT ON VIEW TABLE talentlens.candidates TO USER 'reader@talentlens.local';
SHOW GRANT USER 'reader@talentlens.local' ON ALL;
```

Use your own application's username if different. The grant result must show SELECT without a grant option. Sign in as that GENERAL user and create a named, expiring token in API Tokens. Store it in `ZETARIS_API_KEY`; the application does not need the administrator password or session token. Confirm the candidate SELECT using that key, as well as `npm run doctor`. Grant syntax is described in [Zetaris's SQL manual](https://kbase.zetaris.com/knowledge/sql-manual); the `VIEW TABLE` form above was verified against the current hackathon bundle.

File-source syntax follows [Zetaris's CSV recipe](https://github.com/zetaris/getting-started/blob/main/open_data/parquet_csv/sql/02_noaa_ghcn_create.sql); view syntax follows its [schemastore recipe](https://github.com/zetaris/getting-started/blob/main/open_data/rest_apis/sql/non_rate_limited/02_pokeapi_create.sql). The platform distribution and personal registry credentials must be obtained separately; they are not included here.
## Recorded verification with H-MEM

The [26 October workflow](verified-hmem-workflow.json) contains two real application reports using these exact fictional sources. The app restarted between roles, then H-MEM retrieved and supplied a verified earlier fact to Nemotron. The second report cited that memory. All five model executions include the actual Nemotron Lightning model and Nightshift receipt IDs. Every final source quotation passed validation. This is a saved verification artifact, not a live response. Reproduce it with `npm run verify:live` after following the setup below.

## Evidence review and clarification recording

The [latest evidence-review workflow](verified-review-workflow.json), recorded on 26 October, adds an attributed fictional TypeScript interview answer to Sam Torres, shows the before/after report change, restarts the app and retrieves that source in a new role. A paired current-CV-only run remains unclear; the run with the earlier source records support. Ten actual Nemotron Lightning calls have Nightshift receipts. This one stochastic comparison demonstrates source access, not average causal benefit. Reproduce it with `npm run verify:review`. The earlier five-call workflow above remains a historical artifact from the earlier pipeline.

`npm run demo` opens these reports without services or API credentials. Original quotations stay untouched; narrative translations are included in Spanish, French and German.
