/**
 * frontend-guards.mjs — pre-commit executable enforcement of silent-failure design rules.
 * SWA-32 Slice 0 (Rule 73 "twice = codify"; Kimi K3 consult 2026-07-21).
 *
 * Guards STAGED frontend files only (never the whole repo — existing violations are
 * tracked separately, Rule 34 no blind cleanup):
 *   G1  no @mui/* imports            (CLAUDE.md Rule 1)
 *   G2  no recharts imports           (CLAUDE.md Rule 10 — Victory only)
 *   G3  no retired Galaxy-Swan palette #0a0a1a / #00FFFF / #7851A9 (identity §) — hard fail
 *   G4  no hardcoded hex outside var(--token, #hex) fallback position (Rule 6)
 *       G4 exceptions: lines carrying `swan-guard-allow-hex` (justify in-line) are skipped.
 *
 * Usage: node scripts/hooks/frontend-guards.mjs --staged   (from .githooks/pre-commit)
 *        node scripts/hooks/frontend-guards.mjs --file <path>...   (self-test / spot check)
 * Exit 0 = clean · 1 = violations (one FAIL: line each, actionable) · 2 = usage error.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const args = process.argv.slice(2);
const STAGED = args.includes('--staged');
const fileArgs = args.includes('--file') ? args.slice(args.indexOf('--file') + 1) : [];
if (!STAGED && fileArgs.length === 0) {
  console.error('usage: frontend-guards.mjs --staged | --file <path>...');
  process.exit(2);
}

const FRONTEND_RE = /^frontend\/src\/.+\.(tsx?|jsx?|css)$/;

function stagedFiles() {
  const out = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], { encoding: 'utf8' });
  return out.split('\n').filter((f) => FRONTEND_RE.test(f));
}

function stagedContent(file) {
  // read the STAGED blob, not the working tree — what's being committed is what's judged
  return execFileSync('git', ['show', `:${file}`], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
}

const targets = STAGED
  ? stagedFiles().map((f) => ({ file: f, text: stagedContent(f) }))
  : fileArgs.filter((f) => existsSync(f)).map((f) => ({ file: f, text: readFileSync(f, 'utf8') }));

const GALAXY = /#0a0a1a|#00FFFF|#7851A9/i;
const MUI = /from\s+['"]@mui\/|require\(\s*['"]@mui\//;
const RECHARTS = /from\s+['"]recharts['"]|require\(\s*['"]recharts['"]\)/;
// hex literal NOT preceded by ", #" fallback position of var(--x, #hex) and not var-adjacent
const HEX = /#[0-9a-fA-F]{3,8}\b/g;
const VAR_FALLBACK = /var\(\s*--[\w-]+\s*,\s*#[0-9a-fA-F]{3,8}\s*\)/;

const failures = [];
for (const { file, text } of targets) {
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    const loc = `${file}:${i + 1}`;
    if (MUI.test(line)) failures.push(`FAIL: G1 no-MUI (Rule 1) — ${loc} — use styled-components; @mui/* is banned`);
    if (RECHARTS.test(line)) failures.push(`FAIL: G2 no-recharts (Rule 10) — ${loc} — use Victory for all new charts`);
    if (GALAXY.test(line)) failures.push(`FAIL: G3 retired Galaxy-Swan palette — ${loc} — #0a0a1a/#00FFFF/#7851A9 are RETIRED; use Crystalline Swan tokens (no allowlist)`);
    if (line.includes('swan-guard-allow-hex')) return; // G4 opt-out only; G1-G3 already judged above
    const hexes = line.match(HEX);
    if (hexes) {
      // a hex is legal only when the line's hexes all sit in var(--token, #hex) fallback position
      const stripped = line.replace(new RegExp(VAR_FALLBACK.source, 'g'), '');
      const leftover = stripped.match(HEX);
      if (leftover) failures.push(`FAIL: G4 hardcoded-hex (Rule 6) — ${loc} — "${leftover[0]}" must be var(--token, ${leftover[0]}) or line-tagged swan-guard-allow-hex <reason>`);
    }
  });
}

if (failures.length) {
  failures.forEach((f) => console.error(f));
  console.error(`\n[frontend-guards] ${failures.length} violation(s) in ${targets.length} file(s). CLAUDE.md rules 1/6/10 + retired-palette are enforced mechanically (SWA-32 Slice 0).`);
  process.exit(1);
}
console.log(`[frontend-guards] CLEAN — ${targets.length} frontend file(s) checked (G1 MUI, G2 recharts, G3 Galaxy palette, G4 raw hex).`);
process.exit(0);
