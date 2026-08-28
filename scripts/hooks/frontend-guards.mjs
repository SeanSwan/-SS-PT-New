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
 * G5  exported style fragment interpolating a styled-components PRIMITIVE must be css`` (Rule 43)
 *       G5 opt-out: `swan-guard-allow-template` within 3 lines above the fragment.
 * G6  ADVISORY (warns, never blocks): file over the 300-line cap (Rule 4)
 *       G6 opt-out: `swan-guard-allow-long-file` anywhere in the file; vendored paths skipped.
 *
 * X1  MERGE VERBATIM-CARRY EXEMPTION (added 2026-08-27). During a merge (MERGE_HEAD
 *     present), a staged path whose blob is byte-identical to that path's blob in
 *     origin/main is skipped and logged with both OIDs. A merge stages what it carries;
 *     judging carried bytes enforces nothing (they are already on main and deployed) and
 *     makes origin/main unmergeable into any branch while main holds one violation.
 *     Cannot launder: editing a file changes its blob and re-enters the checked set.
 *     Fails CLOSED — unresolvable MERGE_HEAD or origin/main means no exemption.
 *
 * Usage: node scripts/hooks/frontend-guards.mjs --staged   (from .githooks/pre-commit)
 *        node scripts/hooks/frontend-guards.mjs --file <path>...   (self-test / spot check)
 * Exit 0 = clean · 1 = violations (one FAIL: line each, actionable) · 2 = usage error.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, resolve as resolvePath } from 'node:path';

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
  const names = out.split('\n');
  // X1b — SELECTION must be merge-aware, not just the exemption. `git diff --cached` is
  // index-vs-HEAD, so during a merge a path whose resolution equals THIS BRANCH's pre-merge
  // copy is not listed at all — even though the merge just discarded main's version of it.
  // Concretely: main FIXED a G5 violation, the merge resolves by keeping the branch's old
  // file, and the fix is silently reverted with the guard never looking. G5 is the
  // production-outage class (error #12 at mount), so that is not a style regression.
  // Found by attacking X1 rather than by testing it, alongside the same hole in the
  // constitution guard. FAILS CLOSED: outside a merge, selection is exactly as before.
  if (MERGE_IN_PROGRESS) {
    const vsMain = gitOut(['diff', '--cached', '--name-only', '--diff-filter=ACMR', 'origin/main']);
    if (vsMain !== null) for (const f of vsMain.split('\n')) if (!names.includes(f)) names.push(f);
  }
  return names.filter((f) => FRONTEND_RE.test(f));
}

function stagedContent(file) {
  // read the STAGED blob, not the working tree — what's being committed is what's judged
  return execFileSync('git', ['show', `:${file}`], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
}

// --- merge verbatim-carry exemption (X1) ------------------------------------
// A merge commit STAGES every path it brings in, including paths it did not author.
// Judging those enforces nothing — the bytes are already on the default branch and
// already deployed — while the side effect is severe: origin/main can never be merged
// into ANY branch while main carries a single G1-G5 violation anywhere.
//
// Exempt ONLY a verbatim carry: MERGE_HEAD present AND the staged blob byte-identical
// to that path's blob in origin/main's tree. This cannot launder a violation. Editing a
// file to smuggle one changes its blob, which drops it straight back into the checked
// set; anchoring to origin/main (not to a merge parent) means exempted bytes must
// already be on the default branch, so a poison branch has nothing to offer; and
// requiring MERGE_HEAD closes the squash path.
//
// FAILS CLOSED: if MERGE_HEAD or origin/main cannot be resolved, nothing is exempt.
//
// Rule 34 (pre-existing debt is not this commit's blocker) is the same principle G6
// already applies to the 300-line cap; its absence for G1-G5 was a coverage gap, not a
// deliberate stance. Filed after it blocked a zero-conflict sync merge on 2026-08-27.
function gitOut(args) {
  try {
    // MSYS_NO_PATHCONV: `<rev>:<path>` is the documented Git-Bash path-conversion trap
    // in this repo — it returns a false negative silently, which here would mean
    // "not a verbatim carry", i.e. it fails closed even if the pin were dropped.
    return execFileSync('git', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      env: { ...process.env, MSYS_NO_PATHCONV: '1' },
    }).trim();
  } catch {
    return null;
  }
}

// `git merge --squash` stages every carried byte and writes NO MERGE_HEAD, only SQUASH_MSG.
// Keyed on MERGE_HEAD alone, a squash-sync of main got zero relief and every carried
// violation was billed to this commit. Verified against real git. (Flash, R8, finding 2.)
const MERGE_IN_PROGRESS = (() => {
  if (gitOut(['rev-parse', '-q', '--verify', 'MERGE_HEAD']) !== null) return true;
  const dir = gitOut(['rev-parse', '--git-dir']);
  return Boolean(dir) && existsSync(`${dir}/SQUASH_MSG`);
})();

// Paths git recorded as CONFLICTED in this merge. A conflict means a human or agent CHOSE a
// side, and choosing main's side is not the same act as carrying main's bytes untouched — even
// though the resulting blob is byte-identical and so indistinguishable to the OID predicate.
// The case that matters: main holds a G5 violation, THIS BRANCH FIXED IT, the conflict is
// resolved to main's side, and the fix is silently reverted with the guard exempting the file.
// So: a conflicted path is never exempt, whatever its OID says.
//
// MERGE_MSG records these as COMMENTED lines ("# Conflicts:" then "#\t<path>"), not the bare
// "Conflicts:" a first reading assumed — verified against a real conflicted merge before use.
// Read via `git rev-parse --git-dir`, never a literal `.git/`: in a WORKTREE the gitdir lives
// elsewhere and the literal path silently reports "no conflicts", which would fail OPEN.
// (GLM 5.3, hostile round 8, A1.)
const CONFLICTED = (() => {
  if (!MERGE_IN_PROGRESS) return new Set();
  const dir = gitOut(['rev-parse', '--git-dir']);
  if (!dir) return null; // unknown => treat every path as conflicted (fail CLOSED)
  let text = '';
  try {
    text = readFileSync(`${dir}/MERGE_MSG`, 'utf8');
  } catch {
    // git writes MERGE_MSG for EVERY merge, conflicted or clean — verified, not assumed.
    // So during a merge its absence is an anomaly, not "no conflicts", and reading it as the
    // latter would silently exempt every path. Unknown => fail CLOSED.
    return null;
  }
  const out = new Set();
  let inBlock = false;
  for (const line of text.split('\n')) {
    if (/^#\s*Conflicts:/.test(line)) { inBlock = true; continue; }
    if (!inBlock) continue;
    const m = /^#\s+(.+?)\s*$/.exec(line);
    if (m) out.add(m[1]); else if (line.trim() === '' || !line.startsWith('#')) inBlock = false;
  }
  return out;
})();

function verbatimCarryFrom(file) {
  if (!MERGE_IN_PROGRESS) return null;
  // fail CLOSED: null means we could not determine the conflict set
  if (CONFLICTED === null || CONFLICTED.has(file)) return null;
  const staged = (gitOut(['ls-files', '-s', '--', file]) || '').match(/^\d+\s+([0-9a-f]{40})\s/);
  const main = gitOut(['rev-parse', `origin/main:${file}`]);
  if (!staged || !main || staged[1] !== main) return null;
  return { staged: staged[1], main };
}

const exempted = [];
function checkedStagedFiles() {
  return stagedFiles().filter((f) => {
    const carry = verbatimCarryFrom(f);
    if (!carry) return true;
    exempted.push(`  X1 verbatim-carry exempt — ${f} — staged ${carry.staged} == origin/main ${carry.main}`);
    return false;
  });
}

const targets = STAGED
  ? checkedStagedFiles().map((f) => ({ file: f, text: stagedContent(f) }))
  : fileArgs.filter((f) => existsSync(f)).map((f) => ({ file: f, text: readFileSync(f, 'utf8') }));

if (exempted.length) {
  console.error(`[frontend-guards] ${exempted.length} path(s) exempt as verbatim carries from origin/main during a merge:`);
  exempted.forEach((e) => console.error(e));
}

const GALAXY = /#0a0a1a|#00FFFF|#7851A9/i;
const MUI = /from\s+['"]@mui\/|require\(\s*['"]@mui\//;
const RECHARTS = /from\s+['"]recharts['"]|require\(\s*['"]recharts['"]\)/;
// hex literal NOT preceded by ", #" fallback position of var(--x, #hex) and not var-adjacent
const HEX = /#[0-9a-fA-F]{3,8}\b/g;
const VAR_FALLBACK = /var\(\s*--[\w-]+\s*,\s*#[0-9a-fA-F]{3,8}\s*\)/;

// Test files (class-targeted, Rule 73): contract/theme tests legitimately contain banned
// hexes AS BAN-LIST DATA — G3/G4 skip them; G1/G2 (imports) still apply everywhere.
const TEST_FILE = /\.test\.|\.spec\.|__tests__\//;

const failures = [];
const warnings = [];
for (const { file, text } of targets) {
  const isTestFile = TEST_FILE.test(file);
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    const loc = `${file}:${i + 1}`;
    if (MUI.test(line)) failures.push(`FAIL: G1 no-MUI (Rule 1) — ${loc} — use styled-components; @mui/* is banned`);
    if (RECHARTS.test(line)) failures.push(`FAIL: G2 no-recharts (Rule 10) — ${loc} — use Victory for all new charts`);
    if (isTestFile) return; // G3/G4 exempt: hex literals in tests are assertions, not styling
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

  if (isTestFile) continue;

  // G5 — Rule 43: a SHARED style fragment that interpolates MUST be css`` tagged.
  // A plain template string calls toString() on keyframes/helpers and bakes the generated
  // class name into the output, crashing styled-components at mount with error #12.
  // The build passes, types pass, nothing warns at dev time — it only dies in the browser.
  // Incident 2026-04-12: AdminOverviewPanel's bentoItemAnimation took down the whole
  // admin dashboard exactly this way. This is the one guard whose absence costs a
  // production outage rather than a lint nag, which is why it is worth an AST-ish check.
  //
  // NARROWED after a live false positive (CrystallizeOverlay.tsx, 2026-08-18): that file
  // deliberately exports raw CSS *text* for a test gate and interpolates a NUMBER. Rule 43's
  // hazard is not interpolation per se — it is interpolating a styled-components PRIMITIVE
  // (a keyframes/css object) whose toString() bakes the generated class name in. Interpolating
  // a number or a plain string is harmless. So: only flag when the fragment interpolates an
  // identifier that this same file defines via keyframes``/css``/styled — the shape that
  // actually crashes. Opt out on a genuine exception with `swan-guard-allow-template`.
  const PRIMITIVES = new Set(
    // GLM H1-2.2: no word boundary meant `css` matched the PREFIX of `cssValue(16)`, so a
    // plain helper's result was treated as a primitive and its consumers false-positived.
    // `\b` still matches css` because word→backtick is a boundary.
    [...text.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:(?:keyframes|css)\b|styled[.(])/g)]
      .map((m) => m[1]),
  );

  // FALSE NEGATIVE found by self-review 2026-08-18, and it was the WORSE one: shared
  // animations normally live in their own module and are IMPORTED, which is the most likely
  // real shape of the bug G5 exists to catch — and it sailed straight through, because
  // same-file detection cannot see it. Resolve relative imports one level and look for the
  // primitive there. Cross-file is the only way to tell `${fadeIn}` (imported keyframes,
  // bakes a class name) apart from `${SOME_Z_INDEX}` (imported number, harmless).
  for (const imp of text.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"](\.[^'"]+)['"]/g)) {
    const names = imp[1].split(',').map((n) => n.trim().split(/\s+as\s+/).pop().trim()).filter(Boolean);
    const spec = imp[2];
    const base = resolvePath(dirname(file), spec);
    const candidates = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '']
      .map((ext) => `${base}${ext}`);
    const hit = candidates.find((c) => existsSync(c) && statSync(c).isFile());
    if (!hit) continue;
    let src = '';
    try { src = readFileSync(hit, 'utf8'); } catch { continue; }
    const exported = new Set(
      [...src.matchAll(/export\s+const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:keyframes|css|styled[.(])/g)]
        .map((m) => m[1]),
    );
    for (const n of names) if (exported.has(n)) PRIMITIVES.add(n);
  }

  // Scope deliberately narrow to keep false positives at zero: only EXPORTED module-level
  // `const NAME = ` + backtick, containing ${...}, not already css/styled/keyframes/createGlobalStyle
  // tagged. A non-exported local is not a shared fragment and is not our business.
  // GLM H1-2.3/2.4, corrected on verification. GLM's stated shape (`export const cssText =`)
  // was DISPROVEN — that matches fine. But probing around it found three REAL escapes:
  //   export const x = cssText`...`      -> tag alternation half-matched then failed: NO match
  //   export const y = keyframesFor`...` -> same
  //   export default `...`               -> never matched ^export const at all (2.4)
  // So: capture ANY tag identifier, and exempt only tags we positively recognise as safe.
  // An unknown tag gets scanned — for a rule whose failure mode is a production mount
  // crash, reviewing an unfamiliar tag is the cheaper error.
  // ANCHORED. The unanchored version matched `cssText` as a prefix and exempted the exact
  // shape this fix exists to catch — the same prefix-match bug fixed 20 lines above, made
  // twice in one file. `styled` keeps a prefix form because `styled.div` / `styled(X)` are
  // legitimately tagged.
  const SAFE_TAG = /^(?:css|keyframes|createGlobalStyle)$|^styled[.(]/;
  const SHARED_FRAGMENT = /^\s*export\s+(?:default\s*|const\s+([A-Za-z_$][\w$]*)\s*=\s*)(styled[.(][\w.$'"()]*|[A-Za-z_$][\w$]*)?\s*`/gm;
  for (const m of text.matchAll(SHARED_FRAGMENT)) {
    const [, rawName, tag] = m;
    const name = rawName || '(default export)';
    if (tag && SAFE_TAG.test(tag)) continue; // css`` / styled`` / keyframes`` — safe by construction
    // Does THIS template literal interpolate? Read to its closing backtick.
    const start = m.index + m[0].length - 1;
    let i = start + 1;
    let depth = 0;
    let braces = 0;
    let expr = '';
    const exprs = [];
    while (i < text.length) {
      const c = text[i];
      if (c === '\\') { i += 2; continue; }
      if (c === '$' && text[i + 1] === '{') { depth += 1; i += 2; expr = ''; continue; }
      // GLM H1-2.5: a quoted `}` inside an interpolation — `${map['}']}` — desynchronised
      // the scanner and could terminate the file scan early, hiding every later fragment.
      // Skip over quoted spans while inside an interpolation.
      if (depth > 0 && (c === "'" || c === '"')) {
        const quote = c; expr += c; i += 1;
        while (i < text.length && text[i] !== quote) {
          if (text[i] === '\\') { expr += text.slice(i, i + 2); i += 2; continue; }
          expr += text[i]; i += 1;
        }
        expr += text[i] ?? ''; i += 1; continue;
      }
      // GLM H2-7: the H1-2.5 fix closed QUOTES but not BRACES. An object literal inside an
      // interpolation — `${fn({ a: 1 }) && g}` — let its own `}` close the interpolation
      // early; the scan then truncated and identifiers after the brace were never read.
      // Track nested braces so only the matching one closes the interpolation.
      if (depth > 0 && c === '{') { braces += 1; expr += c; i += 1; continue; }
      if (depth > 0 && c === '}' && braces > 0) { braces -= 1; expr += c; i += 1; continue; }
      if (depth > 0 && c === '}') { depth -= 1; if (depth === 0) exprs.push(expr); i += 1; continue; }
      if (depth > 0) { expr += c; i += 1; continue; }
      if (c === '`') break;
      i += 1;
    }
    // Only a styled-components primitive baked into a plain string causes error #12.
    const bakes = exprs.some((e) => [...e.matchAll(/[A-Za-z_$][\w$]*/g)].some((id) => PRIMITIVES.has(id[0])));
    if (!bakes) continue;
    const line = text.slice(0, m.index).split('\n').length;
    if (/swan-guard-allow-template/.test(text.split('\n').slice(Math.max(0, line - 3), line).join('\n'))) continue;
    failures.push(
      `FAIL: G5 css-helper-required (Rule 43) — ${file}:${line} — exported fragment "${name}" `
      + 'interpolates ${...} in a PLAIN template string. Wrap it with the styled-components '
      + '`css` helper or it bakes a class name in and crashes at mount (error #12).',
    );
  }

  // G6 — Rule 4: max 300 lines per file. Reported once per file, not per line.
  // VENDORED/reference material is excluded: `assets/**/dashboard-export/**` is a copied
  // design reference pack, not live code, and linting it is pure noise (2 of 4 hits on the
  // first 250-file sample were exactly that). Legacy files you merely touched can opt out
  // with `swan-guard-allow-long-file` — Rule 34 says pre-existing debt is not a blocker you
  // inherit by editing one line of it.
  const VENDORED = /(^|\/)(dashboard-export|reference-pack|production-context|vendor|third[-_]party)\//;
  const loc300 = lines.length;
  if (!VENDORED.test(file) && !/swan-guard-allow-long-file/.test(text) && loc300 > 300) {
    // ADVISORY, not a failure. A 250-file sample found 31 pre-existing files over the cap;
    // making this hard-fail would block any commit that touches one line of legacy debt the
    // author did not create (Rule 34), and a guard that blocks unfairly is a guard that gets
    // disabled. It reports every time so the debt stays visible and never silently grows.
    warnings.push(
      `WARN: G6 file-max-lines (Rule 4) — ${file} — ${loc300} lines exceeds the 300 cap; `
      + 'extract hooks, utils, styles, or types when you next work in here.',
    );
  }
}

if (warnings.length) warnings.forEach((w) => console.error(w));
if (failures.length) {
  failures.forEach((f) => console.error(f));
  console.error(`\n[frontend-guards] ${failures.length} violation(s) in ${targets.length} file(s). CLAUDE.md rules 1/6/10 + retired-palette are enforced mechanically (SWA-32 Slice 0).`);
  process.exit(1);
}
console.log(`[frontend-guards] CLEAN — ${targets.length} frontend file(s) checked (G1 MUI, G2 recharts, G3 Galaxy palette, G4 raw hex, G5 css-helper, G6 300-line cap).`);
process.exit(0);
