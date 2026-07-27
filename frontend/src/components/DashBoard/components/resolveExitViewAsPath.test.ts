/**
 * resolveExitViewAsPath.test.ts
 * ==============================
 * Leaving View-As must PRESERVE the work, not just change the URL. These cases
 * lock the promise that exiting carries the admin to the same task on their own
 * dashboard, with working context intact — and never dead-ends or bounces back
 * into the role being exited.
 */
import { describe, it, expect } from 'vitest';
import { resolveExitViewAsPath } from './resolveExitViewAsPath';

describe('resolveExitViewAsPath', () => {
  it('carries a capability the admin also mounts straight across', () => {
    expect(resolveExitViewAsPath('/dashboard/trainer/build-plan')).toBe('/dashboard/admin/build-plan');
    expect(resolveExitViewAsPath('/dashboard/trainer/assessments')).toBe('/dashboard/admin/assessments');
    expect(resolveExitViewAsPath('/dashboard/trainer/client-progress')).toBe('/dashboard/admin/client-progress');
    expect(resolveExitViewAsPath('/dashboard/trainer/videos')).toBe('/dashboard/admin/videos');
  });

  it('preserves the working context in the query string', () => {
    expect(
      resolveExitViewAsPath('/dashboard/trainer/build-plan', '?clientId=61&loadPlan=today'),
    ).toBe('/dashboard/admin/build-plan?clientId=61&loadPlan=today');
  });

  it('tolerates a search string supplied without its leading question mark', () => {
    expect(resolveExitViewAsPath('/dashboard/trainer/build-plan', 'clientId=61')).toBe(
      '/dashboard/admin/build-plan?clientId=61',
    );
  });

  it('keeps parameterised routes addressable', () => {
    // /nutrition/:clientId? is mounted for admin; the concrete id must survive.
    expect(resolveExitViewAsPath('/dashboard/trainer/nutrition/61')).toBe(
      '/dashboard/admin/nutrition/61',
    );
  });

  it('falls back to the admin default when no equivalent capability is mounted', () => {
    // Trainer-exclusive by design; the admin counterpart is a different surface.
    expect(resolveExitViewAsPath('/dashboard/trainer/earnings')).toBe('/dashboard/admin/master-schedule');
    expect(resolveExitViewAsPath('/dashboard/trainer/unknown-surface')).toBe(
      '/dashboard/admin/master-schedule',
    );
  });

  it('never returns a path outside the admin dashboard', () => {
    const cases = [
      '/dashboard/trainer/build-plan',
      '/dashboard/trainer/earnings',
      '/dashboard/client/overview',
      '/dashboard/trainer',
      '/dashboard',
      '/login',
      '',
      undefined,
    ];

    for (const input of cases) {
      const result = resolveExitViewAsPath(input);
      expect(result.startsWith('/dashboard/admin/'), `${input} → ${result}`).toBe(true);
      expect(result).not.toContain('/dashboard/trainer/');
      expect(result).not.toContain('/dashboard/client/');
    }
  });

  it('exits the client dashboard to the equivalent admin surface where one exists', () => {
    expect(resolveExitViewAsPath('/dashboard/client/messages')).toBe('/dashboard/admin/messages');
  });
});
