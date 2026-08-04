import { describe, expect, it } from 'vitest';
import {
  CLIENT_HUB_AUDIENCES,
  getClientHubAudienceConfig,
  isDetailTabVisibleForAudience,
} from './clientHubAudience';

describe('clientHubAudience', () => {
  it('keeps the admin config byte-identical to the historical hardcoded paths', () => {
    const admin = CLIENT_HUB_AUDIENCES.admin;
    expect(admin.clientManagementBase).toBe('/dashboard/admin/client-management');
    expect(admin.coachAssistantBase).toBe('/dashboard/admin/coach-assistant');
    expect(admin.workoutPlannerBase).toBe('/dashboard/admin/workout-planner');
    expect(admin.canManageAccounts).toBe(true);
    expect(admin.showRosterOpsPanels).toBe(true);
    expect(admin.visibleDetailTabs).toEqual([
      'training', 'progress', 'nutrition', 'biometrics', 'overview', 'settings',
    ]);
  });

  it('scopes the trainer audience to role-local mounts with account controls off', () => {
    const trainer = CLIENT_HUB_AUDIENCES.trainer;
    expect(trainer.clientManagementBase).toBe('/dashboard/trainer/clients');
    expect(trainer.coachAssistantBase).toBe('/dashboard/trainer/coach-assistant');
    expect(trainer.workoutPlannerBase).toBe('/dashboard/trainer/workout-planner');
    expect(trainer.canManageAccounts).toBe(false);
    // Phase 4A: roster nutrition panels enabled for trainers (backend routes
    // scope every userId through assertAssignmentOrAdmin).
    expect(trainer.showRosterOpsPanels).toBe(true);
  });

  it('hides the admin-only Overview and Settings tabs from trainers', () => {
    expect(isDetailTabVisibleForAudience('trainer', 'overview')).toBe(false);
    expect(isDetailTabVisibleForAudience('trainer', 'settings')).toBe(false);
    expect(isDetailTabVisibleForAudience('trainer', 'training')).toBe(true);
    expect(isDetailTabVisibleForAudience('trainer', 'progress')).toBe(true);
    expect(isDetailTabVisibleForAudience('trainer', 'nutrition')).toBe(true);
    expect(isDetailTabVisibleForAudience('trainer', 'biometrics')).toBe(true);
  });

  it('falls back to the admin config for unknown audiences instead of crashing', () => {
    expect(getClientHubAudienceConfig('bogus' as never).id).toBe('admin');
  });
});
