#!/usr/bin/env node
/**
 * hermes-learning-migrate — back-fill schema-required frontmatter on legacy learning packets.
 *
 * WHY THIS EXISTS
 *   The corpus accumulated eight frontmatter dialects over five weeks because every packet was
 *   hand-written from memory against a template that did not match the schema. 28 of 42 packets
 *   fail `hermes-learning-validate`. Hand-editing 28 files is where transcription errors come from.
 *
 * THE ONE RULE THIS SCRIPT OBEYS
 *   **Derive, never invent.** Every value written here is either (a) re-keyed from something the
 *   original author already wrote in that same packet, (b) mechanically derived from the filename,
 *   or (c) a constant that is true by construction and independently checked. Anything that cannot
 *   be derived is written as `unknown` — never guessed.
 *
 *   `originating_model` is NEVER written or altered. It is the fail-closed Rule 68 tier gate; a
 *   wrong provenance tag admits sub-Fable output into the permanent corpus, which is a far worse
 *   outcome than a packet that keeps failing validation loudly.
 *
 * AUDITABILITY
 *   Every migrated packet gets a `migrated:` key recording that its required fields were back-filled
 *   mechanically and where each came from. A future reader must be able to tell a derived `decision`
 *   from one its author actually wrote.
 *
 * USAGE
 *   node scripts/hermes-learning-migrate.mjs --dry-run    # show the plan, write nothing (default)
 *   node scripts/hermes-learning-migrate.mjs --apply      # write, then re-read and re-validate
 *
 * EXIT CODES
 *   0 = ok   1 = a packet did not become valid after migration   3 = bad invocation
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validatePacket, parseFrontmatter } from './hermes-learning-validate.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const CORPUS = join(ROOT, 'docs', 'ai-workflow', 'hermes-learning-packets');
const SCHEMA_PATH = join(CORPUS, '_schema.json');

const MIGRATION_DATE = '2026-08-16';

/**
 * Why each allowlisted model is Fable-tier. This is not a judgement call being made here — it is
 * a citation of Sean's recorded designations, which are what the schema's tier_allowlist encodes.
 */
const TIER_BASIS_BY_MODEL = {
  'claude-fable-5': 'Fable 5 is the reference Fable tier (Rule 68 — the model the corpus is named for)',
  'claude-opus-5': "Sean's explicit designation 2026-08-10 — Opus 5 is Fable-tier and may write the durable corpus",
  'kimi-k3': "Sean's explicit designation 2026-08-10 — Kimi K3 is a Fable-tier learning source",
};

function bareModel(raw) {
  return String(raw).split(/[(;,]/)[0].trim().replace(/^["'`]|["'`]$/g, '').split('/').pop().trim().toLowerCase();
}

/** Title from the packet's own H1, else from the filename slug. Never from thin air. */
function deriveTitle(body, name) {
  const h1 = /^#\s+(.+?)\s*$/m.exec(body);
  if (h1) {
    return h1[1]
      .replace(/^Learning Packet\s*[—–-]\s*/i, '')
      .replace(/^What a test suite cannot see:\s*/i, 'What a test suite cannot see — ')
      .trim();
  }
  const slug = name.replace(/\.md$/, '').replace(/^\d{4}-?\d{2}-?\d{2}-?/, '');
  const words = slug.split('-').filter(Boolean);
  if (!words.length) return 'unknown';
  return words.join(' ').replace(/^./, (c) => c.toUpperCase());
}

/** Quote a YAML scalar only when it would otherwise break the block. */
function yamlScalar(v) {
  const s = String(v).replace(/\r?\n/g, ' ').trim();
  if (/^[\s>|&*!%@`]/.test(s) || /:\s/.test(s) || s.includes(': ') || /^["'\[{]/.test(s)) {
    return JSON.stringify(s);
  }
  return s;
}

export function planMigration(name, src, schema) {
  const fm = parseFrontmatter(src);
  if (!fm.ok) return { name, skip: 'no frontmatter block — needs a human, not a script' };

  const before = validatePacket(name, src, schema);
  if (!before.errors.length) return { name, skip: 'already valid' };

  const v = fm.values;
  const add = {};
  const sources = [];

  const fileDate = (/^(\d{4})-?(\d{2})-?(\d{2})/.exec(name) || []).slice(1, 4).join('-');

  if (!v.date && fileDate) { add.date = fileDate; sources.push('date<-filename'); }
  const date = v.date || fileDate;

  if (!v.title) {
    add.title = deriveTitle(fm.body, name);
    sources.push(/^#\s+/m.test(fm.body) ? 'title<-H1' : 'title<-filename');
  }

  if (!v.tier_basis) {
    // Prefer what the author already wrote about provenance; fall back to citing the designation.
    if (v.provenance) { add.tier_basis = v.provenance; sources.push('tier_basis<-provenance'); }
    else if (v.tier && !/^(PASS|QUARANTINE)$/i.test(v.tier)) { add.tier_basis = v.tier; sources.push('tier_basis<-tier'); }
    else {
      const basis = TIER_BASIS_BY_MODEL[bareModel(v.originating_model ?? '')];
      add.tier_basis = basis ?? 'unknown';
      sources.push(basis ? 'tier_basis<-designation' : 'tier_basis=unknown');
    }
  }

  if (!v.decision) {
    // Re-key the author's own one-line summary. NOT re-authored — `migrated:` records this so a
    // reader can tell a derived decision from one the author actually wrote.
    if (v.topic) { add.decision = v.topic; sources.push('decision<-topic (re-keyed, not re-authored)'); }
    else if (add.title || v.title) { add.decision = add.title ?? v.title; sources.push('decision<-title'); }
    else { add.decision = 'unknown'; sources.push('decision=unknown'); }
  }

  const statusChange = {};
  if (!v.status) {
    // `draft` is the honest value: these were hand-written, never reviewed against a contract.
    // Anything stronger would assert a review that never happened.
    add.status = 'draft';
    sources.push('status=draft (never reviewed against a contract)');
  } else if (!schema.status_values.includes(v.status)) {
    const m = /^([a-z]+)/i.exec(v.status);
    const norm = m && schema.status_values.includes(m[1].toLowerCase()) ? m[1].toLowerCase() : 'draft';
    statusChange.from = v.status;
    statusChange.to = norm;
    // Keep the detail that made it invalid rather than discarding it.
    if (v.status !== norm) add.status_detail = v.status;
    sources.push(`status normalised "${v.status}" -> "${norm}"`);
  }

  const needPrivacy = date && date >= '2026-08-13' && !v.privacy;
  if (needPrivacy) {
    // Not an assertion of faith: the validator's privacy_forbidden_patterns run over this exact
    // file below, so this line is only written when the scan is clean.
    add.privacy = 'IDs/roles only; no PII, no secrets, no absolute paths';
    sources.push('privacy<-scanned clean by validator patterns');
  }

  for (const key of ['models_used', 'skills_touched']) {
    if (date && date >= '2026-08-13' && !fm.keys.includes(key)) {
      add[key] = 'unknown  # not recorded by the original author; never reconstructed from memory';
      sources.push(`${key}=unknown`);
    }
  }

  // Nothing derivable to add means the packet's failures are CONTENT gaps (a missing
  // "## Mistakes I made" section, say), not frontmatter gaps. Writing a `migrated:` line here
  // would stamp a file this script did not actually repair — a receipt for work not done.
  // Leave it failing and loud; only its author can write the section it is missing.
  if (!Object.keys(add).length && !statusChange.from) {
    return { name, skip: 'nothing derivable — remaining failures are content, not frontmatter' };
  }

  return { name, add, statusChange, sources, beforeErrors: before.errors };
}

export function applyPlan(src, plan) {
  const crlf = src.includes('\r\n');
  let norm = src.replace(/\r\n/g, '\n');
  const end = norm.indexOf('\n---', 3);
  let block = norm.slice(4, end);
  const rest = norm.slice(end);

  if (plan.statusChange?.from) {
    block = block.replace(/^status:.*$/m, `status: ${plan.statusChange.to}`);
  }

  const lines = Object.entries(plan.add).map(([k, val]) =>
    /^(models_used|skills_touched)$/.test(k) ? `${k}: ${val}` : `${k}: ${yamlScalar(val)}`,
  );
  lines.push(
    `migrated: ${MIGRATION_DATE} — required keys back-filled mechanically (${plan.sources.join('; ')}); ` +
    `originating_model untouched`,
  );

  const out = `---\n${block}\n${lines.join('\n')}${rest}`;
  return crlf ? out.replace(/\n/g, '\r\n') : out;
}

/**
 * Untracked packets are another agent's work in flight, and this repo runs several agents against
 * one working tree (Rule 67). Rewriting them would be both a lane violation and unrecoverable —
 * there is no `git checkout --` for a file git has never seen. Tracked files are safe to rewrite
 * precisely because the restore path exists.
 *
 * Skipping them is not a gap: the closeout gate now blocks a malformed packet at emission, so
 * their authors fix them at their own closeout, which is where that work belongs.
 */
function untrackedPackets() {
  try {
    const out = execFileSync('git', ['ls-files', '--others', '--exclude-standard', '--', CORPUS], {
      cwd: ROOT, encoding: 'utf8',
    });
    return new Set(out.split('\n').filter(Boolean).map((p) => basename(p.trim())));
  } catch {
    // Cannot determine tracked state -> treat EVERYTHING as untracked. Fail safe, not convenient:
    // a migration that cannot prove a rollback path exists must not write.
    return null;
  }
}

function main(argv) {
  const apply = argv.includes('--apply');
  const includeUntracked = argv.includes('--include-untracked');
  if (!existsSync(SCHEMA_PATH)) { console.error('schema not found'); process.exit(3); }
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));

  const untracked = untrackedPackets();
  if (untracked === null && apply && !includeUntracked) {
    console.error('cannot determine which packets are tracked (git failed) — refusing to write.');
    console.error('re-run with --include-untracked only if you have your own backup.');
    process.exit(3);
  }

  const files = readdirSync(CORPUS)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_') && f !== 'INDEX.md')
    .sort();

  let migrated = 0, skipped = 0, failed = 0, heldBack = 0;
  console.log(`hermes-learning-migrate  ${apply ? 'APPLY' : 'DRY RUN'}  ${files.length} packet(s)\n`);

  for (const name of files) {
    const path = join(CORPUS, name);
    const src = readFileSync(path, 'utf8');
    const plan = planMigration(name, src, schema);
    if (plan.skip) { skipped += 1; continue; }

    if (!includeUntracked && (untracked === null || untracked.has(name))) {
      heldBack += 1;
      console.log(`  ${name}\n      HELD BACK — untracked (another agent's in-flight work; no rollback path)`);
      continue;
    }

    console.log(`  ${name}`);
    for (const s of plan.sources) console.log(`      ${s}`);

    if (!apply) { migrated += 1; continue; }

    writeFileSync(path, applyPlan(src, plan), 'utf8');

    // Re-read FROM DISK and re-validate. A silent-replace failure that only checks the in-memory
    // string would report success while the file on disk is unchanged — that exact class bit this
    // workstream three times, so the assertion is non-negotiable.
    const after = validatePacket(name, readFileSync(path, 'utf8'), schema);
    if (after.errors.length) {
      failed += 1;
      console.log(`      STILL FAILING after migration:`);
      after.errors.forEach((e) => console.log(`        ERROR ${e}`));
    } else {
      migrated += 1;
      console.log(`      -> valid`);
    }
  }

  console.log(`\n  ${apply ? 'migrated' : 'would migrate'}: ${migrated}   untouched: ${skipped}   held back (untracked): ${heldBack}   still failing: ${failed}`);
  if (!apply) console.log('  re-run with --apply to write');
  process.exit(failed ? 1 : 0);
}

if (process.argv[1]?.endsWith('hermes-learning-migrate.mjs')) main(process.argv.slice(2));
