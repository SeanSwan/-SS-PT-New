/**
 * R7-08 live probe: does the SHIPPED composition launch vitest for a Node-only --file?
 *
 * The CLI cannot be imported (it runs main() at import time) and no cluster is reachable on 55433,
 * so this drives the SHIPPED `runPlan` + the SHIPPED `runCoachSequence` with the remaining
 * dependencies stubbed, and records what the vitest phase WOULD have executed. Before the fix this
 * prints a `npx vitest run ... <node-suite>` line for case 2; after it, none.
 */
import { runPlan, NODE_TEST_SUITES, resolveSuite } from '../../backend/tests/helpers/coachSuiteSelection.mjs';
import { runCoachSequence } from '../../backend/tests/helpers/coachRunnerOrchestration.mjs';

const ON_DISK = ['coachIntent.postgres.test.mjs', 'coachWorkoutAtomic.postgres.test.mjs'];
const cases = [
  ['FULL RUN (no --file)', null],
  ['--file coachIntent (a NODE suite)', resolveSuite('coachIntent', ON_DISK)],
  ['--file coachWorkoutAtomic (a VITEST suite)', resolveSuite('coachWorkoutAtomic', ON_DISK)],
];

for (const [name, selected] of cases) {
  const plan = runPlan(selected, { allNodeSuites: NODE_TEST_SUITES, expectedVitestFiles: 9 });
  const spawned = [];
  const which = selected ? selected.path : '';
  const orch = await runCoachSequence({
    vitestTask: plan.vitestTask,
    launchVitest: plan.vitestRuns
      ? async () => {
        spawned.push(`npx vitest run --config vitest.coach-postgres.config.mjs ${which}`.trim());
        return { ok: true, out: 'vitest ok' };
      }
      : undefined,
    nodeSuites: plan.nodeSuites,
    readState: async () => ({ abandoned: null, leaseLoss: null }),
    verifyLease: async () => ({ held: true }),
    resetBefore: async () => ({ ok: true, out: '' }),
    launchNode: async (s) => {
      spawned.push(`node --test ${s}`);
      return { ok: true, out: 'TAP version 13\n# tests 1\n# pass 1\n# fail 0\n' };
    },
  });
  console.log(`\n── ${name}`);
  if (!spawned.length) console.log('   SPAWNED: (nothing)');
  for (const s of spawned) console.log(`   SPAWNED: ${s}`);
  console.log(`   vitestRan=${orch.vitestRan}  expectedVitestFiles=${plan.expectedVitestFiles}  nodeSuites=${plan.nodeSuites.length}`);
}
