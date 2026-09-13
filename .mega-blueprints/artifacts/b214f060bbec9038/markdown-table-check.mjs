/**
 * FILE: markdown-table-check.mjs
 * WHY:  This packet's authoritative artifacts are markdown TABLES, and two classes of defect in them
 *       are invisible to every other gate in the packet — they are not source code, so tsc, vitest,
 *       the boot gate, the drift audit and the preflight never look at them. Both classes SILENTLY
 *       LOSE CONTENT when the file is rendered, which is the worst kind of documentation defect: the
 *       text is present in the file a reviewer greps, and absent from the page a reader reads.
 *
 *   1. A row with MORE cells than the header. GitHub-flavoured markdown does not error — it DROPS the
 *      excess cells. Found here: the receipt's `Frontend type-check` row carried a fourth cell holding
 *      the entire "why the explicit tsc path and the memory flag are both load-bearing" explanation.
 *      It had never rendered.
 *   2. An UNESCAPED pipe inside a code span. Backticks do not protect it: `a|b|c` still delimits
 *      cells, so the row splits and everything after the pipe becomes excess (see 1). Found here: the
 *      boot-gate row's gate filter list, written as `.mjs|cjs|js`.
 *
 * ALSO ITS OWN LESSON, because the first version of this check was wrong the same way the code under
 * review kept being wrong: it counted EVERY pipe, so it reported four false positives on rows that
 * use the correct `\|` escape, drowning the three real defects in noise. An escaped pipe must be
 * counted as text. A checker that cannot tell the fix from the defect is not a checker.
 *
 * WHAT IT DOES NOT DO: it does not validate prose, links, code fences or heading structure, and it
 * assumes each contiguous run of `|` lines is one table with the FIRST row as its column count. A
 * table that begins after a blank line but shares a run with prose will be reported, not silently
 * skipped — a loud false positive is preferable to a quiet miss here.
 *
 * Run: `node .mega-blueprints/artifacts/<id>/markdown-table-check.mjs [dir]`
 */
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const dir = process.argv[2] ?? path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));

/** Count pipes that actually delimit cells: a pipe preceded by a backslash is literal text. */
const delimitingPipes = (line) => {
  let count = 0;
  for (let i = 0; i < line.length; i += 1) {
    if (line[i] !== '|') continue;
    if (i > 0 && line[i - 1] === '\\') continue;
    count += 1;
  }
  return count;
};

const files = readdirSync(dir).filter((name) => name.endsWith('.md')).sort();
let totalProblems = 0;
const summary = [];

for (const name of files) {
  const lines = readFileSync(path.join(dir, name), 'utf8').split(/\r?\n/);
  const problems = [];
  let run = [];
  const flush = () => {
    // A one-line run is not a table (a row needs a delimiter line beneath the header).
    if (run.length >= 2) {
      const expected = run[0].pipes; // the header decides the column count
      for (const row of run.slice(1)) {
        if (row.pipes === expected) continue;
        const kind = row.pipes > expected
          ? `EXCESS CELLS — ${row.pipes - expected} extra, DROPPED when rendered`
          : `SHORT ROW — ${expected - row.pipes} missing, padded when rendered`;
        problems.push({ line: row.line, kind, text: row.text.slice(0, 90) });
      }
    }
    run = [];
  };
  lines.forEach((text, index) => {
    if (/^\s*\|/.test(text)) {
      run.push({ line: index + 1, pipes: delimitingPipes(text.trim()), text: text.trim() });
    } else {
      flush();
    }
  });
  flush();

  if (problems.length > 0) {
    totalProblems += problems.length;
    console.log(`\n${name}: ${problems.length} problem row(s)`);
    for (const p of problems) console.log(`  line ${p.line} [${p.kind}]\n    ${p.text}`);
  } else {
    summary.push(name);
  }
}

console.log(`\nfiles checked          : ${files.length}`);
console.log(`files with clean tables: ${summary.length}`);
console.log(`PROBLEM ROWS           : ${totalProblems}`);
console.log(totalProblems === 0 ? 'MARKDOWN_TABLES_OK' : 'MARKDOWN_TABLES_FAILED');
process.exit(totalProblems === 0 ? 0 : 1);
