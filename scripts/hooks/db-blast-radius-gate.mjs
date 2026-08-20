#!/usr/bin/env node
/**
 * db-blast-radius-gate.mjs — deterministic PreToolUse hook. The last thing
 * standing between an AI agent and irreversible damage to production data.
 *
 * WHY (Sean, 2026-08-11): an external model authored migration SQL wiring three
 * FKs to tables that do not exist under those names — including `users` when
 * production's canonical table is "Users". A builder running it verbatim would
 * have bound FKs to the stale duplicate table: no error, silent corruption,
 * mystery 500s. Caught by review, not by any guard. There was no guard.
 *
 * CONTRACT (Claude Code PreToolUse hook, type "command"):
 *   stdin  = { tool_name, tool_input, ... }
 *   allow  = exit 0, no stdout
 *   block  = exit 0 + stdout {"hookSpecificOutput":{"hookEventName":"PreToolUse",
 *            "permissionDecision":"deny","permissionDecisionReason":"..."}}
 *
 * FAIL POSTURE
 *   - Unreadable stdin / missing snapshot / internal throw -> ALLOW (fail-open).
 *     A broken gate must never wedge the agent. It logs to stderr instead.
 *   - Recognised harm in a gated path -> DENY (fail-closed on the finding).
 *   This asymmetry is deliberate: the gate is a safety net, not a dependency.
 *
 * SCOPE DISCIPLINE (from a Kimi K3 hostile review, 2026-08-11)
 *   - Edits scan ONLY the added text. 218 of 309 existing migrations contain
 *     dropTable/removeColumn; scanning whole historical files on edit would
 *     produce a false-positive storm and the gate would be disabled within days.
 *   - Markdown docs WARN, never block. Planning docs legitimately contain
 *     sketch SQL; blocking a doc write is the fastest way to get a guard killed.
 *   - The `node -e` advisory is filtered by DB_SMELL. Firing a production
 *     warning on every benign one-liner is noise, and noise gets guards ignored.
 *
 * CLASS S IS APPROVAL-GATED, NOT ABSOLUTE (Sean, 2026-08-11)
 *   The first cut refused all agent edits to guard files outright. That made the
 *   guard unrepairable by the agent that found its defects — it blocked its own
 *   author mid-build, and every fix became hand-work for Sean. Sean's ruling:
 *   the agent SHOULD be able to repair it, behind a permission gate with a
 *   plain-English summary and a recommendation.
 *
 *   Flow: agent writes a change request -> attempts the edit -> denied, with the
 *   request's plain-English summary and an approval id -> Sean runs ONE command
 *   -> agent retries the IDENTICAL edit -> allowed, approval consumed.
 *
 *   Approvals bind to a content hash, are single-use, and expire. One character
 *   of drift voids them, so approve-X-run-Y and replay both fail.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { analyzeContent, extractWriteTargets, CLASS } from '../lib/blast-radius-analyze.mjs';

const ROOT = process.cwd();
const SNAPSHOT_PATH = join(ROOT, 'backend', 'schema-snapshot.json');
const APPROVAL_DIR = join(ROOT, '.ai-workflow', 'blast-radius', 'approved');
const REQUEST_DIR = join(ROOT, '.ai-workflow', 'blast-radius', 'requests');

/** Paths whose content is DB-bearing and therefore analysed. */
const GATED_CONTENT = /(?:^|[\\/])(?:backend[\\/]migrations|backend[\\/]seeders|seeders)[\\/]|\.sql$/i;

/** Markdown docs get advisory warnings only. */
const DOC_PATH = /\.mdx?$/i;

/**
 * Class S — the gate's own machinery. An agent that can silently edit these can
 * disable every other protection, so they require an approval (see header).
 *
 * NOTE the asymmetry inside .ai-workflow/blast-radius/:
 *   approved/  is protected — only Sean's script may write an approval
 *   requests/  is NOT protected — the agent must be able to file a change request
 */
const SELF_PROTECTED = [
  /scripts[\\/]hooks[\\/]db-blast-radius-gate\.mjs$/i,
  /scripts[\\/]lib[\\/]blast-radius-analyze\.mjs$/i,
  /scripts[\\/]blast-radius-approve\.mjs$/i,
  /scripts[\\/]schema-snapshot\.mjs$/i,
  /backend[\\/]schema-snapshot\.json$/i,
  // The approval directory ITSELF, not only paths inside it. The original pattern
  // required a separator AFTER `approved`, so `cp -r /tmp/preminted <dir>` targeted
  // the bare directory and escaped. Two tests have been red on this since 2026-08-11.
  /\.ai-workflow[\\/]blast-radius[\\/]approved(?:[\\/]|$)/i,
  // THIS FILE REGISTERS THIS HOOK. Writing it removes the guard without touching a
  // single guard file — the most severe hole found in the 2026-08-19 probe, and the
  // one neither hostile reviewer named. It was not protected at all.
  /\.claude[\\/]settings(?:\.local)?\.json$/i,
  // Signing-key location (future work). Protected NOW so the file cannot be
  // pre-planted or substituted before the mechanism that reads it exists.
  // Key SUBSTITUTION beats key extraction: overwriting needs no secret and is
  // silent, because the key is gitignored so no diff betrays it.
  /(?:^|[\\/])\.blast-radius-key$/i,
  // Real git hooks execute when SEAN runs git — under his intent, outside the
  // agent's tool stream entirely. NOTE: this is .git/hooks/ (runtime), NOT the
  // repo-tracked .githooks/ that settings.json deliberately allows writing.
  /\.git[\\/]hooks[\\/]/i,
];

/** Commands that reach a database or run migrations. */
const DB_RUNNER = [
  { re: /\bsequelize-cli\b[^|;&]*\bdb:(?:migrate|seed|drop)\b/i, what: 'sequelize-cli migration/seed runner' },
  { re: /\bknex\b[^|;&]*\bmigrate\b/i, what: 'knex migration runner' },
  { re: /\bpsql\b/i, what: 'psql' },
  { re: /\bnode\s+(?:-e|--eval)\b/i, what: 'node -e (arbitrary code with app DB credentials)' },
];

/**
 * `node -e` is common and mostly harmless. Emitting a production warning on
 * every one of them is noise, and noise is what gets a guard ignored — the
 * failure mode that kills guards faster than any evasion. The advisory is
 * therefore filtered to commands that actually smell like database access.
 * Destructive CONTENT is still analysed and blocked regardless of this filter.
 */
const DB_SMELL = /(?:sequelize|knex|\bpg\b|postgres|DATABASE_URL|queryInterface|\.query\(|REFERENCES|TRUNCATE|DROP\s+TABLE)/i;

/**
 * In-place editors and copies write files without any redirection token, so
 * extractWriteTargets cannot see them. `sed -i` and `cp` are both allow-listed
 * in settings.json, which made this the cheapest possible route around class S:
 *   sed -i '2i process.exit(0);' scripts/hooks/db-blast-radius-gate.mjs
 * Found by hostile review of this very file, 2026-08-11.
 */
const IN_PLACE_WRITER = /\b(?:sed\s+(?:-[a-zA-Z]*i|--in-place)|perl\s+-[a-zA-Z]*i|cp|mv|install|rsync)\b([^|;&]*)/g;

const readStdin = () => {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
};

function loadSnapshot() {
  if (!existsSync(SNAPSHOT_PATH)) return null;
  try {
    const snap = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8'));
    // Stamp the repo this snapshot actually describes. Class B (referential
    // drift) is schema-RELATIVE: a table absent from SwanStudios' snapshot says
    // nothing about a migration belonging to a different application. Without
    // this stamp the gate judged every repo against this one — see analyzeContent.
    return { ...snap, _repoRoot: ROOT };
  } catch {
    return null;
  }
}

const hashOf = (text) => createHash('sha256').update(text).digest('hex').slice(0, 16);

/** An approval is valid only for this exact content, once, before it expires. */
function hasValidApproval(contentHash) {
  const file = join(APPROVAL_DIR, `${contentHash}.json`);
  if (!existsSync(file)) return false;
  try {
    const approval = JSON.parse(readFileSync(file, 'utf8'));
    if (approval.consumed) return false;
    if (approval.expiresAt && Date.parse(approval.expiresAt) < Date.now()) return false;
    return approval.contentHash === contentHash;
  } catch {
    return false;
  }
}

/**
 * Burn the approval. Without this, "single-use" was a comment rather than a
 * property — hasValidApproval checked `consumed` but nothing ever set it.
 */
function consumeApproval(contentHash) {
  const file = join(APPROVAL_DIR, `${contentHash}.json`);
  try {
    const approval = JSON.parse(readFileSync(file, 'utf8'));
    approval.consumed = true;
    approval.consumedAt = new Date().toISOString();
    writeFileSync(file, `${JSON.stringify(approval, null, 2)}\n`, 'utf8');
  } catch {
    /* best effort — an unburnable approval must not wedge the edit */
  }
}

/** The agent's plain-English rationale for a guard change, if it filed one. */
function readChangeRequest(contentHash) {
  const file = join(REQUEST_DIR, `${contentHash}.md`);
  if (!existsSync(file)) return null;
  try {
    return readFileSync(file, 'utf8').trim();
  } catch {
    return null;
  }
}

function deny(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
    }),
  );
  process.exit(0);
}

/** Class-S denial: teach the approval workflow rather than just refusing. */
function renderSelfMod(filePath, contentHash) {
  const request = readChangeRequest(contentHash);
  const lines = [
    `BLAST-RADIUS GATE — approval required: class ${CLASS.S}`,
    '',
    `\`${filePath}\` is part of the blast-radius guard. Changes to it are allowed,`,
    'but only with Sean\'s explicit per-change approval — an agent that can',
    'silently edit the guard can disable every other protection.',
    '',
  ];

  if (request) {
    lines.push('── change request on file ──────────────────────────────', '', request, '');
  } else {
    lines.push(
      'NO CHANGE REQUEST ON FILE. Before asking for approval you must write one:',
      `  ${join('.ai-workflow', 'blast-radius', 'requests', `${contentHash}.md`)}`,
      '',
      'It must be readable by a non-programmer and contain:',
      '  - WHAT is wrong, in plain English',
      '  - WHY it matters (what could go wrong if unfixed)',
      '  - OPTION A: your recommendation, and what it costs',
      '  - OPTION B: the alternative, and what it costs',
      '  - what you will verify after the change',
      '',
    );
  }

  lines.push(
    'SEAN — to approve this exact change, run in your own terminal:',
    `  node scripts/blast-radius-approve.mjs ${contentHash} --reason "<why you agreed>"`,
    '',
    'The approval covers this file with this exact content, once, for 15 minutes.',
    'Changing one character voids it. Nothing the agent can run mints an approval.',
  );
  return lines.join('\n');
}

function renderFindings(findings, label, contentHash, snapshot) {
  const lines = [
    `BLAST-RADIUS GATE — blocked: ${label}`,
    '',
    'This gate exists because AI-authored SQL once wired three foreign keys to',
    'tables that do not exist under those names. It was caught by review, not by',
    'a guard. Verb blocklists do not catch that class — it is destructive by',
    'REFERENCE, not by verb.',
    '',
  ];
  for (const f of findings) {
    lines.push(`  [line ${f.line}] class ${f.cls}`);
    lines.push(`      ${f.detail}`);
    if (f.evidence) lines.push(`      evidence: ${f.evidence}`);
    if (f.fix) lines.push(`      fix: ${f.fix}`);
    lines.push('');
  }
  if (snapshot) {
    lines.push(
      `Schema truth: ${snapshot.tableCount} tables, source="${snapshot.source}" ` +
        '(parsed from backend/models/*.mjs — NOT the live DB; models can themselves drift, CLAUDE.md Rule 58).',
      '',
    );
  }
  lines.push(
    'TO PROCEED, put these in your next message to Sean:',
    '  1. the real target table, quoted from backend/schema-snapshot.json',
    '  2. the real primary-key type',
    '  3. a down() proven reversible (or an explicit statement that it cannot be)',
    '  4. what runs this, and against which database',
    '',
    'Do NOT retry a reworded variant. Do NOT edit the gate, the snapshot, or the',
    'settings to get past this. Sean approves out-of-band; you cannot self-approve.',
    `Approval id (Sean runs this in his own terminal): ${contentHash}`,
  );
  return lines.join('\n');
}

/** Shared handler for "this action writes to a guard file". */
function guardWriteAttempt(targetPath, contentHash, how) {
  if (hasValidApproval(contentHash)) {
    consumeApproval(contentHash);
    return true; // approved — let it through
  }
  deny(
    how
      ? `BLAST-RADIUS GATE — approval required: class ${CLASS.S}\n\n` +
          `This command ${how} \`${targetPath}\`, which is part of the guard.\n` +
          'Writing to guard files through the shell is the same action as editing\n' +
          'them, and needs the same per-change approval from Sean.\n\n' +
          'Prefer a normal Edit so the change is reviewable as a diff.'
      : renderSelfMod(targetPath, contentHash),
  );
  return false;
}

function main() {
  const raw = readStdin();
  if (!raw.trim()) return 0; // fail-open

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return 0; // fail-open
  }

  const toolName = payload.tool_name || '';
  const input = payload.tool_input || {};
  const snapshot = loadSnapshot();

  // ---- Write / Edit / NotebookEdit ---------------------------------------
  if (toolName === 'Write' || toolName === 'Edit' || toolName === 'NotebookEdit') {
    const filePath = input.file_path || input.notebook_path || '';

    // NotebookEdit supplies `new_source`, not `content`. Reading only `content`
    // meant NotebookEdit was matched but never actually inspected.
    const text =
      toolName === 'Edit'
        ? String(input.new_string || '')
        : String(input.content ?? input.new_source ?? '');

    for (const re of SELF_PROTECTED) {
      if (re.test(filePath)) {
        if (guardWriteAttempt(filePath, hashOf(`${filePath}\n${text}`), null)) return 0;
      }
    }

    if (!text.trim()) return 0;

    if (DOC_PATH.test(filePath)) {
      const findings = analyzeContent(text, filePath, snapshot);
      if (findings.length) {
        process.stderr.write(
          `[blast-radius] ADVISORY on ${filePath} — ${findings.length} finding(s); docs are never blocked.\n` +
            findings.map((f) => `  line ${f.line}: ${f.detail}`).join('\n') +
            '\nIf a builder may run this SQL verbatim, correct it before the doc ships.\n',
        );
      }
      return 0; // warn-only, always
    }

    if (!GATED_CONTENT.test(filePath)) return 0;

    const findings = analyzeContent(text, filePath, snapshot);
    if (!findings.length) return 0;

    const contentHash = hashOf(`${filePath}\n${text}`);
    if (hasValidApproval(contentHash)) {
      consumeApproval(contentHash);
      return 0;
    }
    deny(renderFindings(findings, filePath, contentHash, snapshot));
  }

  // ---- Bash ---------------------------------------------------------------
  if (toolName === 'Bash') {
    const command = String(input.command || '');
    const redirectTargets = extractWriteTargets(command);

    // Shell redirection into a guard file.
    for (const target of redirectTargets) {
      for (const re of SELF_PROTECTED) {
        if (re.test(target)) guardWriteAttempt(target, hashOf(command), 'redirects output into');
      }
    }

    // In-place editors / copies over a guard file (no redirection token).
    let ip;
    IN_PLACE_WRITER.lastIndex = 0;
    while ((ip = IN_PLACE_WRITER.exec(command)) !== null) {
      const operands = ip[1] || '';
      for (const re of SELF_PROTECTED) {
        if (re.test(operands)) guardWriteAttempt(operands.trim(), hashOf(command), 'edits or overwrites');
      }
    }

    // Content arriving via heredoc/redirect into a gated path never passes
    // through Write/Edit, so analyse the command body against that target.
    for (const target of redirectTargets) {
      if (!GATED_CONTENT.test(target)) continue;
      const findings = analyzeContent(command, target, snapshot);
      if (findings.length) {
        const contentHash = hashOf(command);
        if (hasValidApproval(contentHash)) {
          consumeApproval(contentHash);
          return 0;
        }
        deny(renderFindings(findings, `${target} (written via shell redirection)`, contentHash, snapshot));
      }
    }

    // Direct DB-reaching commands carrying destructive content.
    for (const { re, what } of DB_RUNNER) {
      if (!re.test(command)) continue;
      const findings = analyzeContent(command, '', snapshot);
      if (findings.length) {
        const contentHash = hashOf(command);
        if (hasValidApproval(contentHash)) {
          consumeApproval(contentHash);
          return 0;
        }
        deny(renderFindings(findings, `${what} carrying destructive content`, contentHash, snapshot));
      }
      // Runner with no destructive literal: advise, do not block. The pending
      // migration set is what actually runs, and this hook cannot read
      // sequelize_meta. Blocking every db:migrate would be the FP storm.
      if (DB_SMELL.test(command)) {
        process.stderr.write(
          `[blast-radius] ADVISORY: \`${what}\` reaches a database.\n` +
            '  DATABASE_URL points at PRODUCTION from local dev (CLAUDE.md:49).\n' +
            '  Confirm the pending migration set and the target DB before running.\n',
        );
      }
    }
  }

  return 0;
}

try {
  process.exit(main());
} catch (error) {
  // Fail-open: a crashing gate must never block legitimate work.
  process.stderr.write(`[blast-radius] gate error (allowing): ${error?.message || error}\n`);
  process.exit(0);
}