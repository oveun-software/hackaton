# Guided fictional-CV pilot and recruiter observation protocol

Purpose: observe whether the evidence matrix and clarification workflow help recruiters find supported claims and formulate a useful next question. This exploratory pilot does not validate hiring outcomes or fairness.

The guided pilot is implemented and can be tried immediately by anyone. Run `npm run demo`, open http://127.0.0.1:4319/pilot.html and follow the two rounds. The page records real session times and assessments, then offers a local JSON download. It does not verify the participant’s profession, grade question quality, or claim that a team member or automated UI check is a recruiter study.

For a separate facilitated study, use 2–3 consenting recruiters. Give each a random participant code; do not record names, employers, contact details, real CVs or personal opinions about real candidates. The team must invite participants itself; no messages have been sent by the application.

## Materials

- Two fictional task sets: the `frontend` and `data` groups in `cases.js`.
- Manual condition: job description and original fictional CV texts only.
- Assisted condition: the matching real report in `results.json`, source texts and the TalentLens evidence matrix. The report must be identified as saved AI output.
- The built-in session timer and JSON download; `pilot-results.csv` for additional human observations.
- All 16 synthetic CV files in `examples/pilot/`; eight of them form the two guided task sets.
- The recorded before/after/recall workflow in `public/showcase.html` for a separate usability observation.

## Procedure

1. Explain that this is an unfinished recruitment-assistance prototype. Participation is voluntary and can stop at any time. Collect no real candidate data.
2. The runner randomly assigns one of four combinations of task order and condition order. For a 2–3 person facilitated study, check the exported assignment and balance later sessions if needed; a small random sample can repeat an assignment. Record task order so learning effects remain visible.
3. For each task, start timing when the materials open. Ask the recruiter to mark each of the four profiles as supported, unclear or missing for the mandatory criterion, cite the relevant source, and write one question for an unclear profile. Stop when they finish. Do not coach during timing.
4. The page compares four assessments with the authored expectations and records disagreements. Separately review source-location accuracy and question quality; these are not automatically graded. Preserve disagreement notes; the project maintainers' labels may also need review.
5. Show the separate clarification demo. Ask them to locate the new source, explain what changed and identify whether the statement was independently verified. Record completion and confusion, not just whether they liked the product.
6. Ask: “What would stop you trusting this report?” and “What would you need before using it in your work?” Record anonymised observations with consent.

## Reporting

Report participant count, task sets/order, actual times and errors. If fewer than two complete participants are available, describe individual observations and avoid an average productivity claim. With 2–3 participants, any percentage improvement is exploratory and susceptible to order and task-difficulty effects; report the underlying times alongside it. Do not describe these results as a scientific benchmark or infer hiring fairness.

Keep raw participant observations local unless participants agree to their anonymised publication. Publish only the agreed aggregate or anonymised summary. The existing CSV intentionally has a header and no fabricated rows.
