# Judge walkthrough

TalentLens is a local, single-user prototype. **No TalentLens demo username or password is required.** The sample viewer also needs no sponsor account, API key, GPU, Docker or dependency installation. All supplied CVs describe fictional people.

## 1. Start from a clean clone

Install Git and Node.js **22.16+** (Node 22 recommended), then run:

```sh
git clone https://github.com/oveun-software/hackaton.git
cd hackaton
npm run demo
```

Open **http://127.0.0.1:4319/showcase.html?lang=en**. In Windows PowerShell, use `npm.cmd` instead of `npm` if script execution is restricted. Stop with Ctrl+C. If port 4319 is occupied, set `DEMO_PORT` to another free port before starting. After cloning, this mode needs no internet connection and never loads `.env` or calls Zetaris, Nightshift or NVIDIA.

This is the project's sample/fallback command. It displays **saved results of real model executions**, clearly labelled recorded. It lets you inspect evidence and complete a guided exercise; it does not generate a fresh AI analysis for an arbitrary uploaded CV. The project does not require a literal `SAMPLE_MODE=true` environment variable. Fresh model execution is available through the separate path in step 4.

## 2. Inspect the main workflow

1. Select **Before clarification**. Open Sam Torres's TypeScript cell: the recorded result is unclear, with its source and follow-up question.
2. Select **After clarification**. The same requirement is supported by a separately attributed fictional answer. Open the cell and inspect its provenance and the before/after change.
3. Select **Another role, context retained**. A restart occurred before this recorded run. H-MEM supplies the prior source; the paired current-CV-only condition remains unclear. This is one illustrative pair, not a statistical benefit claim.
4. Open **Execution evidence** for each report to see actual model IDs and Nightshift receipts. Open the critical-review findings and the original source text.
5. Choose **Try a guided CV review**. Complete two rounds, one manual and one using a real saved report, and download your actual answers/timing as JSON. No participant results are prefilled or sent to a server.

The interface defaults to English. Spanish, French and German are available from the language selector. Exact source quotations remain in the original language.

## 3. Check more than one context

The [paired example index](../examples/judges/README.md) provides four job families and their corresponding real outputs. Frontend, quality and data are entirely English; the fourth deliberately includes one Spanish source to exercise multilingual understanding. Each pair includes the job, four CV texts, any separate clarification, the report and per-request execution metadata. [Individual TXT CVs](../examples/pilot/README.md) are also committed.

To run offline validation and application tests, install dependencies once:

```sh
npm ci
npm run check
npm test
npm run test:recordings
npm run test:hmem:conformance
```

The application tests use mocked external transport. The recording check validates saved real outputs, including literal quotes and the paired examples. The official H-MEM suite downloads a pinned, hash-checked runner on first use and then uses the cache; that initial download requires internet access. These commands do not use paid inference or personal provider keys.

## 4. Generate new results

For live sponsor integration, follow [individual setup](TEAM-SETUP.md) and the [Zetaris fictional-source recipe](../examples/zetaris/README.md). Each evaluator uses their own access. The NVIDIA key belongs in Nightshift; the local `.env` contains the Nightshift runtime token and a read-only Zetaris key. No team account or credential sharing is needed.

After installing the dependencies and configuring the services:

```sh
npm run setup
npm run doctor
npm start
```

Open **http://127.0.0.1:4317/?lang=en**. Create/open a role, select **Zetaris · fresh query**, grant consent and choose **Analyze from Zetaris**. No prior import is necessary. Inspect the query, row count and document versions in **Zetaris data access** above the matrix. [Detailed sponsor walkthrough](ZETARIS-WORKFLOW.md). For **Workspace CVs · local mode**, you can also upload the [English sample CVs](../examples/pilot/README.md) and copy an [example job](../examples/judges/README.md). A manual upload exercises document analysis but does not itself demonstrate Zetaris integration.

The [27 October real fresh-query result](../examples/zetaris/verified-fresh-query.json) is available for offline inspection: exact SQL/timing, three fictional CV inputs, document versions/hashes, full output and three actual Nemotron Lightning/Nightshift receipts. It passed after the documented Docker socket recovery. This supplements the separate 26 October clarification/memory demonstration.

Programmatic entry points, runnable from another terminal:

| Command | Inputs and result | Services |
| --- | --- | --- |
| `npm run verify:zetaris` | Fresh query inside one analysis request; checks the known fixtures, exact source hashes and actual model receipts; writes `data/live-zetaris-analysis.json` | Zetaris + Nightshift + NVIDIA Nemotron |
| `npm run evaluate` | Four roles / 16 fictional profiles; writes new reports, checks and model receipts to `evaluation/results.json` | Nightshift + NVIDIA Nemotron |
| `npm run verify:review` | Checks the three known Zetaris fixtures before inference; clarification, restart, H-MEM recall and paired comparison; writes `data/live-review-workflow.json` | Zetaris + Nightshift + NVIDIA Nemotron |

Run these sequentially, with available provider quota. They make real requests; new wording or decisions may differ from saved outputs. The verification uses an isolated database. The evaluation overwrites its output file, so use a disposable clone to retain the submitted snapshot. There is no silent fallback that presents a recorded result as a new inference. See the [sponsor explanation](SUBMISSION.md) and [H-MEM implementation/checks](HMEM-INTEGRATION.md).

## 5. Delivery status

The [submission package](../submission/README.md) contains the English slide deck, PDF, application draft and product captures. The video and final HackOS submission are still pending. The [Official Rules](https://hackathon.genai.works/resources?id=01a08ff1-54cc-709a-bfe7-6b34452b676b) and [Submission Requirements](https://hackathon.genai.works/resources?id=01a08ff1-54c3-70c5-b262-31e75dfd1e60), checked on 26 October, require public runnable source/setup instructions and recommend at least three input/output examples plus fallback mode. Those documents do not specify that every source CV must be in English or require a demo login for a local application.

## Clean-clone verification — 26 October 2026

Verified on Windows with Node.js 22.23.2, using a fresh clone of committed files, no copied `.env`, no copied database and no copied `node_modules`:

- Before installing dependencies: the sample server, all requested viewer assets, three recorded reports and the two guided tasks were available over local HTTP. No live API or `.env` was exposed.
- `npm ci` installed 81 packages and reported zero vulnerabilities at verification time.
- The full app started with no configured credentials and a new empty store; the sample action loaded three fictional CVs and a role, with no fabricated report.
- All 36 application tests, the four paired example/source/translation checks, syntax checks and credential scan passed.
- The official H-MEM runner downloaded and verified its pinned files, then passed 13/13 checks.

No new model inference was claimed by this clean-clone check. The separate real executions and their dated receipts remain in the paired outputs and Zetaris workflow recording. Linux startup and tests are also exercised by the repository's GitHub Actions workflow.
