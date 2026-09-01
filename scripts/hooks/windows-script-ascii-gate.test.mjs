/**
 * windows-script-ascii-gate.test.mjs
 *
 *   node scripts/hooks/windows-script-ascii-gate.test.mjs
 *
 * Built on NEGATIVE controls. A guard that cannot fail is decoration, and this guard exists
 * precisely because four Windows scripts shipped broken while a prose rule said not to. So every
 * check here asserts the guard REJECTS something, and the clean cases exist only to prove it does
 * not reject everything.
 */
import { scanText, scanName } from './windows-script-ascii-gate.mjs';

let failed = 0;
const check = (name, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
  if (!ok) failed++;
};

console.log('\nIt catches the exact characters that broke real scripts:');
const cases = [
  ['em dash (broke ollama-firewall-fix.ps1)', 'Write-Host "done — ok"', '--'],
  ['en dash', 'Write-Host "a – b"', '-'],
  ['curly apostrophe', "Write-Host 'it’s'", "'"],
  ['smart double quote', 'Write-Host “hi”', '"'],
  ['ellipsis', 'Write-Host "wait…"', '...'],
  ['non-breaking space', 'Write-Host "a b"', null],
];
for (const [label, text, suggestion] of cases) {
  const hits = scanText('x.ps1', text);
  check(`rejects ${label}`, hits.length >= 1, hits[0]?.detail ?? 'NOT CAUGHT');
  if (suggestion) {
    check(`  ...and suggests ${JSON.stringify(suggestion)}`, hits[0]?.detail.includes(suggestion));
  }
}

console.log('\nIt reports WHERE, because the parse error points somewhere else entirely:');
const multi = scanText('x.ps1', 'line one\nline two — here\nline three');
check('line number is the offending line', multi[0]?.line === 2, `line ${multi[0]?.line}`);
// Counted, not guessed: "line two - here" puts the dash at index 9, so 1-based column 10.
const expectedCol = 'line two '.length + 1;
check('column is the offending character', multi[0]?.col === expectedCol, `col ${multi[0]?.col} (expected ${expectedCol})`);

console.log('\nThe FILENAME is checked too — incident 1 was a name, not contents:');
check('rejects a non-ASCII filename', scanName('00 SWAN — Text to Video.json').length === 1);
check('accepts an ASCII filename', scanName('01 SWAN - First + Last Frame.json').length === 0);

console.log('\nIt does not reject clean scripts (or it would just be turned off):');
check('plain ASCII passes', scanText('x.ps1', 'Write-Host "done -- ok"\n$a = 1').length === 0);
check('ASCII punctuation passes', scanText('x.ps1', "if ($x -eq 'a') { Write-Host \"b\" }").length === 0);
check('an empty file passes', scanText('x.ps1', '').length === 0);

console.log('\nThe opt-out is honoured, and only in the header:');
const optOutHead = '# swan-guard-allow-unicode\nWrite-Host "—"';
check('opt-out in the first 40 lines suppresses', scanText('x.ps1', optOutHead).length === 0);
const optOutLate = Array(45).fill('# filler').join('\n') + '\n# swan-guard-allow-unicode\nWrite-Host "—"';
check('opt-out BELOW line 40 does NOT suppress (it must be visible at the top)',
  scanText('x.ps1', optOutLate).length >= 1);

console.log('\nEvery offender is reported, not just the first:');
check('three offenders -> three findings', scanText('x.ps1', '—–…').length === 3);

console.log(failed ? `\n${failed} CHECK(S) FAILED\n` : '\nALL CHECKS PASS\n');
process.exit(failed ? 1 : 0);
