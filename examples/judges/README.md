# Judge examples: inputs paired with real outputs

Start with the [judge walkthrough](../../docs/JUDGES.md). All names and CVs are fictional, created for this project during the hackathon. These are small diagnostic fixtures, not real applicants or measured recruitment outcomes. The source text and case definitions are maintained in [evaluation/cases.js](../../evaluation/cases.js).

The first three scenarios are entirely in English. Each contains an English job, four CVs, two criteria and the corresponding **real Nemotron output**, including literal evidence citations, review findings, actual model IDs and Nightshift receipt IDs.

| Scenario | Input and offer | Recorded output | What to inspect |
| --- | --- | --- | --- |
| Frontend engineer | [input.json](frontend/input.json), [job.txt](frontend/job.txt), [CV files](../pilot/README.md#frontend-engineer) | [output.json](frontend/output.json) | Professional TypeScript experience versus future interest or explicit absence; an instruction embedded in a CV must not become evidence. |
| Quality engineer | [input.json](quality/input.json), [job.txt](quality/job.txt), [CV files](../pilot/README.md#quality-engineer) | [output.json](quality/output.json) | Automated versus manual testing; a contradictory interview statement is a separate attributed source. |
| Data analyst | [input.json](data/input.json), [job.txt](data/job.txt), [CV files](../pilot/README.md#data-analyst) | [output.json](data/output.json) | SQL experience versus spreadsheet work or MongoDB; Python evaluated independently. |
| Engineering team lead — multilingual extension | [input.json](leadership/input.json), [job.txt](leadership/job.txt), [CV files](../pilot/README.md#engineering-team-lead) | [output.json](leadership/output.json) | Managing versus participating; English output interprets one intentionally Spanish CV while preserving its original quotes. |

`input.json` is the exact vacancy, candidate text and separately attributed sources supplied to the analysis pipeline, with `synthetic` added as a disclosure. Expected labels are not sent to Nemotron. `output.json` is an export of the corresponding group in [evaluation/results.json](../../evaluation/results.json); cached narrative translations are omitted. `cells` contains the maintainer-authored expectations and measured statuses. The complete report is under `report`, and per-request model/receipt records are under `executions`.

The saved run matched 32/32 authored assessments across four roles. That result describes this small set only. Repeated live inference may differ. Follow the literal source IDs and quotations when judging an assessment; a citation does not establish that a fictional candidate's claim would be true in the real world.

## Reproduce or inspect

- Without accounts: `npm run demo` opens the interactive recorded workflow and guided CV review. Inspect these paired JSON files directly for all four role families.
- Offline integrity checks after `npm ci`: `npm run test:recordings` checks these exports against the authoritative cases/results, verifies sources and recorded translations. It does not rerun the model.
- New inference: configure your own Nightshift/NVIDIA access using the [team setup](../../docs/TEAM-SETUP.md), then run `npm run evaluate`. This sends the 16 fictional profiles through the real analysis pipeline and replaces `evaluation/results.json` with the new run. Run it in a disposable clone if you want to preserve the submission snapshot. This evaluation uses local fixtures; the separate `npm run verify:review` proves the Zetaris import, clarification, restart and H-MEM workflow.
- Refresh these files from a successful evaluation: `npm run samples:judges`. This only exports existing results and makes no provider calls.

The [recorded Zetaris workflow](../zetaris/verified-review-workflow.json) supplies another three English input/output reports: initial comparison, attributed clarification and another vacancy after restart, plus a paired no-memory condition.

## Spanish source, English explanation

The extra `lead-spanish` CV intentionally tests multilingual interpretation. Its English reading aid is: “I directly managed a team of six engineers, including performance reviews and development plans. I facilitated Scrum planning and retrospective meetings for two years.” This translation is documentation only; the recorded model input and literal citations retain the Spanish original. The three primary scenarios above need no Spanish knowledge.
