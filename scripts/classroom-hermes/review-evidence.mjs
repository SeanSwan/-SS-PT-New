/** Deterministic receipt verifier for the 2026-08-21 Claude panel. */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const EXPECTED_PACKET_HASH = 'FF09857BBDD5D86563AC1FA13CBB4ADA26C1DE04E1B16C43F7F1C31855061AE5';
const PANEL_DIR = join('docs', 'ai-workflow', 'AI-HANDOFF', 'panel-classroom-hermes-radar-claude-2026-08-21');
const PACKET = join('docs', 'ai-workflow', 'AI-HANDOFF', 'CLASSROOM-HERMES-RADAR-PANEL-PACKET-2026-08-21.md');
const BLUEPRINT = join('docs', 'ai-workflow', 'brainstorms', 'classroom-copilot-2026-08-15', 'CLASSROOM-HERMES-RADAR-MASTER-BLUEPRINT-2026-08-21.md');

const SEATS = [
  { file: 'KIMI-PANEL-REVIEW.md', model: 'moonshotai/kimi-k3', cost: 0.0638 },
  { file: 'GLM-PANEL-REVIEW.md', model: 'glm-5.3', cost: 0 },
  { file: 'GROK-PANEL-REVIEW.md', model: 'x-ai/grok-4.6', cost: 0.0958 },
  { file: 'SOL-PANEL-REVIEW.md', model: 'openai/gpt-5.6-sol-pro', cost: 0.8319 },
];

function read(repoRoot, relative) {
  return readFileSync(join(repoRoot, relative), 'utf8');
}

function sha256(text) {
  return createHash('sha256').update(text).digest('hex').toUpperCase();
}

function lineCount(text) {
  return text.length === 0 ? 0 : text.split(/\r?\n/u).length - (text.endsWith('\n') ? 1 : 0);
}

export function verifyReviewEvidence(repoRoot) {
  const failures = [];
  const packetText = read(repoRoot, PACKET);
  const packetSha256 = sha256(packetText);
  if (packetSha256 !== EXPECTED_PACKET_HASH) failures.push('packet-hash-mismatch');

  const verdictCounts = {};
  const seatReceipts = SEATS.map((seat) => {
    const text = read(repoRoot, join(PANEL_DIR, seat.file));
    const verdict = text.match(/\bVERDICT:\s*(REVISE|APPROVE|REJECT)\b/iu)?.[1]?.toUpperCase() || 'MISSING';
    verdictCounts[verdict] = (verdictCounts[verdict] || 0) + 1;
    const modelPresent = text.includes(seat.model);
    const completionPresent = seat.file.startsWith('GLM-')
      ? text.includes('**Tokens:** 3205 in / 19719 out') && text.includes('**Wall:** 495.5s')
      : seat.file.startsWith('SOL-')
        ? text.includes('**Tokens:** 56698 in / 46011 out') && text.includes('**Wall:** 356.7s')
        : text.includes('**finish:** stop') || text.includes('**finish_reason:** stop') || text.includes('finish=stop');
    if (!modelPresent) failures.push(`${seat.file}:model`);
    if (!completionPresent) failures.push(`${seat.file}:completion`);
    if (verdict !== 'REVISE') failures.push(`${seat.file}:verdict`);
    const finishReason = text.includes('**finish:** stop') || text.includes('**finish_reason:** stop')
      ? 'stop'
      : 'not-recorded-in-seat-header';
    return { file: seat.file, model: seat.model, verdict, finishReason, costUsd: seat.cost };
  });

  const openRouterSpendUsd = Number(SEATS.reduce((total, seat) => total + seat.cost, 0).toFixed(4));
  if (openRouterSpendUsd !== 0.9915) failures.push('spend-math');

  const ledger = read(repoRoot, join(PANEL_DIR, 'DECISION-LEDGER.md'));
  const decisionCounts = { ADOPT: 0, REJECT: 0, DEFER: 0, NEEDS_PROBE: 0 };
  for (const line of ledger.split(/\r?\n/u)) {
    if (!/^\| D-\d{2} \|/u.test(line)) continue;
    const decision = line.match(/\*\*(ADOPT|REJECT|DEFER|NEEDS PROBE)\*\*/u)?.[1];
    if (!decision) {
      failures.push(`ledger-unclassified:${line.slice(2, 6)}`);
      continue;
    }
    const key = decision === 'NEEDS PROBE' ? 'NEEDS_PROBE' : decision;
    decisionCounts[key] += 1;
  }
  const expectedDecisions = { ADOPT: 22, REJECT: 2, DEFER: 2, NEEDS_PROBE: 4 };
  if (JSON.stringify(decisionCounts) !== JSON.stringify(expectedDecisions)) failures.push('decision-counts');

  const synthesis = read(repoRoot, join(PANEL_DIR, 'FABLE-FINAL-SYNTHESIS.md'));
  if (!synthesis.includes(`SHA-256 verified \`${EXPECTED_PACKET_HASH}\``)) failures.push('synthesis-hash-receipt');
  if (!synthesis.includes('REVISE BEFORE MAC')) failures.push('synthesis-verdict');
  if (!synthesis.includes('UNPROVEN')) failures.push('failed-codex-billing-status');

  const blueprint = read(repoRoot, BLUEPRINT);
  const blueprintLineCount = lineCount(blueprint);
  if (blueprintLineCount > 300) failures.push('blueprint-line-cap');
  const adoptedLocks = [
    'No deals on the daily card',
    'deterministic local check',
    '27B is NOT the Mac local default',
    'physically lacks child-capable fields',
    'pseudonymous child narratives are still child records',
  ];
  for (const lock of adoptedLocks) {
    if (!blueprint.toLowerCase().includes(lock.toLowerCase())) failures.push(`blueprint-lock:${lock}`);
  }

  return {
    ok: failures.length === 0,
    failures,
    packetSha256,
    openRouterSpendUsd,
    verdictCounts,
    decisionCounts,
    blueprintLineCount,
    seatReceipts,
  };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const receipt = verifyReviewEvidence(process.cwd());
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
  if (!receipt.ok) process.exitCode = 1;
}
