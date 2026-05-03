/**
 * V3b.3 NASM Corrective Starter — Production Smoke Spec
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
 *   - Hitting the data layer + replaying the section filter in-process
 *     gives us a fast (~5s) regression check that doesn't depend on
 *     mounting the virtualized rolodex or fighting an admin login flow.
 *   - The UI smoke is still valuable but is a follow-up.
 *
 * Auth strategy:
 *   /api/exercises requires admin/trainer auth. We try (in order):
 *     1. E2E_ADMIN_EMAIL + E2E_ADMIN_PASSWORD env pair
 *     2. ogpswan@yahoo.com + TEST_PASSWORD
 *     3. admin@swanstudios.com + admin123 (test seed default — won't
 *        work in prod but lets the spec run against a localhost backend).
 *   All credential plumbing is env-driven; no secrets baked in.
 *
 * Target:
 *   BASE_URL env var (default https://sswanstudios.com).
 *
 * Run:
 *   cd frontend
 *   BASE_URL=https://sswanstudios.com TEST_PASSWORD=<sean-prod-pw> \
 *     npx playwright test e2e/api/v3b3-corrective-smoke.spec.ts \
 *     --project="API Tests"
 *
 * Pass criteria:
 *   - Exactly 32 rows with exercise_key starting `ces-` are returned.
 *   - Every CES row matches at least one of warmup / balance_core / cooldown
 *     under SECTION_PATTERNS.
 *   - No CES row matches ONLY `main` (which would mean it's
 *     misclassified and won't show up in any protocol section of the
 *     Rolodex).
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

const ADMIN_CANDIDATES = [
  { email: process.env.E2E_ADMIN_EMAIL || '', password: process.env.E2E_ADMIN_PASSWORD || '' },
  { email: 'ogpswan@yahoo.com', password: process.env.TEST_PASSWORD || '' },
  { email: 'admin@swanstudios.com', password: 'admin123' },
].filter(c => c.email.trim() && c.password.trim());

async function login(): Promise<string> {
  const ctx = await playwrightRequest.newContext({ baseURL: BASE_URL });
  for (const cand of ADMIN_CANDIDATES) {
    try {
      const res = await ctx.post('/api/auth/login', {
        data: { username: cand.email, password: cand.password },
      });
      if (res.ok()) {
        const body = await res.json();
        if (body?.token) {
          await ctx.dispose();
          return body.token;
        }
      }
    } catch {
      // try next candidate
    }
  }
  await ctx.dispose();
  throw new Error(
    `V3b.3 smoke: unable to authenticate against ${BASE_URL}. Set E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD or TEST_PASSWORD env vars.`,
  );
}

async function fetchAllExercises(token: string): Promise<ApiExerciseRow[]> {
  const ctx = await playwrightRequest.newContext({
    baseURL: BASE_URL,
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  });
  // The route caps limit at 500. 1500+ rows in prod means we page.
  const all: ApiExerciseRow[] = [];
  let page = 0;
  const PAGE = 500;
  // No offset support on this route per current backend; we rely on a
  // single page=500 call for now and warn if it looks truncated. The
  // CES rows are a 32-row band — they will all fit comfortably.
  // (If V3c needs strict pagination, add ?offset support upstream.)
  for (; page < 4; page += 1) {
    const res = await ctx.get(`/api/exercises?limit=${PAGE}`);
    if (!res.ok()) {
      await ctx.dispose();
      throw new Error(
        `V3b.3 smoke: GET /api/exercises returned ${res.status()} from ${BASE_URL}: ${await res.text()}`,
      );
    }
    const body = await res.json();
    const exs = (body?.exercises || []) as ApiExerciseRow[];
    if (exs.length === 0) break;
    all.push(...exs);
    if (exs.length < PAGE) break;
    // Backend doesn't support offset on this route today, so a second
    // page can only happen via a different filter; we break to avoid
    // an infinite loop.
    break;
  }
  await ctx.dispose();
  return all;
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

    // Per-section breakdown — useful for diagnostics regardless of pass/fail
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

    // Pass criteria
    expect(cesRows.length, 'should have exactly 32 CES corrective rows seeded').toBe(32);
    expect(orphans.length, 'every CES row must route to at least one of warmup/balance_core/cooldown — a row that only matches main means a misclassification (wrong exerciseType or wrong bodyPartCategory).').toBe(0);

    // Sanity: warmup + cooldown should each gain meaningful rows (at
    // least 8 each — UCS inhibit/lengthen/activate work goes warmup,
    // LCS inhibit/lengthen goes warmup or cooldown). This guards
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
