#!/usr/bin/env node
/**
 * SCRIPT: Mission QA cleanup guard
 * PURPOSE: Keep QA cleanup targeted to `@swanstudios-qa.local` personas only.
 * SAFETY: Dry-run by default. This helper documents the exact cleanup scope and
 * refuses broad session cleanup or production-looking targets.
 */

const args = process.argv.slice(2);
const showHelp = args.includes('--help') || args.includes('-h');
const confirm = args.find((arg) => arg.startsWith('--confirm='))?.slice('--confirm='.length);
const baseUrl = args.find((arg) => arg.startsWith('--base-url='))?.slice('--base-url='.length) || process.env.BASE_URL || '';
const DRY_RUN = confirm !== 'delete-qa-only';
const QA_EMAIL_SUFFIX = '@swanstudios-qa.local';
const DELETE_CLIENT_SESSIONS = false;

const qaTables = [
  'users',
  'clients',
  'client_trainer_assignments',
  'workout_logs',
  'workout_plans',
  'orders',
  'session_packages',
  'coach_action_proposals',
];

function printUsage() {
  process.stdout.write(`Usage: node scripts/qa/mission-qa-cleanup.mjs [options]

Options:
  --confirm=delete-qa-only    Required before any destructive cleanup can run.
  --base-url=<url>            Optional target label; production-looking URLs are refused.
  -h, --help                  Print this help.

Scope:
  Only records tied to ${QA_EMAIL_SUFFIX} may be cleaned.
  Broad session cleanup is forbidden; DELETE_CLIENT_SESSIONS=${DELETE_CLIENT_SESSIONS}.
  Default mode is DRY_RUN=${DRY_RUN}.
`);
}

function looksProduction(value) {
  return /sswanstudios\.com|onrender\.com/i.test(value || '');
}

function fail(message) {
  process.stderr.write(`Mission QA cleanup blocked: ${message}\n`);
  process.exit(1);
}

if (showHelp) {
  printUsage();
  process.exit(0);
}

if (looksProduction(baseUrl)) {
  fail('cleanup must not target a production-looking URL');
}

const cleanupPlan = {
  dryRun: DRY_RUN,
  qaEmailSuffix: QA_EMAIL_SUFFIX,
  deleteClientSessions: DELETE_CLIENT_SESSIONS,
  tables: qaTables,
  confirmationRequired: 'delete-qa-only',
};

process.stdout.write(JSON.stringify(cleanupPlan, null, 2));
process.stdout.write('\n');

if (DRY_RUN) {
  process.stdout.write('Dry run only. Re-run with --confirm=delete-qa-only after verifying staging DB scope.\n');
}
