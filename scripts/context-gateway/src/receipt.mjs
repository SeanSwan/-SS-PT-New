/**
 * receipt.mjs — sanitized local audit receipts + packet reconstruction for answer verification.
 * =============================================================================================
 * Every provider call leaves a receipt at .ai-workflow/context-gateway/receipts/ (gitignored
 * operational store — NEVER the tracked AI-HANDOFF lane, which would pollute the catalog).
 * Receipts carry the manifest (paths/windows/shas/tiers — no content), provider, model, token
 * counts, cost, and the citation audit. No secrets, no evidence bodies, no PII (Rule 8/44).
 *
 * reconstructPacket rebuilds a packet object from a saved packet JSON so `verify` can audit an
 * answer offline ($0): IDs are ordinal, so same-order addEvidence reproduces them; a manifest
 * mismatch (count or sha drift) throws rather than silently auditing the wrong evidence.
 *
 * @module context-gateway/receipt
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createPacket } from './packet.mjs';

/** Rebuild a packet (for citation audit) from a saved { manifest, evidence } JSON. */
export function reconstructPacket(saved) {
  const { manifest, evidence } = saved;
  if (!manifest || !Array.isArray(evidence)) throw new Error('packet JSON must contain manifest + evidence');
  const p = createPacket({ question: manifest.question, headSha: manifest.headSha, originatingModel: manifest.originatingModel, issue: manifest.issue ?? null });
  for (const e of evidence) {
    const id = p.addEvidence({ path: e.path, startLine: e.startLine, endLine: e.endLine, content: e.content, sha: e.sha, tier: e.tier });
    const m = manifest.evidence.find((x) => x.id === id);
    if (!m || m.path !== e.path || m.sha !== e.sha) throw new Error(`packet JSON drift at ${id}: evidence order/sha does not match manifest`);
  }
  const rebuilt = p.finalize();
  if (rebuilt.evidenceCount !== manifest.evidenceCount) throw new Error('packet JSON drift: evidence count mismatch');
  return p;
}

/** Write a sanitized markdown receipt; returns its path. `stamp` is caller-supplied (no Date.now here). */
export function writeReceipt({ root, stamp, provider, result, manifest, audit, spend }) {
  const dir = join(root, '.ai-workflow', 'context-gateway', 'receipts');
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${stamp}-${provider.name}.md`);
  const lines = [
    `# Context Gateway receipt — ${provider.name} (${stamp})`,
    '',
    `- **Question:** ${manifest.question}`,
    `- **Provider/model:** ${provider.name} / \`${result.model}\` (ceiling: ${provider.ceiling})`,
    `- **Repo HEAD:** ${manifest.headSha}${manifest.issue ? ` · **Issue:** ${manifest.issue}` : ''}`,
    `- **Packet provenance:** originating_model=${manifest.originatingModel}`,
    `- **Tokens:** ${result.inTok} in / ${result.outTok} out · **Cost:** ~$${result.cost.toFixed(4)} (est ~$${spend.estimate.toFixed(4)}, cap $${spend.cap}) · **Wall:** ${(result.wallMs / 1000).toFixed(1)}s`,
    `- **Citations:** ${audit.valid} valid / ${audit.invalid.length} invalid${audit.uncited ? ' · **UNCITED ANSWER**' : ''}`,
    ...(audit.invalid.length ? ['', '## Invalid citations', ...audit.invalid.map((i) => `- ${i.citation} — ${i.reason}`)] : []),
    '',
    '## Evidence manifest (windows only — no content)',
    ...manifest.evidence.map((e) => `- ${e.id} ${e.tier} ${e.path} L${e.startLine}-L${e.endLine} sha=${e.sha}`),
    '',
  ];
  writeFileSync(file, lines.join('\n'), 'utf-8');
  return file;
}
