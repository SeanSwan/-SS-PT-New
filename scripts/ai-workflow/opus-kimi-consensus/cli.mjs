#!/usr/bin/env node
/** CLI entry point for dry-run estimates and explicitly confirmed paid runs. */
import { parseCliArgs } from './cli-core.mjs';
import { executeConsensusRun } from './run.mjs';

const HELP = `Opus Kimi Debate Brain

Usage:
  node scripts/ai-workflow/opus-kimi-consensus/cli.mjs --task "..." [options]

Options:
  --mode auto|analyze|review|build|design
  --file path[,path]              Bounded repo context; secret/data paths rejected
  --max-rounds N                  1-7; default 7
  --max-context-chars N           Default 120000
  --max-tokens-per-turn N         Visible packet tokens; default 24000 (+4000 reasoning)
  --cap-usd N                     Hard per-run cap; default $3
  --out path                      Artifact parent directory
  --confirm-spend                 Required for any API/model call

Without --confirm-spend this command is a zero-cost preflight only.`;

async function main() {
  let args;
  try { args = parseCliArgs(); } catch (error) {
    console.error(error.message);
    console.error('\n' + HELP);
    process.exitCode = 1;
    return;
  }
  if (args.help) { console.log(HELP); return; }
  const options = { ...args, root: process.cwd() };
  const result = await executeConsensusRun(options);
  if (result.status === 'preflight') {
    console.log(JSON.stringify({
      status: 'preflight',
      model_calls: 0,
      max_rounds: args.maxRounds,
      estimated_max_calls: result.estimate.calls,
      worst_case_usd: result.estimate.usd,
      cap_usd: args.capUsd,
      swan_sources: result.context.sources,
      rejected_files: result.context.rejectedFiles,
      missing_files: result.context.missingFiles,
      warning: result.warning,
      next: result.context.rejectedFiles.length > 0 || result.context.missingFiles.length > 0
        ? 'Replace or remove every missing file path before requesting a paid run.'
        : 'Re-run with --confirm-spend only after Sean explicitly authorizes this paid Opus Kimi debate run.',
    }, null, 2));
    return;
  }
  console.log(JSON.stringify({
    status: result.status,
    rounds: result.rounds,
    spent_usd: result.spend.spentUsd,
    packet: result.artifacts.paths.packet,
    transcript: result.artifacts.paths.transcript,
    receipt: result.artifacts.paths.receipt,
  }, null, 2));
  if (result.status !== 'consensus') process.exitCode = 2;
}

main().catch((error) => {
  console.error(`Opus-Kimi run failed: ${error.message}`);
  process.exitCode = 1;
});


