#!/usr/bin/env node
/**
 * SCRIPT: Mission QA report generator
 * PURPOSE: Write a concise mission QA evidence artifact for handoff/review.
 * SAFETY: Reads local test-result metadata only and never includes credentials.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const args = process.argv.slice(2);
const showHelp = args.includes('--help') || args.includes('-h');
const outputArg = args.find((arg) => arg.startsWith('--out='))?.slice('--out='.length);
const outputPath = path.resolve(
  repoRoot,
  outputArg || 'docs/qa/reports/SWANSTUDIOS-MISSION-QA-REPORT-latest.md',
);

const residualRisks = [
  'Authenticated production admin/trainer/client checks require local SWAN_PROD_*_AUTH_STATE files.',
  'Write workflows remain staging-only until an isolated staging database and Stripe test keys are confirmed.',
  'Production mission QA blocks write methods, so it cannot prove persistence or session deduction.',
];

const blockedWrites = [
  'POST /api/dashboard/track-pageview is intentionally blocked in production live read-only mode.',
  'POST/PUT/PATCH/DELETE are blocked by the live production guard unless staging write mode is explicitly selected.',
];

function printUsage() {
  process.stdout.write(`Usage: node scripts/qa/mission-report.mjs [options]

Options:
  --out=<path>    Output markdown path. Defaults to docs/qa/reports/SWANSTUDIOS-MISSION-QA-REPORT-latest.md.
  -h, --help      Print this help.
`);
}

function markdownReport() {
  const generatedAt = new Date().toISOString();
  return `# SWANSTUDIOS-MISSION-QA-REPORT

Generated: ${generatedAt}

## Scope

This artifact records the current Mission QA harness for SwanStudios' training-business loop: production-safe read-only checks, contract tests with mission-shaped data, role-auth state capture, and staging-write guardrails.

## Commands

- \`npm run qa:mission\`
- \`npm run qa:mission:prod-readonly\`
- \`npm run qa:mission:prod-live-readonly\`
- \`npm run qa:prod-auth:capture -- --role=admin|trainer|client\`
- \`npm run qa:mission:cleanup\`

## blockedWrites

${blockedWrites.map((item) => `- ${item}`).join('\n')}

## residualRisks

${residualRisks.map((item) => `- ${item}`).join('\n')}

## Next Evidence Needed

- Capture local role auth state under ignored \`.auth/\` and rerun production live read-only.
- Run staging-write Mission QA only against isolated staging infrastructure.
- Attach the generated report to the next phase audit record after Sean approves the final QA scope.
`;
}

if (showHelp) {
  printUsage();
  process.exit(0);
}

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, markdownReport(), 'utf8');
process.stdout.write(`Wrote ${path.relative(repoRoot, outputPath)}\n`);
