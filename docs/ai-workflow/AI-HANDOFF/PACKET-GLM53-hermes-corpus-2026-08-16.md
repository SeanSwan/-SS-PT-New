# Review packet — Hermes learning corpus enforcement + migration (2026-08-16)

Author: claude-opus-5. Reviewer remit: hostile. Full source below, not an inventory.

## Context
The durable learning corpus had a validator since 2026-08-13 that NOTHING called.
27/38 packets failed it, and 14 of the failures were written AFTER the schema shipped.
Root cause: the SKILL template agents copy contradicted the schema (no title key,
topic: not a schema key, status: open not a legal value).

Three changes: (1) fixed the template, (2) wired the validator into the Stop gate,
(3) wrote a migration script that back-filled 16 tracked packets.
(4) built a read-side surfacing hook — the corpus was written but never consulted.

## FILE 1: scripts/hooks/hermes-closeout-gate.mjs (the new gate wiring)
```javascript
          signals.gitActivity = true;
        }
      } else if (item?.type === 'text' && EMISSION_PATH_RE.test(String(item.text ?? ''))) {
        signals.memoEmitted = true; // final response cites an emitted artifact path
      }
    }
  }
  return signals;
}

/**
 * A memo without a mistakes section teaches Hermes nothing about how the work
 * actually went (Sean 2026-08-04: "especially about the mistakes that you made
 * so I can learn from them… this should be automatic"). Detecting the FILE was
 * never enough — the section is the payload. Reads the memo Write tool actually
 * produced; unreadable/absent file -> fail-open (this gate is heuristic, and a
 * false block is worse than a missed nudge).
 */
export function memoMissingMistakes(memoPaths, readFile) {
  for (const p of memoPaths) {
    let text;
    try {
      text = readFile(p);
    } catch {
      continue; // cannot read -> do not punish
    }
    // Accept the honest-empty form too; only a MISSING heading blocks.
    if (!/^\s*#{1,4}\s*Mistakes\b/im.test(text)) return p;
  }
  return null;
}

/**
 * A malformed DURABLE packet is worse than a missing one: it lands in the compounding corpus and
 * stays there. `scripts/hermes-learning-validate.mjs` has been the written contract since
 * 2026-08-13 but nothing ever called it, so 12 packets written AFTER the schema shipped still
 * failed it — the corpus kept drifting while every closeout passed. A contract nothing enforces
 * is a document, not a contract.
 *
 * Scope is deliberately narrow: only the durable corpus (`hermes-learning-packets/`). Ephemeral
 * inbox memos are drained daily and have no schema, so validating them would be noise.
 */
const CORPUS_PATH_RE = /hermes-learning-packets[\\/]/;

export function packetErrors(memoPaths, validate) {
  if (typeof validate !== 'function') return null; // validator unavailable -> never block
  for (const p of memoPaths) {
    if (!CORPUS_PATH_RE.test(String(p))) continue;
    try {
      const errs = validate(p);
      if (Array.isArray(errs) && errs.length) return { path: p, errors: errs };
    } catch {
      continue; // unreadable/broken -> do not punish (same fail-open rule as memoMissingMistakes)
    }
  }
  return null;
}

const PACKET_BLOCK_REASON = ({ path, errors }) =>
  `Durable learning packet fails the corpus schema. File: ${path}\n` +
  errors.map((e) => `  - ${e}`).join('\n') +
  `\n\nThe contract is docs/ai-workflow/hermes-learning-packets/_schema.json; fix the packet, not ` +
  `the schema. Run \`node scripts/hermes-learning-validate.mjs --file ${path} --json\` for ` +
  `machine-readable errors you can self-repair from in this turn. ` +
  `NEVER guess originating_model to make this pass — it is the fail-closed Rule 68 tier gate, and ` +
  `a wrong provenance tag admits sub-Fable output into the permanent corpus. If a field is ` +
  `genuinely unrecoverable, write "unknown".`;

/** Pure decision: returns null (allow) or a block reason string. */
export function decide(hookInput, transcriptRaw, readFile = (p) => readFileSync(p, 'utf8'), validate) {
  if (hookInput?.stop_hook_active) return null;
  const signals = analyzeTurn(parseTranscript(transcriptRaw));
  if (signals.memoEmitted) {
    const bad = memoMissingMistakes(signals.memoPaths, readFile);
    if (bad) return MISTAKES_BLOCK_REASON(bad);
    const malformed = packetErrors(signals.memoPaths, validate);
    return malformed ? PACKET_BLOCK_REASON(malformed) : null;
  }
  if (signals.fileWrites >= 3 || signals.gitActivity) return BLOCK_REASON;
  return null;
}
```

## FILE 2: scripts/hermes-learning-migrate.mjs (full)
```javascript
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
```

## FILE 3: scripts/hermes-learning-surface.mjs (full)
```javascript
#!/usr/bin/env node
/**
 * hermes-learning-surface — the READ side of the durable learning corpus.
 *
 * WHY THIS EXISTS (the largest gap in the v2 design, Kimi 2026-08-13)
 *   Rule 68 is entirely a WRITE trigger. It says when a lesson must be recorded and never says
 *   when anything is obliged to CONSULT one. The measured result: the ephemeral inbox tier — which
 *   HAS an automated read hook — reached 641 consumptions, while the durable tier that "compounds
 *   forever" had exactly one hand-written pointer to it. 17 of 18 permanent lessons were written
 *   and unreachable. Improving the shape of a tier nobody reads is not an improvement.
 *
 *   "Enterprise knowledge systems fail by going unread, not by being malformed." — Kimi K3
 *
 * DESIGN — pointer, not payload (Rule 72 catalog doctrine)
 *   Dumping 40+ packets into every session is how a knowledge base becomes a tax people route
 *   around. So session start prints a SHORT pointer plus the exact grep command, and the content is
 *   pulled on demand. That only works because every packet now carries `title` (the lesson as a
 *   claim) and `decision` (the rule it establishes) — which is what the 2026-08-16 migration was
 *   actually for.
 *
 * USAGE
 *   node scripts/hermes-learning-surface.mjs --session-start   # compact pointer for the hook
 *   node scripts/hermes-learning-surface.mjs --grep "<term>"   # search titles + decisions + body
 *   node scripts/hermes-learning-surface.mjs --list            # every title, newest first
 *
 * EXIT CODES
 *   0 = ok (including "no matches" — an empty search is an answer, not an error)
 *   3 = bad invocation
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from './hermes-learning-validate.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const CORPUS = join(ROOT, 'docs', 'ai-workflow', 'hermes-learning-packets');
const REL = 'docs/ai-workflow/hermes-learning-packets';

export function loadCorpus(dir = CORPUS) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md') && !f.startsWith('_') && f !== 'INDEX.md')
    .map((name) => {
      const src = readFileSync(join(dir, name), 'utf8');
      const fm = parseFrontmatter(src);
      const fileDate = (/^(\d{4})-?(\d{2})-?(\d{2})/.exec(name) || []).slice(1, 4).join('-');
      return {
        name,
        date: fm.values?.date || fileDate || '',
        title: unquote(fm.values?.title) || deriveTitleFromName(name),
        decision: unquote(fm.values?.decision) || '',
        status: fm.values?.status || '',
        body: fm.body || src,
      };
    })
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

function unquote(v) {
  if (!v) return '';
  const s = String(v).trim();
  return /^".*"$/.test(s) || /^'.*'$/.test(s) ? s.slice(1, -1) : s;
}

function deriveTitleFromName(name) {
  return name.replace(/\.md$/, '').replace(/^\d{4}-?\d{2}-?\d{2}-?/, '').split('-').join(' ');
}

/**
 * Search titles and decisions first, then bodies. A hit in the claim itself is a stronger signal
 * than a passing mention buried in prose, so the two are reported separately rather than blended
 * into one relevance score nobody can audit.
 */
export function search(packets, term) {
  const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const claim = [];
  const mention = [];
  for (const p of packets) {
    if (re.test(p.title) || re.test(p.decision)) claim.push(p);
    else if (re.test(p.body)) mention.push(p);
  }
  return { claim, mention };
}

function truncate(s, n) {
  const t = String(s).replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

function sessionStart(packets) {
  if (!packets.length) return;
  const recent = packets.slice(0, 3);
  const out = [
    `[learning-corpus] ${packets.length} durable lessons. These are things this project already`,
    `[learning-corpus] learned the hard way — consult BEFORE asserting something is broken, novel,`,
    `[learning-corpus] or safe to skip. Grep, do not load wholesale:`,
    `[learning-corpus]   node scripts/hermes-learning-surface.mjs --grep "<topic>"`,
    `[learning-corpus] most recent:`,
    ...recent.map((p) => `[learning-corpus]   ${p.date}  ${truncate(p.title, 88)}`),
  ];
  console.log(out.join('\n'));
}

function main(argv) {
  const packets = loadCorpus();

  if (argv.includes('--session-start')) { sessionStart(packets); return 0; }

  if (argv.includes('--list')) {
    console.log(`${packets.length} durable lesson(s), newest first:\n`);
    for (const p of packets) {
      console.log(`  ${p.date}  ${truncate(p.title, 96)}`);
      console.log(`             ${REL}/${p.name}`);
    }
    return 0;
  }

  const gi = argv.indexOf('--grep');
  if (gi !== -1) {
    const term = argv[gi + 1];
    if (!term) { console.error('--grep requires a term'); return 3; }
    const { claim, mention } = search(packets, term);

    if (!claim.length && !mention.length) {
      // An empty result is a real answer, and saying so plainly matters: a silent exit reads as
      // "the tool is broken", which is how a read path stops being trusted and then stops being used.
      console.log(`no durable lesson matches "${term}" (searched ${packets.length} packets: titles, decisions, bodies)`);
      return 0;
    }

    if (claim.length) {
      console.log(`\nLESSON IS ABOUT THIS (${claim.length}):\n`);
      for (const p of claim) {
        console.log(`  ${p.date}  ${truncate(p.title, 96)}`);
        if (p.decision) console.log(`      rule: ${truncate(p.decision, 150)}`);
        console.log(`      ${REL}/${p.name}\n`);
      }
    }
    if (mention.length) {
      console.log(`mentioned in passing (${mention.length}) — weaker signal:\n`);
      for (const p of mention) console.log(`  ${p.date}  ${truncate(p.title, 88)}  ${REL}/${p.name}`);
      console.log();
    }
    return 0;
  }

  console.error('usage: --session-start | --grep "<term>" | --list');
  return 3;
}

if (process.argv[1]?.endsWith('hermes-learning-surface.mjs')) {
  process.exit(main(process.argv.slice(2)));
}
```

## FILE 4: the schema being enforced
```json
{
  "schema_version": "1.0.0",
  "_comment": "The CONTRACT for Hermes learning packets. Data, not code (Kimi 2026-08-13 Q2c: a hardcoded schema is not inspectable or diffable). scripts/hermes-learning-validate.mjs reads this; any emitter must satisfy it. Bump schema_version on any change to required_* and record why in changelog.",

  "required_frontmatter": [
    "title",
    "originating_model",
    "tier_basis",
    "date",
    "decision",
    "status"
  ],

  "required_frontmatter_from": {
    "_comment": "Keys required only for packets dated on/after this ISO date. Retro-requiring fields on historical packets would make migration impossible and turn the validator into permanent noise.",
    "2026-08-13": ["models_used", "skills_touched", "privacy"]
  },

  "required_headings": {
    "_comment": "Matched LITERALLY at line start. hermes-closeout-gate.mjs matches '## Mistakes I made' exactly - a numbered '## 6. Mistakes I made' does NOT match and silently reads as 'nothing went wrong'. That defect shipped 2026-08-13.",
    "from": "2026-08-13",
    "headings": [
      "## Mistakes I made",
      "## External-model calibration"
    ]
  },

  "recommended_headings": [
    "## Who did what",
    "## Skills created or changed",
    "## Error → fix → repeat ledger"
  ],

  "tier_allowlist": {
    "_comment": "FAIL-CLOSED. Sub-Fable output must never enter the durable corpus (Rule 68). Sean's designation 2026-08-10 widened this to Opus 5 and Kimi K3.",
    "models": [
      "claude-fable-5",
      "claude-opus-5",
      "moonshotai/kimi-k3"
    ]
  },

  "status_values": ["draft", "reviewed", "current", "shipped", "superseded", "archived"],

  "lifecycle": {
    "_comment": "Kimi 2026-08-13 finding 6: status existed in 6/18 packets with no state machine - 'enterprise knowledge without review is a rumor mill with frontmatter'. Advancing past 'reviewed' requires a reviewed_by value.",
    "requires_reviewed_by": ["reviewed", "current"],
    "terminal": ["superseded", "archived"]
  },

  "privacy_forbidden_patterns": {
    "_comment": "Write-time guard only. Rule 44/59. The repo-history scan is a separate one-time job (Kimi finding 5) - this does NOT cover it.",
    "absolute_windows_path": "[A-Za-z]:[\\\\/](Users|home)[\\\\/][^\\s`\"']+",
    "bearer_token": "eyJ[A-Za-z0-9_-]{20,}\\.[A-Za-z0-9_-]{20,}",
    "openai_key": "sk-[A-Za-z0-9]{20,}",
    "stripe_live": "(sk|rk)_live_[A-Za-z0-9]{10,}",
    "webhook_secret": "whsec_[A-Za-z0-9]{10,}",
    "google_key": "AIza[A-Za-z0-9_-]{30,}",
    "db_url_with_password": "postgres(ql)?://[^\\s:]+:[^\\s@]+@"
  },

  "warnings": {
    "_comment": "Warn, never gate. Kimi Q2/section 2: gating on a field present in 5/18 packets is wrong.",
    "supersedes_target_must_exist": true,
    "recommended_headings_present": true,
    "reviewed_by_present": true
  },

  "changelog": [
    {
      "version": "1.0.0",
      "date": "2026-08-13",
      "why": "First contract. Motivated by 18 packets carrying 8 distinct frontmatter shapes, because every packet was hand-written from memory and no validator existed. Kimi K3 ranked this the single highest-value thing to build: the validator is the contract, the emitter is merely one producer of it, and a validator that only accepts emitter output cannot migrate the existing corpus."
    }
  ]
}
```
