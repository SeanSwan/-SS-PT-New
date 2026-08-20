#!/usr/bin/env node
/**
 * blast-radius-approve.mjs — mints a single-use approval that unblocks one
 * exact blocked action.
 *
 * THIS SCRIPT IS FOR SEAN, NOT FOR THE AGENT.
 * It is deny-listed in .claude/settings.json ("Bash(node scripts/blast-radius-approve*)")
 * so Claude Code cannot RUN it. Sean runs it from his own terminal, outside the
 * agent's reach. That is the whole security model — an approval the agent can
 * mint is not an approval. (The agent may PROPOSE edits to this file, but only
 * through the same class-S approval gate as every other guard file.)
 *
 * WHY NOT AN ENV VAR: an escape hatch printed in a denial message ("set
 * SWAN_BLAST_RADIUS_ACK=...") is a self-serve kiosk. A sloppy agent sets it
 * reflexively because the message pattern-matches to "do this to proceed".
 *
 * WHY NOT A /dev/tty PROMPT: that is POSIX-only. Sean is on Windows.
 * Denying the script to the agent achieves the same separation portably.
 *
 * Properties (Sean chose "one exact change per approval", 2026-08-11):
 *   - binds to the exact content hash the gate computed (no approve-X-run-Y)
 *   - single use — the gate burns it on the way through
 *   - expires (default 15 minutes)
 *
 * Usage:
 *   node scripts/blast-radius-approve.mjs --review          # read pending requests
 *   node scripts/blast-radius-approve.mjs <id> --reason "..." [--minutes 15]
 *   node scripts/blast-radius-approve.mjs --list            # approval ledger
 */
import { writeFileSync, readFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const BASE = join(ROOT, '.ai-workflow', 'blast-radius');
const APPROVAL_DIR = join(BASE, 'approved');
const REQUEST_DIR = join(BASE, 'requests');

function usage() {
  process.stdout.write(
    'blast-radius-approve — approve one blocked action.\n\n' +
      '  node scripts/blast-radius-approve.mjs --review\n' +
      '      Read every pending change request in plain English.\n\n' +
      '  node scripts/blast-radius-approve.mjs <id> --reason "..." [--minutes 15]\n' +
      '      Approve that exact change. Single use. Expires.\n\n' +
      '  node scripts/blast-radius-approve.mjs --list\n' +
      '      Show the approval ledger (valid / consumed / expired).\n\n' +
      'The id is printed by the gate in its denial message.\n',
  );
}

function review() {
  if (!existsSync(REQUEST_DIR)) {
    process.stdout.write('no pending change requests\n');
    return 0;
  }
  const files = readdirSync(REQUEST_DIR).filter((f) => f.endsWith('.md'));
  if (!files.length) {
    process.stdout.write('no pending change requests\n');
    return 0;
  }
  for (const f of files) {
    const id = f.replace(/\.md$/, '');
    const approvalFile = join(APPROVAL_DIR, `${id}.json`);
    let state = 'AWAITING YOUR DECISION';
    if (existsSync(approvalFile)) {
      try {
        const a = JSON.parse(readFileSync(approvalFile, 'utf8'));
        const expired = a.expiresAt && Date.parse(a.expiresAt) < Date.now();
        state = a.consumed ? 'already applied' : expired ? 'approval expired' : 'approved, not yet applied';
      } catch {
        state = 'approval file unreadable';
      }
    }
    process.stdout.write(
      `${'='.repeat(72)}\n` +
        `REQUEST ${id}   [${state}]\n` +
        `${'='.repeat(72)}\n` +
        `${readFileSync(join(REQUEST_DIR, f), 'utf8').trim()}\n\n` +
        `To approve:  node scripts/blast-radius-approve.mjs ${id} --reason "..."\n\n`,
    );
  }
  return 0;
}

function list() {
  if (!existsSync(APPROVAL_DIR)) {
    process.stdout.write('no approvals on file\n');
    return 0;
  }
  const files = readdirSync(APPROVAL_DIR).filter((f) => f.endsWith('.json'));
  if (!files.length) {
    process.stdout.write('no approvals on file\n');
    return 0;
  }
  for (const f of files) {
    try {
      const a = JSON.parse(readFileSync(join(APPROVAL_DIR, f), 'utf8'));
      const expired = a.expiresAt && Date.parse(a.expiresAt) < Date.now();
      const state = a.consumed ? 'CONSUMED' : expired ? 'EXPIRED' : 'VALID';
      process.stdout.write(`${a.contentHash}  ${state.padEnd(9)}  ${a.reason || ''}\n`);
    } catch {
      process.stdout.write(`${f}  (unreadable)\n`);
    }
  }
  return 0;
}

function main() {
  const argv = process.argv.slice(2);
  if (!argv.length || argv.includes('--help') || argv.includes('-h')) {
    usage();
    return 0;
  }

  if (!existsSync(APPROVAL_DIR)) mkdirSync(APPROVAL_DIR, { recursive: true });

  if (argv.includes('--review')) return review();
  if (argv.includes('--list')) return list();

  const id = argv[0];
  if (!/^[a-f0-9]{16}$/.test(id)) {
    process.stderr.write(`error: "${id}" is not a valid approval id (16 hex chars from the gate's message)\n`);
    return 1;
  }

  const reasonIdx = argv.indexOf('--reason');
  const minutesIdx = argv.indexOf('--minutes');
  const reason = reasonIdx !== -1 ? argv[reasonIdx + 1] || '' : '';
  const minutes = minutesIdx !== -1 ? Number(argv[minutesIdx + 1]) : 15;

  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 120) {
    process.stderr.write('error: --minutes must be between 1 and 120\n');
    return 1;
  }
  if (!reason.trim()) {
    process.stderr.write(
      'error: --reason is required. State what you agreed to and why.\n' +
        'An approval without a reason is a rubber stamp, and the ledger is the\n' +
        'only record of why the guard was opened.\n',
    );
    return 1;
  }

  // Surface the request being approved, so approval is never blind.
  const requestFile = join(REQUEST_DIR, `${id}.md`);
  if (existsSync(requestFile)) {
    process.stdout.write(
      `${'-'.repeat(72)}\napproving this request:\n${'-'.repeat(72)}\n` +
        `${readFileSync(requestFile, 'utf8').trim()}\n${'-'.repeat(72)}\n\n`,
    );
  } else {
    process.stdout.write(
      `note: no change request on file for ${id}.\n` +
        '      The agent should have written one. Approving anyway is your call.\n\n',
    );
  }

  const expiresAt = new Date(Date.now() + minutes * 60_000).toISOString();
  writeFileSync(
    join(APPROVAL_DIR, `${id}.json`),
    `${JSON.stringify(
      { contentHash: id, reason, expiresAt, consumed: false, mintedAt: new Date().toISOString() },
      null,
      2,
    )}\n`,
    'utf8',
  );

  process.stdout.write(
    `approved ${id}\n  reason: ${reason}\n  expires: ${expiresAt} (${minutes}m)\n` +
      '  single use — the gate burns it on the next matching action.\n',
  );
  return 0;
}

process.exit(main());
