/**
 * coordination-docs.test.mjs — S3 acceptance (six named cases)
 * ============================================================
 * Blueprint: docs/ai-workflow/AI-HANDOFF/BLUEPRINT-coordination-discovery-2026-09-20
 * Slice: S3 — documentation and harness coverage. Acceptance command:
 *   node --test scripts/coordination-docs.test.mjs
 *
 * ---------------------------------------------------------------------------
 * STATUS 2026-09-21: NOT SHIPPABLE. FOUR OF SIX CASES ARE BLOCKED.
 * This file is the S3 artifact and it is committed-READY, but it cannot pass
 * against any commit this lane can produce, so it is deliberately left
 * UNCOMMITTED. MEASURED: 2 pass, 4 fail. Every failure is caused by a harness
 * instruction surface that exists only as a PEER'S UNCOMMITTED WORK:
 *
 *   case 1  at HEAD five of the seven surfaces do not exist at all
 *           (CODEBUDDY.md, GEMINI.md, .opencode/SEAT.md,
 *            .github/copilot-instructions.md, .cursor/rules/*.mdc); in the
 *           working tree they exist but Cursor's `alwaysApply` rule does not
 *           carry the coordination procedure
 *   case 2  CLAUDE.md / AGENTS.md do not require complete discovery at HEAD,
 *           and both are peer-dirty (MM), so they cannot be fixed here
 *   case 3  .ai-workflow/coordination/README.md still says
 *           "Read `claude.lane.md` AND `codex.lane.md`" — a fixed seat list —
 *           and it is peer-dirty (the `opencode.lane.md` row)
 *   case 4  the same README still says the claim "may be abandoned", which
 *           reads as a licence to take the files
 *
 *   cases 5 and 6 PASS, and both are satisfied by the S3 protocol edit in
 *   docs/ai-workflow/references/AI-PAIR-CODING-PROTOCOL.md.
 *
 * Do NOT weaken a case to make this file green. The blueprint's own rule:
 * "If required canonical source or generator behavior is unavailable, retain
 * the documentation slice as pending." It is pending. Land the
 * instruction-surface change first, then run this unchanged.
 *
 * TWO DETECTORS IN THIS FILE WERE INITIALLY WRONG, and both failed on the
 * REMEDY rather than the defect: the fixed-list check flagged the protocol's own
 * illustration of the per-session naming scheme, and the automatic-coverage
 * check flagged the sentence forbidding automatic-coverage claims. A detector
 * that fires on the prohibition is a false-positive generator, so both now skip
 * lines that state the rule or illustrate the scheme.
 * ---------------------------------------------------------------------------
 *
 * WHY THE CHECKS LOOK LIKE THIS
 *   "Tests must inspect the operational sections rather than reject every
 *   occurrence of `claude.lane.md`." Historical incident quotations legitimately
 *   keep obsolete commands, so a bare substring search would fail on the very
 *   text that documents why the rule exists. Every check below therefore works
 *   on operational lines only, and skips lines that are explicitly labelled
 *   historical — blockquote narration, a dated amendment, or an incident note.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const PROTOCOL = 'docs/ai-workflow/references/AI-PAIR-CODING-PROTOCOL.md';
const LEDGER_README = '.ai-workflow/coordination/README.md';

/** The seven harness instruction surfaces, per the harness evidence matrix.
 *
 *  Cursor carries TWO always-applied rules, and they are not interchangeable:
 *  `00-makeer-blueprints.mdc` is the Mega Blueprints build/audit contract, and
 *  `01-coordination-lane.mdc` is the coordination surface this suite is about.
 *  An earlier revision of this list named the blueprints rule, so the case
 *  failed against a correct tree — and the "fix" it invited was to paste the
 *  coordination procedure into an unrelated rule. The detector was wrong, not
 *  the docs. Measured 2026-09-21: both files have `alwaysApply: true`; only
 *  `01-coordination-lane.mdc` speaks for coordination. */
const SURFACES = [
  { harness: 'Claude Code', files: ['CLAUDE.md'] },
  { harness: 'Codex', files: ['AGENTS.md'] },
  { harness: 'OpenCode', files: ['AGENTS.md', '.opencode/SEAT.md'] },
  { harness: 'WorkBuddy', files: ['CODEBUDDY.md'] },
  { harness: 'Cursor', files: ['.cursor/rules/01-coordination-lane.mdc'] },
  { harness: 'Copilot', files: ['.github/copilot-instructions.md'] },
  { harness: 'Gemini CLI', files: ['GEMINI.md'] },
];

const read = (rel) => readFileSync(resolve(ROOT, rel), 'utf8');

/** A line is HISTORICAL, not operational, when it is quoted narration, a dated
 *  amendment, or an explicitly labelled incident record. Those may keep obsolete
 *  commands; the operational text may not. */
const HISTORICAL = /^\s*>|Amended\s+\d{4}-\d{2}-\d{2}|Proven miss|old text|previously named|the old shape|incident/i;
const operationalLines = (text) => text.split(/\r?\n/).filter((l) => l.trim() && !HISTORICAL.test(l));

/** The coordination procedure, in whatever words the surface uses: it must name
 *  Rule 67, name a discovery command, and forbid a fixed seat list. */
function hasCoordinationProcedure(text) {
  return /Rule\s*67/i.test(text)
    && /lane\.mjs|lane-at-root\.mjs/.test(text)
    && /never enumerate|not.{0,30}fixed|per-session|per session/i.test(text);
}

/* ── The six cases ──────────────────────────────────────────────────────────── */

test('all seven harness surfaces contain the coordination procedure', () => {
  const absent = [];
  const missing = [];
  for (const { harness, files } of SURFACES) {
    for (const f of files) {
      if (!existsSync(resolve(ROOT, f))) {
        absent.push(`${harness} (${f})`);
        continue;
      }
      if (!hasCoordinationProcedure(read(f))) missing.push(`${harness} (${f})`);
    }
  }
  assert.deepEqual(absent, [], `surface file(s) absent — owned by the instruction-surface change: ${absent.join(', ')}`);
  assert.deepEqual(missing, [], `surface(s) present but without the coordination procedure: ${missing.join(', ')}`);
});

test('authoritative specs require complete discovery before editing', () => {
  // The spec must require it, and it must require it BEFORE an edit — a rule
  // satisfied after the edit prevents nothing.
  const spec = operationalLines(read(PROTOCOL)).join('\n');
  assert.match(spec, /orientation/, 'the protocol must name the complete-discovery command');
  assert.match(spec, /before (editing|your first edit)/i, 'the protocol must place it before the edit');

  for (const f of ['CLAUDE.md', 'AGENTS.md']) {
    const lines = operationalLines(read(f)).join('\n');
    assert.match(lines, /orientation/, `${f} must require complete discovery, not only digest`);
  }
});

test('operational sections contain no fixed seat-file discovery list', () => {
  /* A fixed list is filenames offered AS the way to find seats. Two shapes are
   * therefore NOT violations, and a detector that flags them is the classic
   * false positive this suite exists to avoid:
   *   - the prohibition itself ("Never enumerate lane files by name") — a line
   *     that states the rule cannot be the breach of it;
   *   - an illustration of the naming SCHEME, recognisable by a placeholder
   *     (`<agent>`, `<hash>`) rather than concrete seat names.
   * What remains is a genuine instruction to read a hardcoded set. */
  const STATES_PROHIBITION_OR_SCHEME = /never enumerate|per-session|per session|<agent>|<hash>|<session/i;
  const offenders = [];
  for (const rel of [PROTOCOL, LEDGER_README, 'CLAUDE.md', 'AGENTS.md']) {
    for (const line of operationalLines(read(rel))) {
      if (STATES_PROHIBITION_OR_SCHEME.test(line)) continue;
      const unique = new Set((line.match(/[a-z0-9-]+\.lane\.md/gi) || []).map((n) => n.toLowerCase()));
      if (unique.size >= 2) offenders.push(`${rel}: ${line.trim().slice(0, 120)}`);
    }
  }
  assert.deepEqual(offenders, [], `fixed seat-file list(s) in operational text:\n${offenders.join('\n')}`);
});

test('operational sections use thirty-minute warnings without automatic release', () => {
  const spec = operationalLines(read(PROTOCOL)).join('\n');
  assert.match(spec, /30\s*(minutes|min)/i, 'the 30-minute advisory threshold must be stated');
  assert.match(spec, /never|nothing|no automatic|not automatic/i, 'a 30-minute warning must not imply automatic release');
  // The precise defect this guards: "the claim may be abandoned" reads as a
  // licence to take the files.
  for (const rel of [PROTOCOL, LEDGER_README]) {
    for (const line of operationalLines(read(rel))) {
      assert.ok(
        !/may be abandoned/i.test(line),
        `${rel} must not say a claim "may be abandoned": ${line.trim().slice(0, 120)}`,
      );
    }
  }
});

test('operational sections do not claim digest returns an own filepath or every lock', () => {
  for (const rel of [PROTOCOL, LEDGER_README, 'CLAUDE.md', 'AGENTS.md']) {
    for (const line of operationalLines(read(rel))) {
      // `digest` prints `agent@slug` on its me: line — never a path — and it
      // caps lock paths at 5 per seat.
      assert.ok(
        !/digest[^.]{0,80}\b(exact )?path\b/i.test(line),
        `${rel} must not claim digest prints a path: ${line.trim().slice(0, 120)}`,
      );
      assert.ok(
        !/digest[^.]{0,80}\bevery lock/i.test(line),
        `${rel} must not claim digest returns every lock: ${line.trim().slice(0, 120)}`,
      );
    }
  }
  // And the docs must say so positively, or the cap stays invisible.
  const spec = operationalLines(read(PROTOCOL)).join('\n');
  assert.match(spec, /digest[^.]{0,120}capped/i, 'the protocol must state that digest is capped');
});

test('capability and execution claims match the harness evidence matrix', () => {
  const spec = read(PROTOCOL);
  for (const { harness } of SURFACES) {
    assert.ok(spec.includes(harness), `the evidence matrix must carry a row for ${harness}`);
  }
  // Every harness row is UNVERIFIED until a real invocation is captured.
  assert.ok(
    (spec.match(/UNVERIFIED/g) || []).length >= SURFACES.length,
    'every harness row must be recorded as UNVERIFIED, not silently passed',
  );
  // No surface may be advertised as automatically covered. A line that NEGATES
  // the claim ("must never be labelled automatically covered") is the rule, not
  // a breach of it — flagging it would make this suite fail on its own remedy.
  const NEGATED = /\bnever\b|\bnot\b|\bno\b|cannot|must not/i;
  for (const rel of [PROTOCOL, LEDGER_README, 'CLAUDE.md', 'AGENTS.md']) {
    for (const line of operationalLines(read(rel))) {
      if (NEGATED.test(line)) continue;
      assert.ok(
        !/automatically (covered|fires|runs)\b/i.test(line),
        `${rel} must not claim automatic coverage: ${line.trim().slice(0, 120)}`,
      );
    }
  }
});
