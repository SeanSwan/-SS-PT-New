import {defineConfig} from 'vitest/config';
export default defineConfig({envDir:false,test:{environment:'node',setupFiles:[],fileParallelism:false,retry:0,include:['tests/integration/coachWorkoutDraft.astraHostile.postgres.test.mjs'],testTimeout:30000,hookTimeout:30000}});
