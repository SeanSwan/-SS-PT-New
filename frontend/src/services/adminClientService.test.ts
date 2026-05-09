import { describe, expect, it, vi } from 'vitest';
import { createAdminClientService } from './adminClientService';

describe('adminClientService createClient', () => {
  it('preserves an admin-entered initial password', async () => {
    const post = vi.fn().mockResolvedValue({
      data: { success: true, data: { client: { id: 42 } } },
    });
    const api = {
      defaults: { baseURL: 'https://sswanstudios.com' },
      get: vi.fn(),
      post,
      put: vi.fn(),
      delete: vi.fn(),
    };
    const service = createAdminClientService(api);

    await service.createClient({
      firstName: 'Taylor',
      lastName: 'Reed',
      email: 'taylor@example.com',
      username: 'taylor.reed',
      password: 'Client123',
      availableSessions: 1,
    });

    expect(post).toHaveBeenCalledWith(
      '/api/admin/clients',
      expect.objectContaining({
        password: 'Client123',
        role: 'client',
        isActive: true,
        availableSessions: 1,
      }),
      undefined,
    );
  });
});
