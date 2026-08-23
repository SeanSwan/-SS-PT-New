#!/usr/bin/env node
/**
 * drift-check-gate.fuzz.mjs — property-based round on check 7's classifier.
 * =========================================================================
 * WHY A FUZZER, AFTER NINE PANEL ROUNDS: every round so far was the same vantage —
 * a model reading the file. That found ~43 real defects, but the last two lived
 * INSIDE the previous round's fix, which is a loop feeding itself. Reading cannot
 * escape it. This round changes the instrument.
 *
 * A reader checks cases it thought of. A fuzzer checks PROPERTIES over inputs nobody
 * thought of — which is the only way to attack a bug class whose signature is
 * "some input we did not consider falls through".
 *
 * THE THREE PROPERTIES, each mapping to a failure this loop actually shipped:
 *
 *   P1 TOTALITY      every input yields exactly one of OK|MISSING|UNVERIFIED.
 *                    Rounds 1-5 each shipped an input that yielded nothing, and
 *                    nothing is byte-identical to "checked and healthy".
 *
 *   P2 NO-PHANTOM    MISSING implies the asserted path is genuinely not a file.
 *                    Rounds 2,3,7,9 each reported a healthy registration missing.
 *                    A phantom trains the operator to ignore the gate, which
 *                    restores the original outage by consent.
 *
 *   P3 NO-FALSE-OK   OK implies the asserted path IS a file on disk. Round 9 found
 *                    a command that split to an existing file and returned OK while
 *                    the shell would have failed to exec the real token.
 *
 * Deterministic by seed so a failure is reproducible: `--seed 12345`.
 * Run: node scripts/hooks/drift-check-gate.fuzz.mjs [--iterations N] [--seed S]
 */
import { statSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyCommand } from '../lib/hook-registration.mjs';

const arg = (f, d) => {
  const i = process.argv.indexOf(f);
  return i >= 0 && process.argv[i + 1] !== undefined ? process.argv[i + 1] : d;
};
const ITERATIONS = Number(arg('--iterations', '20000'));
// Validated BEFORE the loop, not after. The guard used to sit past the `for`, so
// `--iterations Infinity` (or 1e300) never terminated and the check that would have
// caught it was unreachable: no output, no exit code, a CI job hanging forever. The
// answer "it never prints the pass line" was true and irrelevant — "tests nothing,
// silently, forever" was still on the table. (Confirming round, 2026-08-23.)
const MAX_ITERATIONS = 5_000_000;
if (!Number.isFinite(ITERATIONS) || ITERATIONS <= 0 || ITERATIONS > MAX_ITERATIONS) {
  console.error(`  --iterations must be a positive finite number <= ${MAX_ITERATIONS} (got ${arg('--iterations', '20000')})`);
  process.exit(2);
}
const SEED = Number(arg('--seed', '1'));

/** xorshift32 — deterministic, so any failure reproduces from its seed alone. */
let state = SEED >>> 0 || 1;
const rnd = () => {
  state ^= state << 13; state >>>= 0;
  state ^= state >> 17;
  state ^= state << 5; state >>>= 0;
  return state / 0x100000000;
};
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const maybe = (p) => rnd() < p;

// A real sandbox: some of these files exist, some do not. The properties below are
// checked against the ACTUAL filesystem, not against expectations.
const root = mkdtempSync(join(tmpdir(), 'hookfuzz-'));
mkdirSync(join(root, 'hooks'), { recursive: true });
mkdirSync(join(root, 'nested', 'deep'), { recursive: true });
writeFileSync(join(root, 'hooks', 'present.mjs'), '// real\n');
writeFileSync(join(root, 'nested', 'deep', 'also.sh'), '# real\n');
mkdirSync(join(root, 'hooks', 'dir-named.mjs'), { recursive: true }); // a DIRECTORY

const INTERPRETERS = ['node', 'npx', 'bash', 'sh', 'python3', 'node --enable-source-maps', ''];
const PATHS = [
  'hooks/present.mjs', './hooks/present.mjs', 'nested/deep/also.sh',
  'hooks/absent.mjs', './hooks/absent.mjs', 'hooks/dir-named.mjs',
  'hooks/present', 'hooks/present.MJS', 'nested/../hooks/present.mjs',
  '/abs/hooks/x.mjs', 'C:/abs/hooks/x.mjs', '../outside/x.mjs',
  'hooks/pre load.mjs', 'hooks/a.mjs:b.mjs', 'FOO=x.mjs',
];
const FLAGS = ['', '--flag', '-r ./hooks/present.mjs', '--import=./hooks/present.mjs',
  '--emit out.mjs', '--ref nested/deep/also.sh', '-e'];
const NOISE = ['', ';echo hi', ' && node b.mjs', ' | tee log', ' # comment',
  ' $VAR', ' ${VAR}', ' %VAR%', ' ~/x', ' *.mjs', ' `id`', ' (sub)'];
const WEIRD_WS = ['', '\u00A0', '\u000B', '\u000C', '\r', '\u2003', '\u3000'];
const QUOTES = ['', '"', "'"];

/**
 * Generate one command.
 *
 * The FIRST version of this generator appended shell noise on nearly every draw, so a
 * 20k run produced 19,896 UNVERIFIED against 39 OK and 65 MISSING — it reported "all
 * properties held" while barely exercising the two properties that matter (P2 and P3
 * only have teeth on the assert path). A fuzzer that green-lights a corpus it never
 * drove is the same silence-looks-like-success failure this module exists to kill,
 * relocated into the instrument.
 *
 * So the corpus is now deliberately WEIGHTED: roughly half plain commands that reach
 * the assert path, half adversarial. The verdict histogram is printed and a run that
 * fails to produce both OK and MISSING declares its own coverage incomplete.
 */
function generate() {
  if (maybe(0.02)) return { cmd: pick([undefined, null, '', '   ', 42, {}, []]), intended: null };

  // ~55%: plain, assertable — these drive P2/P3 and carry GROUND TRUTH.
  //
  // The intended entrypoint is returned alongside the command, because knowing WHICH
  // token the classifier should have picked is the difference between checking
  // existence and checking identity. The first version threw this away, and that made
  // P2/P3 unable to catch the very class they were written for (see the oracle below).
  if (maybe(0.55)) {
    const target = pick(PATHS);
    const parts = [pick(['node', 'npx', 'bash', 'node --enable-source-maps']), target];
    if (maybe(0.25)) parts.push('--flag');
    // Ground truth is only claimable when the shell would actually see ONE argument.
    // An unquoted path containing a space is two arguments, so "intended" would be a
    // fiction and P4 would fail the classifier for being right. The instrument must
    // not assert something the shell cannot express.
    const coherent = !/\s/.test(target);
    return { cmd: parts.join(' '), intended: coherent ? target : null };
  }

  // ~45%: adversarial — quoting, weird whitespace, flags, shell noise.
  const q = pick(QUOTES);
  let p = pick(PATHS);
  if (maybe(0.25)) {
    const w = pick(WEIRD_WS);
    if (w) p = p.slice(0, 3) + w + p.slice(3);
  }
  if (q) p = q + p + q;
  const flag = pick(FLAGS);
  const parts = [pick(INTERPRETERS), flag, p].filter(Boolean);
  const extra = maybe(0.3) ? pick(FLAGS) : '';
  if (extra) parts.push(extra);
  const noise = pick(NOISE);
  // Ground truth IS claimable here whenever the shape stays readable. The first
  // version set intended:null for every adversarial draw, so P4 — added specifically
  // to catch the loader-operand wrong-file class — never ran on the very shape that
  // class lives in (`node -r ./present.mjs hooks/present`). A seat found that the
  // oracle was scoped out of its own purpose. Claim truth unless something makes the
  // command genuinely unreadable: shell noise, quoting, weird whitespace, or a flag
  // that itself carries a path (then the entrypoint is ambiguous by construction).
  const flagCarriesPath = /\s\S+\.(?:mjs|cjs|js|ts|sh|bash|ps1|py|rb)$/.test(flag) || /\s\S+\.(?:mjs|cjs|js|ts|sh|bash|ps1|py|rb)$/.test(extra);
  const readable = !noise && !q && !/\s/.test(p) && !flagCarriesPath;
  return { cmd: parts.join(' ') + noise, intended: readable ? p : null };
}

const KINDS = ['OK', 'MISSING', 'UNVERIFIED'];
const isFile = (rel) => { try { return statSync(resolve(root, rel)).isFile(); } catch { return false; } };

const failures = [];
const record = (prop, cmd, detail) => {
  if (failures.length < 12) failures.push({ prop, cmd, detail });
};

const counts = { OK: 0, MISSING: 0, UNVERIFIED: 0 };

for (let i = 0; i < ITERATIONS; i += 1) {
  const { cmd, intended } = generate();
  let v;
  try {
    v = classifyCommand(cmd, root);
  } catch (e) {
    record('P1 TOTALITY (threw)', cmd, e?.message || String(e));
    continue;
  }

  // P1 — exactly one legal verdict, always.
  if (!v || !KINDS.includes(v.kind)) {
    record('P1 TOTALITY', cmd, `verdict=${JSON.stringify(v)}`);
    continue;
  }
  counts[v.kind] += 1;

  // P2 — MISSING must name a path that genuinely is not a file. Any MISSING on a
  // real file is a phantom in the loud path.
  if (v.kind === 'MISSING') {
    if (typeof v.path !== 'string' || !v.path) {
      record('P2 NO-PHANTOM (no path)', cmd, `verdict=${JSON.stringify(v)}`);
    } else if (isFile(v.path)) {
      record('P2 NO-PHANTOM', cmd, `reported MISSING but ${v.path} IS a file`);
    }
  }

  // P3 — OK must name a path that IS a file. An OK on a non-file is a false clean,
  // which is the outage this whole module exists to prevent.
  if (v.kind === 'OK') {
    if (typeof v.key !== 'string' || !isFile(v.key)) {
      record('P3 NO-FALSE-OK', cmd, `returned OK but ${v.key} is not a file`);
    }
  }

  // P4 IDENTITY — the verdict must be about the RIGHT file, not merely about A file.
  //
  // P2 and P3 alone check EXISTENCE, and existence is not identity. A classifier bug
  // that returns a wrong-but-existing path passes P3 with a green light: given
  // `node -r ./hooks/present.mjs hooks/absent.mjs`, a classifier keying on the first
  // path-like token returns {OK, key:'./hooks/present.mjs'} — that file exists, P3
  // passes, exit 0 — while the REAL entrypoint is missing and the gate certifies a
  // broken registration. That is round 9's false-OK class surviving the instrument
  // built to catch it, and two seats found it by reading the oracle rather than the
  // subject. The plain branch knew the intended token all along and discarded it.
  if (intended && (v.kind === 'OK' || v.kind === 'MISSING')) {
    const named = v.kind === 'OK' ? v.key : v.path;
    // Normalise only the leading `./` — anything else differing is a real mismatch.
    const norm = (x) => String(x).replace(/^\.\//, '');
    if (norm(named) !== norm(intended)) {
      record('P4 IDENTITY', cmd, `asserted about ${named} but the intended entrypoint was ${intended}`);
    }
  }
}

rmSync(root, { recursive: true, force: true });

console.log(`  seed=${SEED}  iterations=${ITERATIONS}`);
console.log(`  verdicts: OK=${counts.OK}  MISSING=${counts.MISSING}  UNVERIFIED=${counts.UNVERIFIED}`);
// A run that never produced an OK or a MISSING proved nothing about P2/P3/P4. The
// first version printed a warning and then exited 0 with "all properties held" — so
// `--iterations 0`, a bad `--iterations` string (Number -> NaN, loop never entered),
// or a classifier that only ever returns UNVERIFIED would all report PROVEN having
// tested nothing. In CI that is indistinguishable from a real pass. Silence looking
// like success, inside the instrument written to hunt exactly that. (Found by a seat
// reading the oracle rather than the subject, 2026-08-23.)
const degenerate = !Number.isFinite(ITERATIONS) || ITERATIONS <= 0 || !counts.OK || !counts.MISSING;
if (degenerate) {
  console.log('  ⚠ DEGENERATE RUN — the corpus did not exercise both OK and MISSING, so P2/P3/P4 proved nothing.');
  console.log('  ⚠ This is NOT a pass. Exiting non-zero so it cannot be mistaken for one.');
}
if (failures.length) {
  console.log(`\n  ${failures.length} PROPERTY VIOLATION(S):`);
  for (const f of failures) console.log(`    ${f.prop}\n      cmd:    ${JSON.stringify(f.cmd)}\n      detail: ${f.detail}`);
  process.exit(1);
}
// A degenerate corpus must never print the pass line, let alone exit 0. Printing a
// warning and then "all properties held" was the worst of both: the reassuring
// sentence is the one a human remembers and the exit code is the one CI reads.
if (degenerate) process.exit(2);
console.log('\n  all properties held');
process.exit(0);
