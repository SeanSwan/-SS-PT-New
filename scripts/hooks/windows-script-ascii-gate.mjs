/**
 * windows-script-ascii-gate.mjs — non-ASCII in a Windows script is a parse error waiting to happen.
 *
 * WHY THIS EXISTS (four incidents, one cause, 2026-08-31 and 2026-09-01):
 *   1. `Swan Local Video 5090.cmd` — an em dash in a workflow FILENAME became `ΓÇö` under CMD code
 *      page 437, so the launcher reported a file missing that was sitting right there.
 *   2. `Install-VideoUpscale.ps1` — em dashes in comments made PowerShell read a `"` as unterminated.
 *   3. `Install-Krea2.ps1` — same, same day.
 *   4. `ollama-firewall-fix.ps1` — `Write-Host "... — type 'done' in chat."` failed to parse, so a
 *      SECURITY fix silently did not run. Sean pasted the command, saw a parse error, and the
 *      firewall stayed open. That is the one that decided this should be a mechanism.
 *
 * The failure is nasty because it is not a runtime bug you can catch by testing the logic: the file
 * never parses, so nothing runs, and the error points at a quote several characters away from the
 * real culprit. Prose ("remember to use ASCII") demonstrably did not hold — it was written into the
 * launcher's own header comment and then violated three more times.
 *
 * SCOPE: staged .ps1 / .cmd / .bat only. Content and filename are both checked, because incident 1
 * was the filename.
 *
 * ESCAPE HATCH: a file may carry `swan-guard-allow-unicode` in its first 40 lines. That is for a
 * script that genuinely must emit a non-ASCII character; it is deliberate and greppable.
 *
 * Usage: node scripts/hooks/windows-script-ascii-gate.mjs --staged
 *        node scripts/hooks/windows-script-ascii-gate.mjs --file <path>...
 * Exit 0 = clean · 1 = violations · 2 = usage error.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, statSync } from 'node:fs';

const WINDOWS_SCRIPT = /\.(ps1|cmd|bat)$/i;
const OPT_OUT = 'swan-guard-allow-unicode';

/** Common smart-punctuation offenders, with the ASCII a script actually wants. */
const SUGGEST = {
  '—': '--', '–': '-', '‘': "'", '’': "'",
  '“': '"', '”': '"', '…': '...', '×': 'x',
  '→': '->', '≥': '>=', '≤': '<=', ' ': ' (non-breaking space)',
};

const describe = (ch) => {
  const hex = ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
  const fix = SUGGEST[ch];
  return `U+${hex} ${JSON.stringify(ch)}${fix ? ` -> use ${JSON.stringify(fix)}` : ''}`;
};

/** @returns {{file:string, line:number, col:number, detail:string}[]} */
export function scanText(file, text) {
  const out = [];
  const lines = text.split(/\r?\n/);
  const head = lines.slice(0, 40).join('\n');
  if (head.includes(OPT_OUT)) return out;

  lines.forEach((line, i) => {
    [...line].forEach((ch, col) => {
      if (ch.codePointAt(0) > 127) {
        out.push({ file, line: i + 1, col: col + 1, detail: describe(ch) });
      }
    });
  });
  return out;
}

/** The filename itself matters — incident 1 was a workflow file whose NAME broke a CMD check. */
export function scanName(file) {
  const bad = [...file].filter((c) => c.codePointAt(0) > 127);
  return bad.length
    ? [{ file, line: 0, col: 0, detail: `FILENAME contains ${describe(bad[0])}` }]
    : [];
}

function stagedFiles() {
  const out = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], {
    encoding: 'utf8',
  });
  return out.split('\n').map((s) => s.trim()).filter(Boolean);
}

function main() {
  const args = process.argv.slice(2);
  let files;
  if (args[0] === '--staged') files = stagedFiles();
  else if (args[0] === '--file') files = args.slice(1);
  else {
    console.error('usage: windows-script-ascii-gate.mjs --staged | --file <path>...');
    process.exit(2);
  }

  const targets = files.filter((f) => WINDOWS_SCRIPT.test(f));
  if (targets.length === 0) {
    console.log('[windows-ascii] no staged Windows scripts — SKIP');
    process.exit(0);
  }

  const findings = [];
  for (const f of targets) {
    findings.push(...scanName(f));
    if (!existsSync(f) || !statSync(f).isFile()) continue;
    // Read as UTF-8 so the message can name the actual character and suggest the ASCII to use
    // ("U+2014 em dash -> use --"), which is what makes the failure fixable in one glance.
    // Fall back to latin1 for a file that is not valid UTF-8 — there the bytes are still caught,
    // just reported per byte.
    const utf8 = readFileSync(f, 'utf8');
    const hits = scanText(f, utf8);
    findings.push(...(hits.length ? hits : scanText(f, readFileSync(f, 'latin1'))));
  }

  if (findings.length === 0) {
    console.log(`[windows-ascii] CLEAN — ${targets.length} Windows script(s) are ASCII-only.`);
    process.exit(0);
  }

  console.error('');
  console.error('  WINDOWS SCRIPT ASCII GATE — non-ASCII will break this file before it runs.');
  console.error('');
  for (const f of findings.slice(0, 25)) {
    const where = f.line ? `${f.file}:${f.line}:${f.col}` : f.file;
    console.error(`    ${where}  ${f.detail}`);
  }
  if (findings.length > 25) console.error(`    ... and ${findings.length - 25} more`);
  console.error('');
  console.error('  PowerShell mis-parses smart quotes/dashes as string terminators, and CMD under');
  console.error('  code page 437 turns an em dash into three bytes. The file never parses, so');
  console.error('  nothing runs — a security fix silently did not execute this way on 2026-09-01.');
  console.error('');
  console.error('  FIX: replace them with ASCII (-- for an em dash, straight quotes).');
  console.error(`  Deliberate exception: put ${OPT_OUT} in the first 40 lines.`);
  console.error('');
  process.exit(1);
}

const isMain = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, '/')}`).href;
if (isMain || process.argv.includes('--staged') || process.argv.includes('--file')) main();
