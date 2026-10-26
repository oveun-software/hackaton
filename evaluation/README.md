# Quality evaluation

`cases.js` contains 16 fictional profiles in four roles, with 32 expected evidence assessments. The cases cover explicit experience, future interest, negation, manual versus automated testing, contradictory CV/interview claims, technology substitution, participation versus leadership, Spanish source evidence, and an instruction injection inside a CV.

Expectations were written before execution by the project maintainers. They are not independent recruiter labels or a statistically representative hiring dataset. No real personal data is included.

Run `npm run evaluate` with Nightshift/Nemotron configured. This calls the actual application analysis pipeline, including its second critical review. It records the canonical JSON dataset SHA-256, date, actual executed model, Nightshift receipts, full outputs, elapsed time and failures in `results.json`. CI uses mocked transport and does not spend inference quota.

## What is measured

- Evidence status agrees with the authored expectation for each criterion/candidate pair. Some absence/interest cases accept either `unclear` or `missing`; neither may claim support.
- Requirements map to separate atomic criteria and preserve required/preferred priority. Ambiguous mapping counts as failure, not a skipped case.
- Unsupported positive assessments are counted separately.
- The injection's requested marker must not appear in the generated narrative. This checks one attack, not comprehensive injection resistance.
- Critical-review changes are counted. A change is not automatically an improvement; the final labels still need to match expectations.
- Literal citations, source identity and complete coverage must pass application validation before a report is accepted.

The runner saves incomplete runs and returns a failing exit code for missing groups or expectation mismatches. Do not remove difficult cases to improve a headline. Report denominators and remaining failures, and retain historical outputs when materially changing the dataset.

## Memory comparison

`npm run verify:review` records an attributed clarification for a fictional candidate, restarts the app and analyses another role. Its paired no-memory condition uses the same current CVs, role description, requirements and model. H-MEM is the only path that supplies the earlier clarification to the second role. One run per condition is illustrative, not a controlled estimate of average causal benefit: inference remains stochastic.

## Human validation

Run `npm run demo`, then open the **guided CV review** link. It randomly assigns one of four task/order combinations, measures actual elapsed time in two rounds, checks four mandatory-criterion assessments per round against the authored key and downloads the session as JSON. The manual condition shows source CVs; the assisted condition adds the real saved Nemotron report. The interface and reports support four languages; exact source texts remain original. Answers stay in the tab unless downloaded. No results are prefilled.

[Sixteen fictional CV files](../examples/pilot/README.md) are provided, including cases outside the two guided task sets. `npm run samples:pilot` regenerates them. Use [RECRUITER-PILOT.md](RECRUITER-PILOT.md) and [pilot-results.csv](pilot-results.csv) for a separate facilitated study with 2–3 consenting recruiters. Role verification, source-location accuracy, question quality and qualitative observations require human review. No recruiter results or productivity claims are asserted.
