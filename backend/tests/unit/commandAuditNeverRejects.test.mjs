/**
 * commandAuditNeverRejects.test.mjs
 * =================================
 * Two properties that several call sites depend on and nothing asserted.
 *
 * WHY THIS EXISTS
 * ---------------
 * `recordCommandAudit` is called fire-and-forget — deliberately, because an audit write must
 * never be able to turn a user's command into a failure. Four call sites in the command lane
 * do not await it, including two denial paths added this week.
 *
 * That pattern is only safe if the function CANNOT REJECT. An unawaited promise that rejects
 * is an unhandled rejection, and Node's default for those is to terminate the process — so
 * "best effort" auditing would become "the database hiccuped and the server died". A panel
 * (GLM Flash, 2026-08-26) put it exactly right: crash-safety was resting on an unverified
 * property of another module. It holds — its `try` wraps both awaits — but it was holding by
 * inspection, and inspection is not a guard.
 *
 * The second property is subtler and is why the import smoke is here: the contract suites
 * MOCK this module, so a genuine import cycle through it would be invisible to every test
 * that exercises the code depending on it. A cycle surfaces as an undefined function at
 * runtime, in production, on the denial path — the least observed path there is.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';

describe('recordCommandAudit as a fire-and-forget dependency', () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock('../../models/AiCommandAuditLog.mjs');
  });

  it('RESOLVES rather than rejects when the model write throws', async () => {
    // The property every unawaited call site depends on. If this ever regresses, the failure
    // mode is not a missing audit row — it is an unhandled rejection on a denial path.
    vi.resetModules();
    vi.doMock('../../models/AiCommandAuditLog.mjs', () => ({
      default: { create: vi.fn(async () => { throw new Error('database is unwell'); }) },
    }));
    const { recordCommandAudit } = await import('../../services/ai/commandAudit.mjs');

    await expect(recordCommandAudit({
      userId: 1, userRole: 'trainer', outcome: 'denied', errorCode: 'probe',
    })).resolves.toBe(false);
  });

  it('RESOLVES rather than rejects when the model module itself cannot load', async () => {
    // The import is dynamic and inside the try, so a broken model module is caught too.
    // Asserted separately because it is a different failure at a different moment.
    vi.resetModules();
    vi.doMock('../../models/AiCommandAuditLog.mjs', () => { throw new Error('module is gone'); });
    const { recordCommandAudit } = await import('../../services/ai/commandAudit.mjs');

    await expect(recordCommandAudit({
      userId: 1, userRole: 'trainer', outcome: 'denied',
    })).resolves.toBe(false);
  });

  it('returns false rather than throwing on a malformed entry', async () => {
    vi.resetModules();
    const { recordCommandAudit } = await import('../../services/ai/commandAudit.mjs');
    await expect(recordCommandAudit(null)).resolves.toBe(false);
    await expect(recordCommandAudit({ userId: 1 })).resolves.toBe(false);
  });
});

describe('the plan dispatcher imports for real', () => {
  it('loads with NOTHING mocked, so an import cycle cannot hide behind the test seam', async () => {
    // The contract suites mock the model registry, the lifecycle service and the audit
    // module. A cycle through any of them would be masked in every one of those tests and
    // would surface only in production, as an undefined function, on a denial path.
    //
    // This is the ad-hoc check that found nothing when the audit import was added, made
    // permanent — a check that ran once is a check that will not run again.
    vi.resetModules();
    const mod = await import('../../services/ai/dispatchers/workoutPlanCommandDispatchers.mjs');
    expect(typeof mod.dispatchDeleteWorkoutPlan).toBe('function');

    const audit = await import('../../services/ai/commandAudit.mjs');
    expect(typeof audit.recordCommandAudit).toBe('function');
  });
});
