/** Planning-only test runner. No backend setup, dotenv, application server or database. */
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const packet = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(packet, '../../../..');
const source = path.join(repo, 'tmp/worktrees/agent-ready-planner-audit-20260906');
const planner = 'frontend/src/components/DashBoard/Pages/admin-workout-planner/';
const mode = process.env.SWAN_BLUEPRINT_TEST_MODE || 'frontend';
const front = ['plannerIaV2.contract.test.ts', 'plannerIaV2.mobileShell.test.tsx',
  'plannerIaV2.rolodex.test.ts', 'WorkoutPlannerBackupPanel.test.tsx',
  'WorkoutPlannerBlendDialog.test.tsx', 'useWorkoutPlannerGenerationActions.test.tsx',
  'planDataBuilder.test.ts', 'useWorkoutPlannerSaveActions.test.tsx'];
const back = ['__tests__/workoutBuilderGoalConfig.test.mjs',
  '__tests__/workoutPlanRouteHelpers.test.mjs', 'tests/unit/mcpRetirementContract.test.mjs',
  'tests/unit/backupPlanReviewGate.test.mjs', 'tests/unit/backupPlanPromotionMutation.test.mjs'];
export default {
  root: mode === 'red' ? packet : source,
  resolve: { alias: { '@': path.join(source, 'frontend/src') } },
  esbuild: { jsx: 'automatic' },
  test: {
    environment: mode === 'frontend' ? 'jsdom' : 'node', globals: true,
    setupFiles: mode === 'frontend' ? [path.join(source, 'frontend/src/test/setup.ts')] : [],
    include: mode === 'red' ? ['planner-controls.red.test.ts']
      : mode === 'frontend' ? front.map(f => planner + f) : back.map(f => 'backend/' + f),
    retry: 0, testTimeout: 15000,
  },
};
