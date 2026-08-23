#!/usr/bin/env node
/**
 * hook-audit.fuzz.mjs — property fuzz over auditHookRegistrations (the WALK).
 * ===========================================================================
 * A DIFFERENT SURFACE from drift-check-gate.fuzz.mjs, deliberately. That one fuzzes
 * classifyCommand — one command in, one verdict out. This one fuzzes the layer above
 * it: reading real settings files, handling malformed shapes, deduping, and turning
 * verdicts into findings. Several of this loop's worst bugs lived HERE and not in the
 * classifier — `hooks: null` reading clean, a non-object root iterating zero times, an
 * unreadable file skipped exactly like an absent one.
 *
 * THE PROPERTIES:
 *
 *   A1 NEVER THROWS      the audit is called from a SessionStart hook. An exception
 *                        escaping it replaces the WHOLE audit — including any already
 *                        confirmed MISSING — with a generic "could not complete",
 *                        demoting a certain alarm to unknown. (Round 7 found exactly
 *                        that via a `null` root.)
 *
 *   A2 NO SILENT DISCARD if a config declares hook entries that cannot possibly run,
 *                        the audit must SAY something. Zero findings is only correct
 *                        when the config is genuinely healthy or genuinely empty.
 *                        Every silent-clean bug in this loop was a violation of A2.
 *
 *   A3 MISSING IS REAL   any file named in a MISSING finding must genuinely be absent
 *                        from the sandbox. A phantom here is louder than in the
 *                        classifier, because it reaches the operator verbatim.
 *
 *   A4 DETERMINISTIC     the same config audited twice yields identical findings.
 *                        Dedupe keyed on mutable state would break this.
 *
 * Run: node scripts/hooks/hook-audit.fuzz.mjs [--iterations N] [--seed S]
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { auditHookRegistrations } from '../lib/hook-registration.mjs';

const arg = (f, d) => {
  const i = process.argv.indexOf(f);
  return i >= 0 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : d;
};
const ITERATIONS = Number(arg('--iterations', '3000'));
const SEED = Number(arg('--seed', '1'));

let state = SEED >>> 0 || 1;
const rnd = () => {
  state ^= state << 13; state >>>= 0;
  state ^= state >> 17;
  state ^= state << 5; state >>>= 0;
  return state / 0x100000000;
};
const pick = (a) => a[Math.floor(rnd() * a.length)];
const maybe = (p) => rnd() < p;

const root = mkdtempSync(join(tmpdir(), 'auditfuzz-'));
mkdirSync(join(root, '.claude'), { recursive: true });
mkdirSync(join(root, 'hooks'), { recursive: true });
writeFileSync(join(root, 'hooks', 'present.mjs'), '// real\n');

const RUNNABLE = 'node hooks/present.mjs';        // resolves to OK
const DEAD = 'node hooks/absent.mjs';             // resolves to MISSING
const OPAQUE = 'node $VAR/x.mjs';                 // resolves to UNVERIFIED
const EVENTS = ['SessionStart', 'PreToolUse', 'Stop', 'UserPromptSubmit'];

/**
 * Build a hooks object, then derive the truth BY WALKING WHAT WAS BUILT.
 *
 * The first version counted during construction and was wrong: `pick(EVENTS)` can
 * return the same event twice, and `hooks[ev] = [...]` overwrites, so a DEAD entry
 * that had already been counted vanished from the JSON. The fuzzer then reported a
 * violation against a config that was genuinely healthy — a false alarm from the
 * instrument, on a run whose whole purpose is detecting false alarms.
 *
 * Deriving the expectation from the FINAL object cannot drift from what is written.
 */
function buildHooks() {
  const hooks = {};
  const n = Math.floor(rnd() * 3);
  for (let i = 0; i < n; i += 1) {
    const ev = pick(EVENTS);
    const entries = [];
    const m = 1 + Math.floor(rnd() * 3);
    for (let j = 0; j < m; j += 1) {
      const cmd = pick([RUNNABLE, DEAD, OPAQUE, '', null, 42]);
      entries.push(maybe(0.9) ? { type: 'command', command: cmd } : {});
    }
    hooks[ev] = [{ hooks: entries }];
  }

  let declaresDead = 0;
  let declaresAny = 0;
  for (const groups of Object.values(hooks)) {
    for (const g of groups) {
      for (const e of g.hooks) {
        declaresAny += 1;
        // Unrunnable = a dead path, or an entry with no usable command at all.
        if (e.command === DEAD) declaresDead += 1;
        else if (typeof e.command !== 'string' || !e.command.trim()) declaresDead += 1;
      }
    }
  }
  return { hooks, declaresDead, declaresAny };
}

/** Emit a settings.json body plus what we know must be reported about it. */
function buildConfig() {
  // Malformed shapes: the config declares nothing runnable, so the audit MUST speak.
  if (maybe(0.28)) {
    const body = pick([
      '{"hooks":null}', '{"hooks":false}', '{"hooks":42}', '{"hooks":[]}',
      '{"hooks":"str"}', '[1,2,3]', '"a string"', 'null', '42',
      '{"hooks":{"Stop":null}}', '{"hooks":{"Stop":42}}', '{"hooks":{"Stop":[{}]}}',
      '{ not json at all', '',
    ]);
    return { body, mustSpeak: true, declaresDead: 0 };
  }
  // Healthy-shaped config with a mix of live, dead and opaque registrations.
  const { hooks, declaresDead, declaresAny } = buildHooks();
  return {
    body: JSON.stringify({ hooks }),
    // Only entries that cannot run force a finding; an empty config legitimately does not.
    mustSpeak: declaresAny > 0 && declaresDead > 0,
    declaresDead,
  };
}

const isFile = (rel) => { try { return statSync(resolve(root, rel)).isFile(); } catch { return false; } };
const failures = [];
const record = (prop, body, detail) => { if (failures.length < 12) failures.push({ prop, body, detail }); };

let spoke = 0; let silent = 0; let deadSeen = 0;

for (let i = 0; i < ITERATIONS; i += 1) {
  const { body, mustSpeak, declaresDead } = buildConfig();
  writeFileSync(join(root, '.claude', 'settings.json'), body);

  let r1;
  try {
    r1 = auditHookRegistrations(root);
  } catch (e) {
    record('A1 NEVER THROWS', body, e?.message || String(e));
    continue;
  }
  if (!r1 || !Array.isArray(r1.findings)) {
    record('A1 NEVER THROWS (bad shape)', body, JSON.stringify(r1));
    continue;
  }

  const text = r1.findings.join(' | ');
  if (r1.findings.length) spoke += 1; else silent += 1;
  if (declaresDead) deadSeen += 1;

  // A2 — a config that cannot run what it declares must not audit clean.
  if (mustSpeak && r1.findings.length === 0) {
    record('A2 NO SILENT DISCARD', body, 'config declares unrunnable hooks yet audit reported clean');
  }

  // A3 — every path named as missing must genuinely be absent.
  for (const m of text.matchAll(/([\w./-]+\.(?:mjs|cjs|js|ts|sh|bash|ps1|py|rb))\s*\(/g)) {
    if (isFile(m[1])) record('A3 MISSING IS REAL', body, `named ${m[1]} as missing but it IS a file`);
  }

  // A4 — same input, same output.
  const r2 = auditHookRegistrations(root);
  if (JSON.stringify(r2.findings) !== JSON.stringify(r1.findings)) {
    record('A4 DETERMINISTIC', body, 'two audits of one config disagreed');
  }
}

rmSync(root, { recursive: true, force: true });

console.log(`  seed=${SEED}  iterations=${ITERATIONS}`);
console.log(`  audits that reported: ${spoke}   audits that were silent: ${silent}   configs declaring a dead hook: ${deadSeen}`);
if (!spoke || !silent || !deadSeen) {
  console.log('  ⚠ corpus degenerate — it did not exercise both reporting and silence; coverage incomplete');
}
if (failures.length) {
  console.log(`\n  ${failures.length} PROPERTY VIOLATION(S):`);
  for (const f of failures) console.log(`    ${f.prop}\n      config: ${f.body.slice(0, 110)}\n      detail: ${f.detail}`);
  process.exit(1);
}
console.log('\n  all properties held');
process.exit(0);
