/**
 * mutation-harness.mjs — does that assertion actually guard anything?
 * ===================================================================
 *
 * WHY THIS EXISTS
 * ---------------
 * A green test proves the code passes. It does not prove the test would notice if the code
 * were wrong. Across two sessions on the Swan Coach authorization lane, SIX assertions were
 * found to be unfalsifiable — a regex window that spilled past its function, a negative
 * matching one spelling, three drafts of a single-use check that each matched a different
 * branch, a fail-closed catch nothing ever made throw. Not one was caught by reading. Every
 * one was caught by breaking the code and watching the suite stay green.
 *
 * So: break the code on purpose, run the suite, and require it to fail.
 *
 * USAGE
 *   node scripts/mutation-harness.mjs backend/tests/mutations/ownership.mutations.mjs
 *
 * The module must default-export `{ cwd, suites, mutations }`:
 *   cwd        directory to run the test command in
 *   suites     array of test file paths passed to vitest
 *   mutations  array of { id, file, find, replace } — or { id, parts: [...] } for a
 *              mutation that must change several files at once
 *
 * EXIT CODES
 *   0  every mutation fired
 *   1  at least one SURVIVED, or a file did not restore byte-identically
 *   2  refused to run (a bad anchor); nothing was modified
 *
 * THREE OUTCOMES, NOT TWO — this is the part that matters
 * -------------------------------------------------------
 *   FIRED     the suite failed. The assertion guarding this line can fail. Good.
 *   SURVIVED  the suite passed with the code broken. That assertion guards nothing.
 *   ANCHOR    the anchor matched zero or several times, so nothing was mutated.
 *
 * A harness that collapses ANCHOR into SURVIVED sends you to rewrite tests that were fine.
 * Keeping them apart is why the CRLF trap below was ever diagnosed instead of mis-blamed.
 *
 * THE ANCHOR RULE, WHICH COST NINE OCCURRENCES ACROSS FIVE SESSIONS TO STATE PRECISELY
 * ------------------------------------------------------------------------------------
 * These sources are CRLF. An anchor is a literal string, so a newline INSIDE one cannot
 * match: the file has a `\r` there that the anchor lacks. A LEADING newline is fine — it
 * matches the `\n` half of a `\r\n` and usefully anchors the start of a line.
 *
 * Every write-up of this trap said "watch out for escaping". None said that. The guard
 * below refuses interior newlines and was what finally made the distinction visible, by
 * flagging two anchors that were working and forcing the question of why.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const sha = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');

/** Normalise every mutation to a list of {file, find, replace} parts. */
const partsOf = (m) => (m.parts ? m.parts : [{ file: m.file, find: m.find, replace: m.replace }]);

/**
 * Reject anchors that cannot match before touching anything.
 * @returns {string[]} mutation ids with an unusable anchor
 */
export function unusableAnchors(mutations) {
  const bad = [];
  for (const m of mutations) {
    for (const p of partsOf(m)) {
      if (typeof p.find !== 'string' || typeof p.replace !== 'string') bad.push(`${m.id} (not a string)`);
      else if (p.find.indexOf('\n', 1) !== -1) bad.push(`${m.id} (anchor spans a line break)`);
    }
  }
  return bad;
}

function runSuite(cwd, suites) {
  try {
    execFileSync('npx', ['vitest', 'run', ...suites], {
      cwd, stdio: 'pipe', shell: true, timeout: 600000,
    });
    return { failed: false, out: '' };
  } catch (err) {
    return { failed: true, out: String(err.stdout || '') + String(err.stderr || '') };
  }
}

/**
 * Apply each mutation, run the suite, restore, and report.
 * @param {{cwd: string, suites: string[], mutations: object[]}} config
 * @param {(line: string) => void} [log]
 * @returns {{results: object[], fired: number, clean: boolean}}
 */
export function runMutations(config, log = console.log) {
  const { cwd, suites, mutations } = config;
  const resolve = (file) => path.resolve(cwd, file);

  const baseline = new Map();
  for (const m of mutations) {
    for (const p of partsOf(m)) {
      const abs = resolve(p.file);
      if (!baseline.has(abs)) baseline.set(abs, sha(abs));
    }
  }

  // The unmutated suite must PASS, or every "FIRED" below is meaningless — a suite that is
  // already red fails for each mutation regardless of what the mutation did.
  log('baseline (unmutated):');
  const base = runSuite(cwd, suites);
  if (base.failed) {
    log('  FAILS — fix the suite before mutating. Nothing was modified.');
    log(base.out.slice(-2000));
    return { results: [], fired: 0, clean: false };
  }
  log('  passes\n');

  const results = [];
  for (const m of mutations) {
    const parts = partsOf(m).map((p) => ({ ...p, abs: resolve(p.file) }));
    const originals = parts.map((p) => readFileSync(p.abs, 'utf8'));

    const badIndex = parts.findIndex((p, i) => originals[i].split(p.find).length - 1 !== 1);
    if (badIndex !== -1) {
      const count = originals[badIndex].split(parts[badIndex].find).length - 1;
      results.push({ id: m.id, status: 'ANCHOR', detail: `matched ${count}x in ${parts[badIndex].file}` });
      log(`ANCHOR   ${m.id} — matched ${count}x, not mutated`);
      continue;
    }

    parts.forEach((p, i) => writeFileSync(p.abs, originals[i].replace(p.find, p.replace)));
    const run = runSuite(cwd, suites);
    parts.forEach((p, i) => writeFileSync(p.abs, originals[i]));

    const restored = parts.every((p) => sha(p.abs) === baseline.get(p.abs));
    const status = run.failed ? 'FIRED' : 'SURVIVED';
    results.push({ id: m.id, status, restored });
    log(`${status.padEnd(8)} ${restored ? '' : '[RESTORE MISMATCH] '}${m.id}`);
  }

  const fired = results.filter((r) => r.status === 'FIRED').length;
  const clean = fired === mutations.length && results.every((r) => r.restored !== false);
  return { results, fired, clean };
}

async function main() {
  const configPath = process.argv[2];
  if (!configPath) {
    console.error('usage: node scripts/mutation-harness.mjs <mutations-module>');
    process.exit(2);
  }
  const mod = await import(new URL(`file://${path.resolve(configPath)}`).href);
  const config = mod.default;

  const bad = unusableAnchors(config.mutations);
  if (bad.length) {
    console.error('REFUSING TO RUN — these anchors cannot match:');
    for (const id of bad) console.error(`  ${id}`);
    console.error('A LEADING newline is allowed. Anywhere else, use a single line —');
    console.error('leading indentation usually makes it unique. Nothing was modified.');
    process.exit(2);
  }

  const { results, fired, clean } = runMutations(config, console.log);
  console.log(`\n${fired}/${config.mutations.length} fired`);
  for (const r of results) {
    if (r.status !== 'FIRED') console.log(`  !! ${r.id}: ${r.status}${r.detail ? ` — ${r.detail}` : ''}`);
    if (r.restored === false) console.log(`  !! RESTORE MISMATCH: ${r.id}`);
  }
  process.exit(clean ? 0 : 1);
}

if (import.meta.url === new URL(`file://${path.resolve(process.argv[1] || '')}`).href) {
  await main();
}
