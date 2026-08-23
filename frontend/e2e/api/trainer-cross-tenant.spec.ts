/**
 * Cross-tenant authorization — trainer A vs trainer B
 * ===================================================
 * SWA-192. The existing `auth-rbac.spec.ts` covers ROLE boundaries (a client
 * cannot do admin things). Nothing covered CROSS-TENANT: two accounts at the
 * SAME role, where the question is not "may you do this kind of thing" but
 * "may you do it to THIS subject". Every finding fixed under SWA-192 was of
 * that second kind, and none of it had regression cover against a live server.
 *
 * These are the four probes specified at gate zero and never run. Everything
 * proving those fixes so far is unit/integration evidence; this is the layer
 * that proves the deployed system actually refuses.
 *
 * READ-ONLY BY CONSTRUCTION. Every request either reads, or is expected to be
 * REFUSED before it writes. Nothing is booked, moderated or deleted. The one
 * request that would write on failure (opening a Coach thread) is asserted to
 * be refused — if that assertion fails, the failure IS the finding.
 *
 * CREDENTIALS ARE ENV-ONLY, matching the convention in fixtures/auth.fixture.ts.
 * Never hardcode production, personal or seed credentials here. Two DIFFERENT
 * trainer accounts are required; the deterministic `@swanstudios-qa.local`
 * personas created by `npm run qa:dashboard-crawl:prod:auto` are the intended
 * source.
 *
 *   E2E_TRAINER_A_EMAIL / E2E_TRAINER_A_PASSWORD
 *   E2E_TRAINER_B_EMAIL / E2E_TRAINER_B_PASSWORD
 *   E2E_API_BASE_URL   (optional; defaults to local backend)
 */
import { test as base, expect, APIRequestContext } from '@playwright/test';

const BASE_URL = process.env.E2E_API_BASE_URL?.trim() || 'http://localhost:10000';

type Trainer = { ctx: APIRequestContext; id: number; role: string };
type Fixtures = { trainerA: Trainer; trainerB: Trainer };

function creds(label: string, emailEnv: string, passwordEnv: string) {
  const email = process.env[emailEnv]?.trim() || '';
  const password = process.env[passwordEnv]?.trim() || '';
  if (!email || !password) {
    throw new Error(
      `${label} requires ${emailEnv} and ${passwordEnv}. ` +
      'Do not hardcode production or seed credentials. ' +
      'Create QA personas with: npm run qa:dashboard-crawl:prod:auto',
    );
  }
  return { email, password };
}

async function login(playwright: any, label: string, emailEnv: string, passwordEnv: string): Promise<Trainer> {
  const { email, password } = creds(label, emailEnv, passwordEnv);
  const loginCtx = await playwright.request.newContext({ baseURL: BASE_URL });
  // NOTE: the API expects `username`, not `email`. Getting this wrong fails at
  // the very first call with an unhelpful 400.
  const res = await loginCtx.post('/api/auth/login', { data: { username: email, password } });
  if (!res.ok()) throw new Error(`${label} login failed: ${res.status()}`);
  const body = await res.json();
  if (!body?.token) throw new Error(`${label} login returned no token`);
  await loginCtx.dispose();

  const ctx = await playwright.request.newContext({
    baseURL: BASE_URL,
    extraHTTPHeaders: { Authorization: `Bearer ${body.token}` },
  });
  return { ctx, id: Number(body.user?.id), role: String(body.user?.role || '') };
}

const test = base.extend<Fixtures>({
  trainerA: [async ({ playwright }, use) => {
    const t = await login(playwright, 'Trainer A', 'E2E_TRAINER_A_EMAIL', 'E2E_TRAINER_A_PASSWORD');
    await use(t);
    await t.ctx.dispose();
  }, { scope: 'worker' }],
  trainerB: [async ({ playwright }, use) => {
    const t = await login(playwright, 'Trainer B', 'E2E_TRAINER_B_EMAIL', 'E2E_TRAINER_B_PASSWORD');
    await use(t);
    await t.ctx.dispose();
  }, { scope: 'worker' }],
});

const WINDOW = {
  startTime: '2026-09-01T17:00:00.000Z',
  endTime: '2026-09-01T18:00:00.000Z',
};

/** First client id on a trainer's own roster, or null. */
async function firstClientId(t: Trainer): Promise<number | null> {
  const res = await t.ctx.get(`/api/client-trainer-assignments/trainer/${t.id}`);
  if (!res.ok()) return null;
  const body = await res.json().catch(() => null);
  const rows = [...(body?.assignments ?? []), ...(Array.isArray(body?.data) ? body.data : [])];
  for (const row of rows) {
    const id = row?.client?.id ?? row?.clientId;
    if (id) return Number(id);
  }
  return null;
}

test.describe('@readonly cross-tenant: trainer A must not reach trainer B', () => {
  test.beforeAll(async () => {
    // An admin passes every check below by design, so running these as admin
    // would produce four green results that prove nothing.
    expect(
      process.env.E2E_TRAINER_A_EMAIL,
      'trainer credentials are required; see the header of this file',
    ).toBeTruthy();
  });

  test('both accounts are trainers, and are different accounts', async ({ trainerA, trainerB }) => {
    expect(trainerA.role, 'A must be a trainer — an admin bypasses these checks').toBe('trainer');
    expect(trainerB.role, 'B must be a trainer — an admin bypasses these checks').toBe('trainer');
    expect(trainerA.id).not.toBe(trainerB.id);
  });

  test('P1 check-conflicts clamps a body trainerId to the caller', async ({ trainerA, trainerB }) => {
    const foreign = await trainerA.ctx.post('/api/sessions/check-conflicts', {
      data: { ...WINDOW, trainerId: trainerB.id },
    });
    const own = await trainerA.ctx.post('/api/sessions/check-conflicts', { data: { ...WINDOW } });

    expect(foreign.status()).toBe(200);
    expect(own.status()).toBe(200);
    // Identical replies mean the subject was clamped to A. Divergence would mean
    // A actually queried B's calendar.
    expect(await foreign.text()).toBe(await own.text());
  });

  test('P2 check-conflicts refuses a clientId the caller is not assigned to', async ({ trainerA, trainerB }) => {
    const bClient = await firstClientId(trainerB);
    test.skip(!bClient, 'trainer B has no assigned client to probe with');

    const res = await trainerA.ctx.post('/api/sessions/check-conflicts', {
      data: { ...WINDOW, clientId: bClient },
    });
    expect(res.status()).toBe(403);
  });

  test('P3 the moderation queue is scoped to the caller\'s own roster', async ({ trainerA, trainerB }) => {
    const a = await trainerA.ctx.get('/api/gamification/challenge-submissions/manage');
    const b = await trainerB.ctx.get('/api/gamification/challenge-submissions/manage');
    expect(a.status()).toBe(200);
    expect(b.status()).toBe(200);

    const idsOf = async (r: typeof a) => {
      const j = await r.json().catch(() => null);
      return new Set((j?.submissions ?? []).map((s: any) => String(s.id)));
    };
    const aIds = await idsOf(a);
    const bIds = await idsOf(b);

    // Pre-fix this endpoint returned EVERY trainer's clients' submissions, so
    // the two sets were identical. Any shared id is a scope leak.
    const shared = [...aIds].filter((id) => bIds.has(id));
    expect(shared, 'submission ids visible to BOTH trainers').toEqual([]);
  });

  test('P4 Coach refuses a thread targeting a client the caller is not assigned to', async ({ trainerA, trainerB }) => {
    const bClient = await firstClientId(trainerB);
    test.skip(!bClient, 'trainer B has no assigned client to probe with');

    // Expected to be refused, so no conversation row is created. If this returns
    // 2xx the assertion fails AND a stray thread exists — that is the finding.
    const res = await trainerA.ctx.post('/api/ai-chat/conversations', {
      data: { context: 'general', audienceRole: 'client', targetUserId: bClient },
    });
    expect([400, 403]).toContain(res.status());
  });
});
