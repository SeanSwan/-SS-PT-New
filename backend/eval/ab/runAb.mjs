#!/usr/bin/env node
/**
 * A/B CLI Entry Point — Phase 7
 * ==============================
 * Run with: node eval/ab/runAb.mjs [options]
 *
 *   --providers openai,anthropic   Filter providers (comma-separated)
 *   --iterations 5                 Runs per scenario per provider (default: 1)
 *   --write-md                     Write markdown to docs/qa/
 *   --live                         Use real adapters (requires API keys)
 *
 * Exit codes:
 *   0 — Normal run (provider failures are expected data, not errors)
 *   1 — Internal runner failure (empty attempts/rankings)
 */
import { AB_SCENARIOS } from './abDataset.mjs';
import { runAbSuite, computeAbExitCode } from './abRunner.mjs';
import { formatAbJsonReport, formatAbMarkdownReport } from './abReport.mjs';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ── Parse CLI Args ──────────────────────────────────────────────────────────

function parseArgs(argv) {
  const config = {};
  const writeMd = argv.includes('--write-md');
  const live = argv.includes('--live');

  const providersIdx = argv.indexOf('--providers');
  if (providersIdx !== -1 && argv[providersIdx + 1]) {
    config.providers = argv[providersIdx + 1].split(',');
  }

  const iterationsIdx = argv.indexOf('--iterations');
  if (iterationsIdx !== -1 && argv[iterationsIdx + 1]) {
    const parsed = parseInt(argv[iterationsIdx + 1], 10);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      console.error(`Error: --iterations must be a positive integer, got: ${argv[iterationsIdx + 1]}`);
      process.exit(1);
    }
    config.iterations = parsed;
  }

  if (live) {
    config.live = true;
  }

  return { config, writeMd };
}

// ── Main ────────────────────────────────────────────────────────────────────

const { config, writeMd } = parseArgs(process.argv);

try {
  const suiteResult = await runAbSuite(AB_SCENARIOS, config);
  const jsonReport = formatAbJsonReport(suiteResult);

  // Live-mode: log configured vs unconfigured providers to stderr
  if (suiteResult.providerStatus) {
    console.error('Live-mode provider status:');
    for (const [provider, status] of Object.entries(suiteResult.providerStatus)) {
      console.error(`  ${provider}: ${status}`);
    }
  }

  // Always write JSON to stdout
  console.log(JSON.stringify(jsonReport, null, 2));

  // Conditionally write markdown report
  if (writeMd) {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const mdDir = resolve(__dirname, '../../../docs/qa');
    mkdirSync(mdDir, { recursive: true });
    const mdPath = resolve(mdDir, 'PROVIDER-AB-RESULTS.md');
    writeFileSync(mdPath, formatAbMarkdownReport(jsonReport));
    console.error(`Markdown report written to ${mdPath}`);
  }

  // Log summary highlights to stderr
  const { summary } = suiteResult;
  console.error(`A/B complete: ${summary.totalAttempts} attempts, ${summary.totalProviders} providers, ${summary.totalScenarios} scenarios`);
  if (summary.cheapestProvider) console.error(`  Cheapest: ${summary.cheapestProvider}`);
  if (summary.fastestProvider) console.error(`  Fastest: ${summary.fastestProvider}`);
  if (summary.mostReliableProvider) console.error(`  Most reliable: ${summary.mostReliableProvider}`);

  const exitCode = computeAbExitCode(suiteResult);
  if (exitCode !== 0) {
    console.error('INTERNAL ERROR: A/B suite produced no attempts or rankings');
  }
  process.exit(exitCode);
} catch (err) {
  console.error(`A/B suite failed: ${err.message}`);
  process.exit(1);
}
