/**
 * Waiver Artifact Service — SWA-140 S4
 * =====================================
 * Composes the DURABLE signed artifact: one self-contained HTML document with
 * the exact text snapshot, signer fields, consent grid, signature image, and
 * content hashes. Stored with the record at submit and offered to the signer
 * as their retainable copy (print/download).
 *
 * Why: the evidence must never depend on a future React bundle re-rendering
 * the same way. Three years from now this file IS the document as presented
 * (Opus 5 review, R1 — "the waiver everyone has, that nobody can produce").
 *
 * Deliberately dependency-free: inline styles, no external fonts, no scripts.
 */
import crypto from 'crypto';

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const DATE_FMT = new Intl.DateTimeFormat('en-US', {
  year: 'numeric', month: 'long', day: 'numeric',
  hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
});

function consentRow(label, accepted) {
  const mark = accepted ? 'YES' : 'NO';
  const color = accepted ? '#1a7f37' : '#8a6d00';
  return `<tr><td style="padding:6px 12px;border:1px solid #ccc;">${escapeHtml(label)}</td>` +
    `<td style="padding:6px 12px;border:1px solid #ccc;font-weight:bold;color:${color};">${mark}</td></tr>`;
}

/**
 * @returns {{ html: string, sha256: string }}
 */
export function composeWaiverArtifactHtml(input) {
  const {
    recordId, fullName, dateOfBirth, email, phone, signedAt, source,
    submittedByGuardian, guardianName, participantName,
    emergencyContactName, emergencyContactPhone,
    signatureData, consents, versions,
  } = input;

  const signedAtText = DATE_FMT.format(signedAt instanceof Date ? signedAt : new Date(signedAt));

  const versionList = versions
    .map((v) => {
      const scope = v.activityType ? ` (${escapeHtml(v.activityType)})` : '';
      const eff = v.effectiveAt ? new Date(v.effectiveAt).toISOString().slice(0, 10) : 'n/a';
      return `<li>${escapeHtml(v.title)}${scope} — v${escapeHtml(v.version)} · effective ${eff} · doc #${v.id} · sha256 ${escapeHtml(v.textHash)}</li>`;
    })
    .join('\n');

  const documents = versions
    .map(
      (v) => `<section style="margin:24px 0;padding:16px;border:1px solid #bbb;border-radius:6px;">
<h2 style="margin-top:0;">${escapeHtml(v.title)} <span style="font-size:0.7em;color:#555;">v${escapeHtml(v.version)} · doc #${v.id}</span></h2>
${v.displayText || '<p><em>(text unavailable)</em></p>'}
</section>`,
    )
    .join('\n');

  const signatureBlock = signatureData?.startsWith('data:image')
    ? `<img src="${signatureData}" alt="Signature of ${escapeHtml(submittedByGuardian ? guardianName : fullName)}" style="max-width:360px;border:1px solid #999;background:#fff;" />`
    : `<p style="font-family:'Times New Roman',serif;font-size:1.6em;font-style:italic;border:1px solid #999;display:inline-block;padding:8px 24px;">${escapeHtml(signatureData)}</p>`;

  const guardianRows = submittedByGuardian
    ? `<tr><td style="padding:6px 12px;border:1px solid #ccc;">Signed by parent/guardian (contracting party)</td><td style="padding:6px 12px;border:1px solid #ccc;">${escapeHtml(guardianName)}</td></tr>
<tr><td style="padding:6px 12px;border:1px solid #ccc;">Participant</td><td style="padding:6px 12px;border:1px solid #ccc;">${escapeHtml(participantName || fullName)}</td></tr>`
    : '';

  const emergencyRows = emergencyContactName
    ? `<tr><td style="padding:6px 12px;border:1px solid #ccc;">Emergency contact</td><td style="padding:6px 12px;border:1px solid #ccc;">${escapeHtml(emergencyContactName)} · ${escapeHtml(emergencyContactPhone || '')}</td></tr>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>SwanStudios — Signed Waiver Record #${recordId}</title>
</head>
<body style="font-family:Georgia,'Times New Roman',serif;color:#111;background:#fff;max-width:720px;margin:0 auto;padding:32px 16px;">
<header style="border-bottom:3px double #333;padding-bottom:16px;margin-bottom:24px;">
  <h1 style="margin:0;">SwanStudios — Signed Waiver &amp; Consent Record</h1>
  <p style="margin:8px 0 0;color:#444;">Confirmation #${recordId} · Signed ${escapeHtml(signedAtText)} · Source: ${escapeHtml(source)}</p>
</header>

<h2>Signer</h2>
<table style="border-collapse:collapse;width:100%;">
<tr><td style="padding:6px 12px;border:1px solid #ccc;width:40%;">Full name</td><td style="padding:6px 12px;border:1px solid #ccc;">${escapeHtml(fullName)}</td></tr>
<tr><td style="padding:6px 12px;border:1px solid #ccc;">Date of birth</td><td style="padding:6px 12px;border:1px solid #ccc;">${escapeHtml(dateOfBirth)}</td></tr>
<tr><td style="padding:6px 12px;border:1px solid #ccc;">Email</td><td style="padding:6px 12px;border:1px solid #ccc;">${escapeHtml(email || '—')}</td></tr>
<tr><td style="padding:6px 12px;border:1px solid #ccc;">Phone</td><td style="padding:6px 12px;border:1px solid #ccc;">${escapeHtml(phone || '—')}</td></tr>
${guardianRows}
${emergencyRows}
</table>

<h2>Consents</h2>
<table style="border-collapse:collapse;width:100%;">
${consentRow('Liability waiver & release accepted', consents.liabilityAccepted)}
${consentRow('Swan Coach (AI-assisted) features consent', consents.aiConsentAccepted)}
${consentRow('Photo & media release (optional)', consents.mediaConsentAccepted)}
${consentRow('Guardian acknowledgment', consents.guardianAcknowledged)}
</table>

<h2>Documents signed (exact versions)</h2>
<ul>
${versionList}
</ul>

<h2>Signature</h2>
${signatureBlock}

<hr style="margin:32px 0;" />
<h2>Full text as presented</h2>
${documents}

<footer style="margin-top:32px;border-top:1px solid #999;padding-top:12px;color:#555;font-size:0.85em;">
  This document was generated at the moment of signing and stored with the signed record.
  Keep it for your records. Questions: contact SwanStudios.
</footer>
</body>
</html>`;

  const sha256 = crypto.createHash('sha256').update(html, 'utf8').digest('hex');
  return { html, sha256 };
}
