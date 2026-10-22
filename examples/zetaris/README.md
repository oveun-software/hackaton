# Synthetic recruitment sources

These three fictional profiles were written for TalentLens. They contain no real applicants, proprietary documents or third-party dataset. They are sample inputs, never fabricated model outputs. Regenerate them from `server/demo.js` with `npm run samples:zetaris`.

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
