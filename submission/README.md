# Submission package: pending review

The project is **not submitted or marked complete**. No video is included, as requested.

| Material | Location and status |
| --- | --- |
| English application text | [APPLICATION-DRAFT.md](APPLICATION-DRAFT.md), for the leader to review and copy into HackOS |
| Updated ten-slide English PowerPoint | [TalentLens-Deck.pptx](TalentLens-Deck.pptx), editable text/architecture and actual product capture |
| PDF deck | [TalentLens-Deck.pdf](TalentLens-Deck.pdf), ten matching pages |
| Product captures | [matrix](assets/evidence-matrix.png), [source](assets/evidence-source.png) |
| Account-free recorded viewer | `npm run demo`, then http://127.0.0.1:4319 |
| Guided manual/assisted review | http://127.0.0.1:4319/pilot.html; actual timing, answers and JSON download |
| Sixteen fictional CV files | [test pack](../examples/pilot/README.md) |
| Real quality evaluation | [method](../evaluation/README.md), [32 assessments and receipts](../evaluation/results.json) |
| Real clarification/restart/comparison | [recording](../examples/zetaris/verified-review-workflow.json) |
| Individual account setup | [team setup](../docs/TEAM-SETUP.md) |
| Sponsors and provenance | [submission notes](../docs/SUBMISSION.md) |
| Engineering checks | 36/36 application tests, 13/13 official H-MEM checks; syntax and credential scan |
| Video | Intentionally not produced |
| HackOS draft | Not saved: current member cannot manage submissions. Maria Rodriguez is the leader |
| Final submission | Pending user review and video; do not finalize |
| Repository | Public since 26 October with owner authorization |

## Quick demonstration

Clone the repository, install Node.js 22.16+ and run `npm run demo`. No dependency installation, Docker, `.env` or sponsor accounts are required. Open the three recorded steps: original evidence, attributed clarification and retained context in another role. Click a matrix cell to inspect its quotation and source. Narratives and controls support English, Spanish, French and German; quotes remain original.

Choose **Try a guided CV review** for two rounds with different fictional tasks, one manual and one with recorded AI evidence. The page measures actual time and records disagreements with an authored answer key. It does not invent participant results, verify professional roles or infer population productivity gains. [Protocol](../evaluation/RECRUITER-PILOT.md).

For fresh inference, configure your own services, run `npm run doctor`, then `npm run verify:review`. This verifies the three public Zetaris fixtures before sending them and uses an isolated temporary database. `npm run evaluate` exercises 16 profiles. `npm run demo:publish-recording` validates and translates saved outputs. Run these commands sequentially; publication and live verification share an intermediate file.

## Latest real results

**Passed on 26 October 2026.** Three reports and a paired no-memory condition, with ten actual Nemotron Lightning calls through Nightshift. Sam Torres's TypeScript evidence changed from unclear to supported after a separately attributed fictional answer. Following restart, another role retrieved and cited it. The otherwise matching current-CV-only condition remained unclear. This is one stochastic comparison, not proof of average causal benefit.

The 16-case evaluation matched **32/32 authored expectations**, with zero unsupported positives and all four requirement groups mapped correctly. The critical pass changed zero cells; no incremental quality gain is claimed. This small authored set is not an independent recruiter benchmark, fairness certification or hiring-outcome study.

Earlier successful runs remain in [Zetaris examples](../examples/zetaris/README.md) as dated historical artifacts. Saved results are not new live executions.

## Remaining delivery actions

- The leader must review/copy the prepared content into an available portal draft.
- Record and attach the 1–4 minute video in a separate task.
- Final submission remains pending explicit user approval.
- Recruiter observations and production capabilities remain future validation/work.
