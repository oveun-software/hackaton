# Fictional CV test pack

Sixteen short synthetic CVs, organised into frontend, quality, data and leadership roles. Each file is deliberately concise so the evidence under test is visible: experience, interest, negation, conflict, adjacent skills or an embedded instruction attack. None represents a real person.

The authoritative texts, role descriptions and pre-authored expected assessments are in [evaluation/cases.js](../../evaluation/cases.js). Regenerate the TXT files with `npm run samples:pilot`. Real model outputs and receipts are in [evaluation/results.json](../../evaluation/results.json).

Run `npm run demo` and choose **Try a guided CV review**. The frontend and data sets support two timed manual/assisted rounds. Results are generated only when a person completes a session; no recruiter observations are prefilled. The source CV wording stays original while interface and report narratives are available in English, Spanish, French and German.
