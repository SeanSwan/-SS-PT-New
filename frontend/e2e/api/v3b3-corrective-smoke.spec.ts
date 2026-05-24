/**
 * V3b.3 NASM Corrective Starter - Production Smoke Spec
 * =====================================================
 *
 * Verifies the 32 NASM CES rows shipped in
 * `backend/seeders/20260504-seed-nasm-corrective-starter.mjs` are live
 * in production, and that every one of them routes into a non-`main`
 * Rolodex section per the SECTION_PATTERNS contract in
 * `frontend/src/components/WorkoutLogger/NASMExerciseRolodex.sectionFilter.ts`.
 *
 * Why an API smoke (not a UI smoke):
 *   - The Rolodex's filter logic is deterministic from the API payload.
 *   - Hitting the data layer + replaying the section filter in-process gives
 *     us a fast regression check that does not depend on mounting the
 *     virtualized rolodex or fighting an admin login flow.
 *   - The UI smoke is still valuable but is a follow-up.
 *
 * Auth strategy:
 *   /api/exercises requires admin/trainer auth. Credentials are env-only:
 *   E2E_ADMIN_EMAIL + E2E_ADMIN_PASSWORD.
 *
 * Target:
 *   BASE_URL env var (default https://sswanstudios.com).
 *
 * Run:
 *   cd frontend
 *   BASE_URL=https://sswanstudios.com \
 *     E2E_ADMIN_EMAIL=<admin-email> E2E_ADMIN_PASSWORD=<admin-password> \
 *     npx playwright test e2e/api/v3b3-corrective-smoke.spec.ts \
 *     --project="API Tests"
 *
 * Pass criteria:
 *   - Exactly 32 rows with exercise_key starting `ces-` are returned.
 *   - Every CES row matches at least one of warmup / balance_core / cooldown
 *     under SECTION_PATTERNS.
 *   - No CES row matches ONLY `main`, which would mean it is misclassified
 *     and will not show up in any protocol section of the Rolodex.
 *   - Per-section breakdown is reported in test output.
 */
import { test, expect, request as playwrightRequest } from '@playwright/test';
import {
  SECTION_PATTERNS,
  matchesSectionContextForTesting,
  type ExerciseSlimSubset,
  type SectionContext,
} from '../../src/components/WorkoutLogger/NASMExerciseRolodex.sectionFilter';

const BASE_URL = process.env.BASE_URL || 'https://sswanstudios.com';
const PROD_HOST = BASE_URL.includes('sswanstudios.com') ? 'production' : 'local';

type ApiExerciseRow = {
  id: string;
  name: string;
  exerciseKey: string;
  exerciseType: string;
  bodyPartCategory: string;
  primaryMuscles: string[];
  description: string;
};

function readAdminCredentials() {
  const email = process.env.E2E_ADMIN_EMAIL?.trim() || '';
  const password = process.env.E2E_ADMIN_PASSWORD?.trim() || '';

  if (!email || !password) {
    throw new Error(
      'V3b.3 smoke requires E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD. ' +
      'Do not use hardcoded production or local seed credentials.',
    );
  }

  return { email, password };
}

async function login(): Promise<string> {
  const admin = readAdminCredentials();
  const ctx = await playwrightRequest.newContext({ baseURL: BASE_URL });
  const res = await ctx.post('/api/auth/login', {
    data: { username: admin.email, password: admin.password },
  });
  if (res.ok()) {
    const body = await res.json();
    if (body?.token) {
      await ctx.dispose();
      return body.token;
    }
  }
  await ctx.dispose();
  throw new Error(
    `V3b.3 smoke: unable to authenticate against ${BASE_URL}. Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD.`,
  );
}

async function fetchAllExercises(token: string): Promise<ApiExerciseRow[]> {
  const ctx = await playwrightRequest.newContext({
    baseURL: BASE_URL,
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  });
  // V3b.3 MEDIUM 3 fix (2026-05-03): use the exerciseKeyPrefix=ces-
  // server-side filter introduced for this exact pagination concern.
  // The smoke now narrows server-side to the ces-* namespace, so the
  // 32-row band returns in one request regardless of total registry
  // size. Codex Round 1 flagged the prior fetch as fragile if total
  // rows ever exceed 500 AND ces-* sorts past row 500. The new
  // filter eliminates both halves of that condition.
  const res = await ctx.get('/api/exercises?limit=500&exerciseKeyPrefix=ces-');
  if (!res.ok()) {
    await ctx.dispose();
    throw new Error(
      `V3b.3 smoke: GET /api/exercises returned ${res.status()} from ${BASE_URL}: ${await res.text()}`,
    );
  }
  const body = await res.json();
  const exs = (body?.exercises || []) as ApiExerciseRow[];
  await ctx.dispose();
  return exs;
}

function classifySection(ex: ApiExerciseRow): SectionContext[] {
  const subset: ExerciseSlimSubset = {
    id: ex.id,
    name: ex.name,
    exerciseType: ex.exerciseType,
    bodyPartCategory: ex.bodyPartCategory,
  };
  const sections: SectionContext[] = [];
  const candidates: SectionContext[] = ['warmup', 'balance_core', 'cooldown'];
  for (const ctx of candidates) {
    if (matchesSectionContextForTesting(subset, ctx)) sections.push(ctx);
  }
  return sections;
}

test.describe(`V3b.3 NASM Corrective Starter Smoke (${PROD_HOST}: ${BASE_URL})`, () => {
  test.setTimeout(60_000);

  test('exactly 32 ces-* rows are present and all route to a protocol section', async () => {
    const token = await login();
    const all = await fetchAllExercises(token);

    expect(all.length).toBeGreaterThan(0);

    const cesRows = all.filter(ex => (ex.exerciseKey || '').toLowerCase().startsWith('ces-'));

    const breakdown: Record<SectionContext, ApiExerciseRow[]> = {
      warmup: [],
      balance_core: [],
      cooldown: [],
      main: [],
    };
    const orphans: ApiExerciseRow[] = [];
    for (const row of cesRows) {
      const sections = classifySection(row);
      if (sections.length === 0) {
        orphans.push(row);
        breakdown.main.push(row);
      } else {
        for (const s of sections) breakdown[s].push(row);
      }
    }

    /* eslint-disable no-console */
    console.log('\n=== V3b.3 Corrective Starter Smoke ===');
    console.log(`Target: ${BASE_URL}`);
    console.log(`Total exercises in registry: ${all.length}`);
    console.log(`CES rows (exercise_key=ces-*): ${cesRows.length} (target: 32)`);
    console.log(`  warmup-eligible:       ${breakdown.warmup.length}`);
    console.log(`  balance_core-eligible: ${breakdown.balance_core.length}`);
    console.log(`  cooldown-eligible:     ${breakdown.cooldown.length}`);
    console.log(`  ORPHAN (main-only):    ${orphans.length}`);
    if (orphans.length > 0) {
      console.log('\nOrphans (would not appear in any protocol section):');
      for (const o of orphans) {
        console.log(`  - ${o.name} [type=${o.exerciseType}, cat=${o.bodyPartCategory}, key=${o.exerciseKey}]`);
      }
    }
    /* eslint-enable no-console */

    expect(cesRows.length, 'should have exactly 32 CES corrective rows seeded').toBe(32);
    expect(orphans.length, 'every CES row must route to at least one of warmup/balance_core/cooldown').toBe(0);

    // Sanity: warmup + cooldown should each gain meaningful rows. This guards
    // against a regression where everything piles into balance_core.
    expect(breakdown.warmup.length, 'warmup section should pick up at least 8 CES rows').toBeGreaterThanOrEqual(8);
    expect(breakdown.cooldown.length, 'cooldown section should pick up at least 4 CES rows').toBeGreaterThanOrEqual(4);
  });

  test('SECTION_PATTERNS contract is intact (V3b.1.1 narrowing preserved)', async () => {
    // Cheap regression: the V3b.1.1 fix removed 'recovery' from
    // balance_core.categories. Codifying that here so a future edit
    // re-introducing it would fail this test loudly.
    expect(SECTION_PATTERNS.balance_core.categories).not.toContain('recovery');
    expect(SECTION_PATTERNS.balance_core.types).toEqual(
      expect.arrayContaining(['core', 'balance', 'stability', 'stabilizers']),
    );
    expect(SECTION_PATTERNS.warmup.types).toEqual(
      expect.arrayContaining(['flexibility', 'injury_prevention']),
    );
    expect(SECTION_PATTERNS.cooldown.types).toEqual(
      expect.arrayContaining(['flexibility', 'injury_recovery']),
    );
  });
});
