// Compare evidence states, never calculate a candidate score. IDs are stable
// when a role is reanalysed with its previously reviewed requirements.
export function evidenceChanges(before, after) {
  if (!before || before.privacyRedacted) return [];
  const changes = [];
  for (const candidate of after.candidates) {
    const previous = before.candidates.find(item => item.candidateId === candidate.candidateId);
    if (!previous) continue;
    for (const evidence of candidate.evidence) {
      const requirement = after.requirements.find(item => item.id === evidence.requirementId);
      const previousRequirement = before.requirements.find(item => item.id === requirement.id && item.label === requirement.label);
      if (!previousRequirement) continue;
      const old = previous.evidence.find(item => item.requirementId === previousRequirement.id);
      if (old && (old.status !== evidence.status || old.quote !== evidence.quote || old.sourceId !== evidence.sourceId)) {
        changes.push({ candidateId: candidate.candidateId, requirementId: requirement.id, before: old.status, after: evidence.status,
          sourceChanged: old.sourceId !== evidence.sourceId || old.quote !== evidence.quote });
      }
    }
  }
  return changes;
}
