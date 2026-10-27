# Fresh Zetaris analysis and provenance

TalentLens offers two explicit source modes. Choosing a mode resets consent.

| Mode | Source selection | If Zetaris is unavailable |
| --- | --- | --- |
| **Zetaris · fresh query** | Reads the configured view before every analysis and uses only the candidates returned by that query | Stops with a localized error. Never substitutes cached CVs |
| **Workspace CVs · local mode** | Uses all CVs already in the local workspace, including any earlier imports | Continues through Nightshift without querying Zetaris |

When Zetaris is configured, the interface initially selects the fresh-query mode. The source selector remains available in both configurations. The separate **Connections → Import from Zetaris** action still supports preparing a workspace without starting inference.

## Demonstrate the sponsor workflow

1. Follow [individual setup](TEAM-SETUP.md) and create the [fictional joined view](../examples/zetaris/README.md). Keep Docker/Zetaris and Nightshift running.
2. Run `npm run doctor -- --require-zetaris`. This checks connectivity and the model catalog, not the full candidate view or inference.
3. Start TalentLens, open a role, select **Zetaris · fresh query**, read and grant consent, then choose **Analyze from Zetaris**. No prior manual import is necessary.
4. The app checks Nightshift readiness, queries Zetaris, validates the response and updates document versions before running Nemotron. Only that response's candidates enter the analysis. Existing attributed clarification sources and eligible H-MEM context may supplement those candidates.
5. Open **Zetaris data access** above the evidence matrix. Expand **Query and request identifiers** and **Documents used**. Open a matrix cell to inspect the exact source text.
6. Download the report. Its Markdown export retains the same query and document provenance.

The trace contains the SQL, authorized view name, UTC start/completion, duration, returned row count and limit, plus query/request IDs sent to Zetaris. Those IDs are client-generated correlation IDs, not independent signed receipts. Document provenance includes local candidate/document IDs, version, filename and SHA-256 of the exact CV text used. It contains no credentials, authorization headers or private endpoint URL. Model IDs and Nightshift receipts remain in the report's separate `executions` records.

The query uses fixed columns and `LIMIT 25`. This is a bounded candidate pool, not an exhaustive search of a larger view. Configure the authorized view to contain the intended pool. There is no model-generated SQL or automatic candidate filtering by local keyword/percentage rules. Zetaris joins source records; Nemotron interprets and reviews the supplied evidence.

Local SQLite retains document snapshots and H-MEM state for reproducible review. A new query updates changed document content/metadata and uses only its returned IDs, even when older imported candidates remain in the workspace. A source change or deletion during a pending request cancels that request before more inference or saving. Deleting a source also removes its document details from affected historical query traces.

## Reproduce the checks

```sh
npm test
npm run verify:zetaris
```

`npm test` uses simulated external services. The six Zetaris workflow tests cover refreshed document versions, exclusion of local/absent candidates, exact query/document lineage, empty/unauthorized/malformed/duplicate responses, local-mode independence, concurrent requests, deletion/redaction and escaped trace rendering. The existing provider tests cover protocol and size limits.

`npm run verify:zetaris` is a **real** one-role check through the application API. It verifies all three public fictional fixtures first, binds the analysis to their digest, starts an isolated temporary database, requests `sourceMode: "zetaris"`, and validates returned source hashes plus actual Nemotron model IDs and Nightshift receipts. Changed fixtures stop the run before CV inference. On success it writes ignored `data/live-zetaris-analysis.json`. It needs working services and provider quota. A failed attempt does not constitute a successful recording.

`npm run verify:review` now also uses a fresh Zetaris query for each of its three reports, before/after clarification and after restart. It writes the separate ignored `data/live-review-workflow.json`; publication of a recording is a distinct action. Historical 26 October recordings remain unchanged and do not claim to demonstrate the new 27 October query trace.

Programmatic callers use the existing endpoint:

```http
POST /api/vacancies/<vacancy-id>/analyze
X-TalentLens-Client: workspace
Content-Type: application/json

{"consent":true,"language":"en","sourceMode":"zetaris"}
```

Omitting `sourceMode` retains the earlier workspace behavior for existing clients. Verification scripts additionally send `expectedZetarisDigest`; this prevents a changed view from being sent to inference between fixture inspection and the fresh query.

## Verification status — 27 October 2026

50 application tests and all 13 official H-MEM checks passed. The application tests use simulated external transport. Syntax, saved recording integrity and credential checks passed. Both source modes and the visible trace were also exercised in the browser with simulated services.

**The real fresh-query check passed on 27 October at 07:35 UTC.** Docker's stale Inference Manager and Secrets Engine runtime folders were preserved under new names, allowing fresh sockets and the existing Linux engine to start. No images, containers or volumes were deleted. All four main Zetaris services became healthy. [Recovery steps](DOCKER-WINDOWS-RECOVERY.md).

`npm run verify:zetaris` queried the real joined view inside the analysis request, used its three fictional CVs and completed three actual `nvidia/nemotron-3.5-lightning-30b-a3b` calls through Nightshift. Every execution has an actual model ID and receipt. All document versions and hashes matched the query's sources. The [saved real result](../examples/zetaris/verified-fresh-query.json) contains the SQL, query/request IDs, timestamps, document provenance, complete report and receipts. `npm run test:recordings` checks this artifact offline, including exact fixture text and literal citations.

This is one real run, not an availability guarantee or accuracy benchmark. The separate [26 October clarification/restart workflow](../examples/zetaris/verified-review-workflow.json) remains historical and unchanged.
