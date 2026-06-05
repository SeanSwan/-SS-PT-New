import { describe, expect, it, vi } from 'vitest';

import {
  getClientDetailTabFromSearchParams,
  getClientTrainingSectionFromSearchParams,
} from './ClientsWorkspace.logic';
import {
  fetchActiveAdminClients,
  fetchAdminClientById,
  resolveInitialClientSelection,
} from './ClientsWorkspace.data';

describe('ClientsWorkspace route state parsing', () => {
  it('accepts the workout-history return section after a saved full-page log', () => {
    const params = new URLSearchParams('clientId=61&tab=training&trainingSection=history');

    expect(getClientTrainingSectionFromSearchParams(params)).toBe('history');
  });

  it('accepts the saved-plans return section after a saved full-page plan', () => {
    const params = new URLSearchParams('clientId=61&tab=training&trainingSection=plans');

    expect(getClientTrainingSectionFromSearchParams(params)).toBe('plans');
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
});

describe('ClientsWorkspace data helpers', () => {
  it('fetches active admin client lists and filters invalid client identities', async () => {
    const authAxios = {
      get: vi.fn(async () => ({
        data: {
          success: true,
          data: {
            clients: [
              { id: 7, firstName: 'Valid', lastName: 'Client', email: 'valid@example.test' },
              { id: 'bad-id', firstName: 'Invalid' },
            ],
          },
        },
      })),
    };

    await expect(fetchActiveAdminClients(authAxios)).resolves.toMatchObject([
      { id: 7, firstName: 'Valid', lastName: 'Client' },
    ]);
    expect(authAxios.get).toHaveBeenCalledWith('/api/admin/clients', {
      params: { limit: 100, status: 'active' },
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
