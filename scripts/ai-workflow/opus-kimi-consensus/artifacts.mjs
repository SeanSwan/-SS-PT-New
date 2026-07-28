/** Durable run receipts and builder-packet writer. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

function safeRunId(value) {
  const clean = String(value || '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-|-$/g, '');
  return clean || new Date().toISOString().replace(/[:.]/g, '-');
}

export function writeRunArtifacts({ outputDir, runId, task, mode, context, result, spend }) {
  const dir = resolve(outputDir, safeRunId(runId));
  mkdirSync(dir, { recursive: true });
  const paths = {
    packet: join(dir, 'builder-exact-packet.md'),
    transcript: join(dir, 'debate-transcript.md'),
    manifest: join(dir, 'swan-source-manifest.json'),
    receipt: join(dir, 'run-receipt.json'),
  };

  const packet = result.builderPacket || `# No Consensus\n\nStatus: ${result.status}\n\nThe last candidate is preserved in the transcript. No builder authorization was produced.`;
  writeFileSync(paths.packet, packet, 'utf8');

  const transcript = [
    '# Opus Kimi Debate Transcript',
    `\n**Task:** ${task}\n**Mode:** ${mode}\n**Status:** ${result.status}\n**Rounds:** ${result.rounds}`,
    ...result.turns.map((turn, index) => `\n---\n\n## Turn ${index + 1} ? Round ${turn.round} ? ${turn.brain}\n\n${turn.raw}`),
  ].join('\n');
  writeFileSync(paths.transcript, transcript, 'utf8');
  writeFileSync(paths.manifest, JSON.stringify({
    sources: context.sources,
    rejected_files: context.rejectedFiles,
    context_truncated: context.truncated,
  }, null, 2), 'utf8');

  const receipt = {
    schema_version: 1,
    run_id: safeRunId(runId),
    task,
    mode,
    status: result.status,
    rounds: result.rounds,
    consensus_digest: result.digest || null,
    source_manifest: context.sources,
    rejected_files: context.rejectedFiles,
    cap_usd: spend.capUsd,
    spent_usd: spend.spentUsd,
    model_calls: spend.calls.length,
    calls: spend.calls,
    generated_at: new Date().toISOString(),
  };
  writeFileSync(paths.receipt, JSON.stringify(receipt, null, 2), 'utf8');
  return { dir, paths, receipt };
}
