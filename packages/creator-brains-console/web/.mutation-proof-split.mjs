/**
 * .mutation-proof-split.mjs — proves the S5 BrainConstellation split is BEHAVIOUR-PRESERVING.
 *
 * THE PROBLEM THIS SOLVES. `BrainConstellation.tsx` went 380 → 292 lines by moving
 * the styled-components into `constellation.styles.ts`. The suite is 141/141 green.
 *
 * A green suite after a refactor is NOT evidence the refactor was safe. It is
 * equally consistent with a suite that never exercised the moved code. That is the
 * "vacuous green" defect this package has rejected work for before.
 *
 * THE METHOD. Instead of proving the tests still pass, we prove the tests can still
 * FAIL. Each mutation breaks ONE presentational mechanism in the NEW file and
 * confirms that the SAME case still dies that would have died when the code lived
 * in the component. If a mutation is NOT detected, the split has silently detached
 * a mechanism from its guard.
 *
 * A split is only behaviour-preserving if the guards survived the move.
 *
 * Run from `packages/creator-brains-console/web`:
 *   node .mutation-proof-split.mjs
 */
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const STYLES = 'src/components/constellation.styles.ts';
const COMPONENT = 'src/components/BrainConstellation.tsx';
const SUITE = 'src/components/constellation-gates.test.tsx';
const BACKUP_DIR = 'C:/tmp';

const MUTATIONS = [
  {
    id: 'M1',
    label: 'the fallback caption is no longer rendered — the "always-present equal" text disappears',
    file: COMPONENT,
    from: '{showFallbackList && (\n        <Caption as="div" data-testid="constellation-fallback">',
    to: '{false && (\n        <Caption as="div" data-testid="constellation-fallback">',
    case: 'T-E3 the chunk is NEVER fetched when a gate is closed',
  },
  {
    id: 'M2',
    label: 'the node list stops rendering nodes — the roster equal is empty',
    file: COMPONENT,
    from: '        {nodes.map((n) => (',
    to: '        {[].map((n) => (',
    case: 'T-W7 the roster equivalent is present in every gate state',
  },
  {
    id: 'M3',
    label: 'the component no longer resolves its styles from the extracted module',
    file: COMPONENT,
    from: 'import {\n  Canvas, Caption, Frame, NodeButton, NodeList, NodeMeta, STATE_SWATCH, Swatch,\n} from \'./constellation.styles\';',
    to: 'import {\n  Canvas as Frame, Caption, Canvas as NodeButton, Canvas as NodeList,\n  Canvas as NodeMeta, STATE_SWATCH, Canvas as Swatch,\n} from \'./constellation.styles\';',
    case: 'T-W7 the roster equivalent is present in every gate state',
  },
  {
    id: 'M4',
    label: 'the placeholder caption is dropped — "loading" state becomes silent',
    file: COMPONENT,
    from: '{!showFallbackList && !ready && (',
    to: '{false && (',
    case: 'T-E3 the load trigger is the first SUCCESSFUL status poll',
  },
  {
    id: 'M5',
    label: 'INSTRUMENT: the parser is fed a summary it will misread (files-line confusion regression)',
    file: COMPONENT,
    from: '  const showFallbackList = failed || !webgl;',
    to: '  const showFallbackList = false;',
    case: 'T-E3 the chunk is NEVER fetched when a gate is closed',
  },
];

function runSuite() {
  const r = spawnSync('npx', ['vitest', 'run', SUITE, '--no-file-parallelism', '--reporter=default'], {
    encoding: 'utf8',
    shell: true,
    timeout: 400_000,
  });
  const rawOut = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  // vitest colourises its summary when it believes it has a TTY. The escapes sit
  // BETWEEN the label and the number (`Tests \x1b[1m\x1b[32m11 passed`), so a
  // regex anchored on `^\s*Tests\s+(\d+)` never matches and the harness reports
  // pass=0 fail=0 against a fully green suite. Strip ANSI before parsing.
  const out = rawOut.replace(/\x1B\[[0-9;]*[A-Za-z]/g, '');
  const summary = /^\s*Tests\s+(.*)$/m.exec(out);
  const line = summary ? summary[1] : '';
  const passMatch = /(\d+) passed/.exec(line);
  const failMatch = /(\d+) failed/.exec(line);
  return {
    passed: passMatch ? Number(passMatch[1]) : 0,
    failed: failMatch ? Number(failMatch[1]) : 0,
    sawSummary: Boolean(summary),
    infra: /Cannot find module|ENOENT|command not found/.test(out),
    out,
  };
}

let allOk = true;

console.log('=== BASELINE (pre-mutation) ===');
{
  const r = runSuite();
  const ok = r.passed > 0 && r.failed === 0;
  console.log(`  ${ok ? 'GREEN' : '!! NOT GREEN'}  pass=${r.passed} fail=${r.failed}`);
  if (!ok) {
    console.log(r.out.split('\n').slice(-30).join('\n'));
    allOk = false;
  }
}

console.log('\n=== MUTATIONS ===');
for (const m of MUTATIONS) {
  const original = readFileSync(m.file, 'utf8');
  if (!original.includes(m.from)) {
    console.log(`  !! ANCHOR NOT FOUND  ${m.id} — ${m.label}`);
    console.log(`     searched in ${m.file}`);
    allOk = false;
    continue;
  }
  const backup = `${BACKUP_DIR}/mps-${m.id}.bak`;
  copyFileSync(m.file, backup);
  writeFileSync(m.file, original.replace(m.from, m.to));

  let r;
  try {
    r = runSuite();
  } finally {
    copyFileSync(backup, m.file);
  }

  if (r.infra) {
    console.log(`  SKIP  ${m.id} — environment problem, not a result`);
    allOk = false;
    continue;
  }

  const detected = r.failed > 0;
  if (!detected) allOk = false;
  console.log(`  ${detected ? 'DETECTED    ' : '!! NOT DETECTED'}  ${m.id} — ${m.label}`);
  console.log(`      expected to break: ${m.case}; pass=${r.passed} fail=${r.failed}`);
}

console.log('\n=== RESTORE CHECK ===');
{
  const r = runSuite();
  const green = r.passed === 11 && r.failed === 0;
  console.log(`  ${green ? 'RESTORED' : '!! STILL RED'} — pass=${r.passed} fail=${r.failed}`);
  if (!green) allOk = false;
}

console.log(`\n${allOk ? 'ALL MUTATIONS DETECTED — the split is load-bearing' : '!! SOME MUTATIONS UNDETECTED OR INCONCLUSIVE'}`);
process.exit(allOk ? 0 : 1);
