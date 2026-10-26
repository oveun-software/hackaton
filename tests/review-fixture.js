// Stub for transport/workflow tests. Semantic quality is measured separately
// against annotated fictional cases through the real model.
export function reviewFixture(messages) {
  const text = messages[1].content;
  const data = JSON.parse(text.split('ORIGINAL DATA: ')[1].split('\nDRAFT: ')[0]);
  const report = JSON.parse(text.split('\nDRAFT: ')[1]);
  for (const c of report.candidates) for (const e of c.evidence) {
    const candidate = data.candidates.find(item => item.id === c.candidateId);
    const source = candidate.sources.find(s => e.quote && s.text.includes(e.quote));
    const memory = candidate.hmem.find(s => e.quote && s.evidenceText.includes(e.quote));
    e.sourceId = e.quote ? source?.id || memory?.documentId || 'test-document' : null;
    e.followUpQuestion = e.status === 'supported' ? null : 'Which documented project demonstrates this requirement?';
  }
  return { summary: 'Fixture review preserves source-backed evidence for human inspection.', findings: [], report };
}
