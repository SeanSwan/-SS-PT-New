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

/**
 * Quote a YAML scalar whenever a real parser would read it as anything but this exact string.
 *
 * The first version omitted `#`, a leading `-`, a leading `?`, and bare true/false/null/date
 * literals. `#` is the dangerous one: a comment-aware parser AMPUTATES the value at the `#` while
 * this repo's deliberately naive parser keeps it whole — so the two disagree permanently and the
 * migration still prints "-> valid" over a corrupted packet.
 *
 * Found by GLM-5.3 2026-08-16 (C1), and reproduced by me within the hour: my own learning packet
 * failed a real YAML parser because a value contained an unquoted `status: open`.
 */
function yamlScalar(v) {
  const s = String(v).replace(/\r?\n/g, ' ').trim();
  if (!s) return '""';
  const hazard =
    /^[\s>|&*!%@`#-]/.test(s) ||                       // block/anchor/tag/comment/seq indicators
    /^\?\s/.test(s) ||                                 // complex mapping key indicator
    /\s#/.test(s) ||                                   // inline comment start ANYWHERE
    /:\s/.test(s) || s.includes(': ') ||               // mapping-entry lookalike
    /^["'\[{]/.test(s) ||                              // quote / flow-collection start
    /^(true|false|null|yes|no|on|off|~)$/i.test(s) ||  // implicit typing
    /^-?\d[\d.:_-]*$/.test(s);                         // number / date / time lookalike
  return hazard ? JSON.stringify(s) : s;
}

/**
 * applyPlan slices the frontmatter with substring arithmetic on the FIRST `\n---`, which is a
 * second parser that can disagree with parseFrontmatter. A YAML block scalar (`key: |`) or a
 * quoted multi-line value can contain a `---` line, and the slice then lands INSIDE it — injecting
 * keys into a scalar body and leaving the real closer mid-document. Rather than build a third
 * parser, refuse to touch packets whose frontmatter uses multi-line constructs.
 * Found by GLM-5.3 2026-08-16 (C2).
 */
function hasMultilineFrontmatter(src) {
  const norm = src.replace(/\r\n/g, '\n');
  const end = norm.indexOf('\n---', 3);
  if (end === -1) return true; // unterminated -> the arithmetic is untrustworthy by definition
  const block = norm.slice(4, end);
  return /^[A-Za-z_][A-Za-z0-9_]*:\s*[|>]/m.test(block) || /\n---/.test(block);
}

export function planMigration(name, src, schema) {
  const fm = parseFrontmatter(src);
  if (!fm.ok) return { name, skip: 'no frontmatter block — needs a human, not a script' };
  if (hasMultilineFrontmatter(src)) {
    return { name, skip: 'frontmatter uses a block scalar or embedded --- ; slice arithmetic is unsafe here' };
  }

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
    // `decision` is THE RULE THE PACKET ESTABLISHES. `topic` in the dead dialects is a SUBJECT
    // ("CRLF handling in memos"). Copying one into the other is true at the string level and false
    // at the meaning level, and the read path then prints it as a top-tier `rule:` — manufacturing
    // authority for a noun phrase nobody ever asserted. That is precisely what this script's ONE
    // RULE forbids, so the honest value is `unknown`. The author's words are not lost: the original
    // `topic:` key is left untouched in the frontmatter.
    //
    // Found by GLM-5.3 2026-08-16 (H2). The first version did this while its own receipt claimed
    // "re-keyed, not re-authored" — a receipt that was true of the string and false of the meaning.
    add.decision = 'unknown';
    sources.push(v.topic
      ? 'decision=unknown (topic left in place — a subject is not a rule)'
      : 'decision=unknown');
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
    // The scan behind this line is 8 KEY-SHAPE regexes (tokens, API keys, DB URLs, Windows user
    // paths). It cannot see an email, a name, a phone number, an IP, or an internal hostname — so
    // "no PII" here would be a positive compliance claim backed by a detector incapable of
    // supporting it, stamped permanently into the corpus. State only what was actually checked.
    // Found by GLM-5.3 2026-08-16 (H3) — the clearest derive-vs-invent violation in the file, and
    // my own comment had called it "not an assertion of faith", which is what it was.
    add.privacy = 'secret-scan clean (key/token/DB-URL shapes only); PII NOT independently verified';
    sources.push('privacy<-key-shape scan only (PII unverified)');
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
      // Say which of the two it is. Reporting "untracked" when git failed states a fact about the
      // repository that was never established — in dry-run that is the tool lying to the operator
      // about tracked state. Found by GLM-5.3 2026-08-16 (H4b).
      const why = untracked === null
        ? 'tracked state UNKNOWN (git query failed) — refusing to write without a proven rollback path'
        : "untracked (another agent's in-flight work; no `git checkout --` rollback path)";
      console.log(`  ${name}\n      HELD BACK — ${why}`);
      continue;
    }

    console.log(`  ${name}`);
    for (const s of plan.sources) console.log(`      ${s}`);

    if (!apply) { migrated += 1; continue; }

    // VALIDATE THE PRODUCED STRING BEFORE IT TOUCHES DISK.
    //
    // The first version wrote first and validated after, which made every escaping or slicing bug
    // a *committed corpus mutation* that the run then merely reported. Exit 1 is a hope, not a
    // mechanism — nothing in this repo asserts on it. validatePacket already takes a string, so
    // checking before the write costs nothing and converts corruption into refusal.
    // Found by GLM-5.3 2026-08-16 (C3): "the amplifier that turns escape-hole bugs into corpus damage."
    const candidate = applyPlan(src, plan);
    const pre = validatePacket(name, candidate, schema);
    if (pre.errors.length) {
      failed += 1;
      console.log(`      REFUSED — migration would not produce a valid packet, nothing written:`);
      pre.errors.forEach((e) => console.log(`        ERROR ${e}`));
      continue;
    }

    writeFileSync(path, candidate, 'utf8');

    // Re-read FROM DISK anyway. The pre-check proves the STRING is good; this proves the string
    // actually reached the file. A silent-replace failure would otherwise report success over an
    // unchanged file — that class bit this workstream three times.
    const after = validatePacket(name, readFileSync(path, 'utf8'), schema);
    if (after.errors.length) {
      failed += 1;
      console.log(`      WROTE BUT DISK COPY IS INVALID (write did not land as produced):`);
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
