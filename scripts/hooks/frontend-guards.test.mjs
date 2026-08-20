/**
 * frontend-guards.test.mjs — coverage for the staged-file frontend guards.
 * Run: node scripts/hooks/frontend-guards.test.mjs
 *
 * The guard is a CLI script with top-level side effects, so this drives it as a
 * subprocess via --file (its documented self-test path) against fixture files.
 * That is deliberate: it tests the thing that actually runs in pre-commit, not a
 * refactored copy of its logic.
 *
 * G5 is the one that earns real tests — it is a hand-rolled template-literal scanner,
 * and the rule it enforces (Rule 43) is a production-outage class, not a style nag.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const GUARD = join(dirname(fileURLToPath(import.meta.url)), 'frontend-guards.mjs');

let pass = 0;
const fail = [];
const t = (name, fn) => {
  try { fn(); pass += 1; console.log(`  PASS  ${name}`); }
  catch (e) { fail.push(name); console.log(`  FAIL  ${name}\n        ${e.message}`); }
};

const root = mkdtempSync(join(tmpdir(), 'fg-'));
mkdirSync(join(root, 'frontend', 'src'), { recursive: true });

/** Write a fixture and run the guard on it. Returns {code, out}. */
function guard(filename, content) {
  const p = join(root, 'frontend', 'src', filename);
  writeFileSync(p, content);
  // spawnSync, not execFileSync: warnings go to stderr, and execFileSync returns ONLY stdout
  // on success — so an advisory G6 was invisible to the test while working correctly.
  // H2 self-review, new vantage (running from a different cwd): a RELATIVE script path made
  // the suite pass 20/20 from the repo root and 6/20 from anywhere else — a green suite that
  // silently stops testing depending on where it is invoked. Resolve from this file instead.
  const r = spawnSync('node', [GUARD, '--file', p], { encoding: 'utf8' });
  return { code: r.status, out: `${r.stdout || ''}${r.stderr || ''}` };
}

// ---- G5: the mount-crash rule -------------------------------------------
// The real 2026-04-12 incident shape: an exported fragment interpolating a `keyframes`
// primitive in a PLAIN string. Only a primitive bakes a class name in — a number does not,
// which is why the fixture must define one (a live false positive taught us this).
t('G5 RED: exported fragment interpolating a keyframes primitive in a plain string', () => {
  const r = guard('bad.ts', 'const fadeIn = keyframes`from{opacity:0}`;\nexport const bentoItemAnimation = `\n  animation: ${fadeIn} 1s;\n`;\n');
  if (r.code !== 1) throw new Error(`expected exit 1, got ${r.code}: ${r.out}`);
  if (!/G5 css-helper-required/.test(r.out)) throw new Error(`no G5 in output: ${r.out}`);
  if (!/bentoItemAnimation/.test(r.out)) throw new Error('should name the offending fragment');
});

t('G5 GREEN: same fragment wrapped in css``', () => {
  const r = guard('good.ts', 'export const bentoItemAnimation = css`\n  animation: ${fadeIn} 1s;\n`;\n');
  if (r.code !== 0) throw new Error(`expected clean, got ${r.code}: ${r.out}`);
});

t('G5 GREEN: plain template with NO interpolation is fine', () => {
  const r = guard('plain.ts', 'export const label = `just a string`;\n');
  if (r.code !== 0) throw new Error(`expected clean, got ${r.code}: ${r.out}`);
});

t('G5 GREEN: styled.div`` and keyframes`` are already tagged', () => {
  const a = guard('styled.ts', 'export const Row = styled.div`\n  gap: ${g}px;\n`;\n');
  if (a.code !== 0) throw new Error(`styled should be clean: ${a.out}`);
  const b = guard('kf.ts', 'export const fadeIn = keyframes`\n  from { opacity: ${o}; }\n`;\n');
  if (b.code !== 0) throw new Error(`keyframes should be clean: ${b.out}`);
});

t('G5 GREEN: a NON-exported local is not a shared fragment', () => {
  const r = guard('local.ts', 'const localOnly = `x ${y} z`;\n');
  if (r.code !== 0) throw new Error(`non-exported must not flag: ${r.out}`);
});

t('G5: escaped backtick inside the literal does not end it early', () => {
  // The scanner must not treat \` as the closing backtick, or it would miss the ${}.
  const r = guard('esc.ts', 'const c = css`x`;\nexport const s = `a \\` b ${c}`;\n');
  if (r.code !== 1) throw new Error(`expected G5 to still catch it, got ${r.code}: ${r.out}`);
});

t('G5: nested ${ } braces do not terminate the scan early', () => {
  const r = guard('nested.ts', 'const b = keyframes`y`;\nexport const s = `${ a ? b : c }`;\n');
  if (r.code !== 1) throw new Error(`expected G5, got ${r.code}: ${r.out}`);
});

// Self-review 2026-08-18 found this FALSE NEGATIVE, and it was the worse one: shared
// animations normally live in their own module and are imported, so the imported case is
// the MOST likely real shape of the bug — and same-file detection could not see it.
t('G5 RED: an IMPORTED keyframes primitive is resolved and caught', () => {
  writeFileSync(join(root, 'frontend', 'src', 'anim.ts'),
    'import { keyframes } from "styled-components";\nexport const fadeIn = keyframes`from{opacity:0}`;\n');
  const r = guard('usesimport.ts', 'import { fadeIn } from "./anim";\nexport const bad = `\n  animation: ${fadeIn} 1s;\n`;\n');
  if (r.code !== 1) throw new Error(`imported primitive must fire, got ${r.code}: ${r.out}`);
  if (!/G5 css-helper-required/.test(r.out)) throw new Error(`no G5: ${r.out}`);
});

t('G5 GREEN: an IMPORTED plain constant is not a primitive', () => {
  // The counterpart that keeps the CrystallizeOverlay false positive dead: importing a
  // number must stay clean, or the fix would trade one bug for the other.
  writeFileSync(join(root, 'frontend', 'src', 'consts.ts'), 'export const Z = 42;\n');
  const r = guard('usesnum.ts', 'import { Z } from "./consts";\nexport const ok = `\n  z-index: ${Z};\n`;\n');
  if (r.code !== 0) throw new Error(`imported number must stay clean, got ${r.code}: ${r.out}`);
});

t('G5: an unresolvable import does not crash the guard', () => {
  const r = guard('ghost.ts', 'import { x } from "./does-not-exist";\nexport const s = `a ${x}`;\n');
  if (r.code === 2) throw new Error(`guard crashed on a missing import: ${r.out}`);
});

t('G5 GREEN: a css-PREFIXED helper is not a primitive (GLM H1-2.2)', () => {
  // `css` without a word boundary matched the prefix of `cssValue`, so a plain helper's
  // result was treated as a primitive and every consumer of it false-positived.
  const r = guard('prefix.ts', 'const gap = cssValue(16);\nexport const track = `gap: ${gap}`;\n');
  if (r.code !== 0) throw new Error(`cssValue prefix must not flag: ${r.out}`);
});

// GLM H1-2.3/2.4/2.5 — three shapes that escaped G5 entirely.
t('G5 RED: export default template (H1-2.4)', () => {
  const r = guard('dflt.ts', 'const fadeIn = keyframes`x`;\nexport default `a ${fadeIn}`;\n');
  if (r.code !== 1) throw new Error(`export default must be scanned: ${r.out}`);
});

t('G5 RED: an unknown tag whose name merely STARTS with a safe word', () => {
  // `cssText` half-matched the old tag alternation and then failed, so the fragment was
  // never scanned at all. An unrecognised tag must be scanned, not assumed safe.
  const r = guard('tagpfx.ts', 'const fadeIn = keyframes`x`;\nexport const y = cssText`a ${fadeIn}`;\n');
  if (r.code !== 1) throw new Error(`unknown tag must be scanned: ${r.out}`);
});

t('G5: a quoted brace inside an interpolation does not desync the scanner (H1-2.5)', () => {
  // `${map['}']}` previously closed the interpolation early and could hide later fragments.
  const r = guard('brace.ts', 'const fadeIn = keyframes`x`;\nexport const a = `${map["}"]}`;\nexport const b = `y ${fadeIn}`;\n');
  if (!/G5 css-helper-required/.test(r.out)) throw new Error(`later fragment was hidden: ${r.out}`);
});

t('G5: an UNQUOTED brace in an interpolation does not desync the scanner (H2-7)', () => {
  // The H1 fix closed quoted braces but not object literals: `${fn({a:1}) && g}` let the
  // object's `}` close the interpolation early, so `g` was never read.
  writeFileSync(join(root, 'frontend', 'src', 'kf2.ts'), 'export const g = keyframes`x`;\n');
  const r = guard('brace2.ts', 'const g = keyframes`x`;\nexport const t = `${fn({ a: 1 }) && g}`;\n');
  if (r.code !== 1) throw new Error(`object literal desynced the scan: ${r.out}`);
});

// ---- G6: line cap --------------------------------------------------------
// G6 is ADVISORY on purpose: 31 of a 250-file real sample are already over the cap, and
// hard-failing would block a commit that touches one line of inherited debt (Rule 34).
// It must still SAY something every time, or the debt silently grows.
t('G6 WARNS but does not block on a 301-line file', () => {
  const r = guard('big.ts', `${'// x\n'.repeat(301)}`);
  if (!/WARN: G6 file-max-lines/.test(r.out)) throw new Error(`expected a G6 warning: ${r.out}`);
  if (r.code !== 0) throw new Error(`G6 must not block; got exit ${r.code}`);
});

t('G6 opt-out tag silences the warning entirely', () => {
  const r = guard('optout.ts', `// swan-guard-allow-long-file: legacy, split tracked separately\n${'// x\n'.repeat(301)}`);
  // Match the WARN line specifically — the CLEAN summary also contains the string "G6".
  if (/WARN: G6/.test(r.out)) throw new Error(`opt-out should silence G6: ${r.out}`);
});

t('G6 GREEN: 300 lines is at the cap, not over it', () => {
  // 299 newlines => 300 lines after split. Off-by-one here would fire on every large file.
  const r = guard('atcap.ts', `${'// x\n'.repeat(299)}// last`);
  if (r.code !== 0) throw new Error(`300 lines must pass, got ${r.code}: ${r.out}`);
});

// ---- regression: pre-existing guards still work -------------------------
t('G1 still fires on @mui import', () => {
  const r = guard('mui.tsx', "import Button from '@mui/material/Button';\n");
  if (!/G1 no-MUI/.test(r.out)) throw new Error(`G1 regressed: ${r.out}`);
});

t('G4 still allows a var() fallback hex', () => {
  const r = guard('ok.ts', 'const c = `color: var(--accent, #60C0F0);`;\n');
  if (r.code !== 0) throw new Error(`var fallback must pass: ${r.out}`);
});

t('test files stay exempt from G3/G4/G5/G6', () => {
  const r = guard('thing.test.ts', 'export const s = `x ${y}`;\nconst hex = "#123456";\n');
  if (r.code !== 0) throw new Error(`test files must be exempt: ${r.out}`);
});

rmSync(root, { recursive: true, force: true });
console.log(`\n${pass} passed, ${fail.length} failed`);
if (fail.length) process.exit(1);
