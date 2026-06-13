import { describe, expect, it, vi } from 'vitest';

import {
  buildClientDetailSearchParams,
  buildCreationHandoffCopyToast,
  copyTextToClipboard,
  getClientDetailTabFromSearchParams,
  getClientOnboardingPct,
  getClientScheduleWorkoutLoggerContextFromSearchParams,
  getClientTrainingSectionFromSearchParams,
} from './ClientsWorkspace.logic';
import {
  fetchClientHubAdminClients,
  fetchAdminClientById,
  resolveInitialClientSelection,
} from './ClientsWorkspace.data';

describe('ClientsWorkspace route state parsing', () => {
  it('builds canonical detail routes for trainer/client training sections', () => {
    const client = { id: 61 };

    expect(buildClientDetailSearchParams(client, 'training', 'logger')).toEqual({
      clientId: '61',
      tab: 'training',
      trainingSection: 'logger',
      loadPlan: 'today',
    });
    expect(buildClientDetailSearchParams(client, 'progress', 'logger')).toEqual({
      clientId: '61',
      tab: 'progress',
    });
  });

  it('accepts the workout-history return section after a saved full-page log', () => {
    const params = new URLSearchParams('clientId=61&tab=training&trainingSection=history');

    expect(getClientTrainingSectionFromSearchParams(params)).toBe('history');
  });

  it('accepts the saved-plans return section after a saved full-page plan', () => {
    const params = new URLSearchParams('clientId=61&tab=training&trainingSection=plans');

    expect(getClientTrainingSectionFromSearchParams(params)).toBe('plans');
  });

  it('accepts the historical import return section after Coach planning', () => {
    const params = new URLSearchParams('clientId=61&tab=training&trainingSection=import');

    expect(getClientTrainingSectionFromSearchParams(params)).toBe('import');
  });

  it('rejects unknown training sections instead of passing them into the Client Hub', () => {
    const params = new URLSearchParams('clientId=61&tab=training&trainingSection=javascript:alert(1)');

    expect(getClientTrainingSectionFromSearchParams(params)).toBeNull();
  });

  it('accepts a shareable progress detail tab route', () => {
    const params = new URLSearchParams('clientId=61&tab=progress');

    expect(getClientDetailTabFromSearchParams(params)).toBe('progress');
  });

  it('rejects unsafe detail tab route values', () => {
    const params = new URLSearchParams('clientId=61&tab=javascript:alert(1)');

    expect(getClientDetailTabFromSearchParams(params)).toBeNull();
  });

  it('extracts scheduled workout logger context only for the training logger route', () => {
    const params = new URLSearchParams(
      'clientId=61&tab=training&trainingSection=logger&sessionId=72&sessionDate=2026-06-07&sessionCredits=2'
    );

    expect(getClientScheduleWorkoutLoggerContextFromSearchParams(params)).toEqual({
      scheduledSessionId: '72',
      scheduledSessionDate: '2026-06-07',
      scheduledSessionCreditHint: 2,
    });
  });

  it('rejects invalid scheduled workout logger context', () => {
    const wrongSection = new URLSearchParams(
      'clientId=61&tab=training&trainingSection=history&sessionId=72&sessionDate=2026-06-07'
    );
    const unsafeSession = new URLSearchParams(
      'clientId=61&tab=training&trainingSection=logger&sessionId=javascript:alert(1)&sessionDate=2026-06-07'
    );

    expect(getClientScheduleWorkoutLoggerContextFromSearchParams(wrongSection)).toBeNull();
    expect(getClientScheduleWorkoutLoggerContextFromSearchParams(unsafeSession)).toBeNull();
  });

  it('drops unsafe scheduled session credit hints while keeping valid scheduled session context', () => {
    const params = new URLSearchParams(
      'clientId=61&tab=training&trainingSection=logger&sessionId=72&sessionDate=2026-06-07&sessionCredits=2junk'
    );

    expect(getClientScheduleWorkoutLoggerContextFromSearchParams(params)).toEqual({
      scheduledSessionId: '72',
      scheduledSessionDate: '2026-06-07',
      scheduledSessionCreditHint: null,
    });
  });

  it('drops invalid scheduled session dates while keeping valid session identity and credit hints', () => {
    const params = new URLSearchParams(
      'clientId=61&tab=training&trainingSection=logger&sessionId=72&sessionDate=not-a-date&sessionCredits=2'
    );

    expect(getClientScheduleWorkoutLoggerContextFromSearchParams(params)).toEqual({
      scheduledSessionId: '72',
      scheduledSessionDate: null,
      scheduledSessionCreditHint: 2,
    });
  });
});

describe('ClientsWorkspace UI helper logic', () => {
  it('copies handoff text only when a clipboard writer is available', async () => {
    const writeText = vi.fn(async () => undefined);

    await expect(copyTextToClipboard({ writeText }, 'claim-link')).resolves.toBe(true);
    await expect(copyTextToClipboard(null, 'claim-link')).resolves.toBe(false);
    expect(writeText).toHaveBeenCalledWith('claim-link');
  });

  it('builds copy toast copy for success and manual fallback states', () => {
    expect(buildCreationHandoffCopyToast('Claim link', true)).toEqual({
      title: 'Claim link copied',
      description: 'Send it through your normal client handoff channel.',
      variant: 'default',
    });
    expect(buildCreationHandoffCopyToast('Claim code', false)).toEqual({
      title: 'Claim code not copied',
      description: 'Select the text and copy it manually.',
      variant: 'destructive',
    });
  });

  it('resolves onboarding percentage from explicit API fields before complete flags', () => {
    expect(getClientOnboardingPct(null)).toBeUndefined();
    expect(getClientOnboardingPct({ onboardingPct: 42.4 } as any)).toBe(42);
    expect(getClientOnboardingPct({ completionPercentage: 200 } as any)).toBe(100);
    expect(getClientOnboardingPct({ isOnboardingComplete: true } as any)).toBe(100);
  });
});

describe('ClientsWorkspace data helpers', () => {
  it('fetches all admin clients so soft-deactivated clients can be reactivated', async () => {
    const authAxios = {
      get: vi.fn(async () => ({
        data: {
          success: true,
          data: {
            clients: [
              { id: 7, firstName: 'Valid', lastName: 'Client', email: 'valid@example.test' },
              { id: 8, firstName: 'Inactive', lastName: 'Client', email: 'inactive@example.test', isActive: false },
              { id: 'bad-id', firstName: 'Invalid' },
            ],
          },
        },
      })),
    };

    await expect(fetchClientHubAdminClients(authAxios)).resolves.toMatchObject([
      { id: 7, firstName: 'Valid', lastName: 'Client' },
      { id: 8, firstName: 'Inactive', lastName: 'Client', isActive: false },
    ]);
    expect(authAxios.get).toHaveBeenCalledWith('/api/admin/clients', {
      params: { limit: 100 },
    });
  });

  it('fetches client detail responses and rejects failed responses', async () => {
    const authAxios = {
      get: vi.fn(async () => ({
        data: {
          success: true,
          data: { client: { id: 9, firstName: 'Detail', email: 'detail@example.test' } },
        },
      })),
    };

    await expect(fetchAdminClientById(authAxios, 9)).resolves.toMatchObject({
      id: 9,
      firstName: 'Detail',
    });

    authAxios.get.mockResolvedValueOnce({ data: { success: false } });
    await expect(fetchAdminClientById(authAxios, 9)).resolves.toBeNull();
  });

  it('resolves URL-selected clients from the loaded list before falling back to detail fetch', async () => {
    const loadClientById = vi.fn(async () => ({
      id: 11,
      firstName: 'Fetched',
      lastName: 'Client',
      email: 'fetched@example.test',
    } as any));

    await expect(resolveInitialClientSelection({
      mappedClients: [{ id: 7, firstName: 'Listed', lastName: 'Client', email: '' } as any],
      urlClientId: 7,
      urlDetailTab: 'progress',
      loadClientById,
    })).resolves.toMatchObject({
      client: { id: 7 },
      detailTab: 'progress',
    });
    expect(loadClientById).not.toHaveBeenCalled();

    await expect(resolveInitialClientSelection({
      mappedClients: [],
      urlClientId: 11,
      urlDetailTab: null,
      loadClientById,
    })).resolves.toMatchObject({
      client: { id: 11 },
      detailTab: 'training',
    });
  });
});
