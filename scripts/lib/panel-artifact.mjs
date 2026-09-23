/**
 * Deterministic checks for the provider reply contract used by consult-panel.
 * The transport runner owns byte/heading/evidence checks; this module owns the
 * verdict token and blocker-coherence rule so an APPROVE cannot hide P0/P1.
 */

const ALLOWED_VERDICTS = new Set(['APPROVE', 'REVISE', 'REJECT']);

function sectionBody(text, heading) {
  const headingPattern = new RegExp(`^${heading}\\s*$`, 'mi');
  const match = headingPattern.exec(text);
  if (!match) return null;
  const start = match.index + match[0].length;
  const remainder = text.slice(start);
  const nextHeading = remainder.search(/^##\s+/m);
  return remainder.slice(0, nextHeading < 0 ? remainder.length : nextHeading);
}

function firstNonHeadingLine(section) {
  return section
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith('#')) ?? '';
}

function hasP0OrP1Blocker(section) {
  return section
    .split(/\r?\n/)
    .some((line) => /^\s*(?:[-*]|\d+[.)])?\s*(?:\*\*)?P[01]\b/i.test(line));
}

function hasNumberedFinding(section) {
  return Boolean(section) && section
    .split(/\r?\n/)
    .some((line) => /^\s*(?:[-*]|\d+[.)])\s*(?:\*\*)?P[012]\b/i.test(line));
}

export function validateEvidenceMarkers(replyText) {
  const required = [
    ['P0/P1/P2 severity marker', /\bP[012]\b/i],
    ['Scenario:/Failure mode:', /(?:Scenario:|Failure mode:)/i],
    ['Evidence:/Reproducible:/Verified:', /(?:Evidence:|Reproducible:|Verified:)/i],
    ['Confidence:/Uncertainty:', /(?:Confidence:|Uncertainty:)/i],
  ];
  const blockersSection = sectionBody(replyText, '## BLOCKERS');
  if (hasNumberedFinding(blockersSection)) {
    required.push(['Correction:/Test:/Vector:', /(?:Correction:|Test:|Vector:)/i]);
  }
  const missing = required
    .filter(([, pattern]) => !pattern.test(replyText))
    .map(([label]) => label);
  return missing.length ? `missing required evidence markers: ${missing.join(', ')}` : null;
}

export function validateVerdictContract(replyText) {
  const verdictSection = sectionBody(replyText, '## VERDICT');
  if (verdictSection === null) return 'missing ## VERDICT section';

  const firstLine = firstNonHeadingLine(verdictSection);
  const token = firstLine.split(/\s+/, 1)[0] ?? '';
  if (!ALLOWED_VERDICTS.has(token)) {
    return 'VERDICT must begin with exactly APPROVE, REVISE, or REJECT';
  }

  const blockersSection = sectionBody(replyText, '## BLOCKERS');
  if (token === 'APPROVE' && blockersSection !== null && hasP0OrP1Blocker(blockersSection)) {
    return 'APPROVE conflicts with a P0/P1 blocker in BLOCKERS';
  }

  return null;
}
