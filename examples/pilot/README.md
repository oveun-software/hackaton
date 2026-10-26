# Fictional CV test pack

Sixteen short synthetic CVs, organised into frontend, quality, data and leadership roles. Each file is deliberately concise so the evidence under test is visible: experience, interest, negation, conflict, adjacent skills or an embedded instruction attack. None represents a real person.

The authoritative texts, role descriptions and pre-authored expected assessments are in [evaluation/cases.js](../../evaluation/cases.js). Regenerate the TXT files with `npm run samples:pilot`. Real model outputs and receipts are in [evaluation/results.json](../../evaluation/results.json).

Run `npm run demo` and choose **Try a guided CV review**. The frontend and data sets support two timed manual/assisted rounds. Results are generated only when a person completes a session; no recruiter observations are prefilled. The source CV wording stays original while interface and report narratives are available in English, Spanish, French and German.

## English examples for judges

The first 12 CVs below are entirely English and cover three different roles. The leadership set adds three English profiles and one intentionally Spanish profile. [Paired jobs, exact model inputs and real outputs](../judges/README.md) make every case inspectable. TXT CV files include human-readable fixture labels; the exact text submitted in the recorded evaluation is in each paired `input.json`.

### Frontend engineer

[Job](../judges/frontend/job.txt) · [Real output](../judges/frontend/output.json)

- [Explicit professional experience](fe-explicit.txt)
- [Interest in learning rather than stated experience](fe-interest.txt)
- [Explicit absence of experience](fe-negation.txt)
- [An embedded instruction attack](fe-injection.txt)

### Quality engineer

[Job](../judges/quality/job.txt) · [Real output](../judges/quality/output.json)

- [Automated testing and accessibility](qa-explicit.txt)
- [Manual testing](qa-manual.txt)
- [A future course](qa-course.txt)
- [Conflicting sources](qa-contradiction.txt), with a [separate fictional interview answer](qa-contradiction-clarification.txt)

For the contradictory case, upload the CV and then record the interview text as an attributed clarification using the candidate's follow-up form. Do not upload the clarification as another CV or merge it into the CV. The programmatic evaluation already keeps these sources separate.

### Data analyst

[Job](../judges/data/job.txt) · [Real output](../judges/data/output.json)

- [SQL and Python experience](data-explicit.txt)
- [Spreadsheets and future SQL learning](data-spreadsheet.txt)
- [SQL with no Python experience](data-sql.txt)
- [Adjacent MongoDB experience](data-transfer.txt)

### Engineering team lead

[Job](../judges/leadership/job.txt) · [Real output](../judges/leadership/output.json)

- [Direct management and Scrum facilitation](lead-explicit.txt)
- [Participation without management](lead-participant.txt)
- [Facilitation without direct management](lead-facilitator.txt)
- [Spanish source for the multilingual test](lead-spanish.txt), with an [English reading aid](../judges/README.md#spanish-source-english-explanation)
