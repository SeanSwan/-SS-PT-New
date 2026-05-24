import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it, vi } from 'vitest';
import { createAdminClientService } from './adminClientService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

  it('generates temporary passwords with Web Crypto instead of Math.random', () => {
    const source = readFileSync(resolve(__dirname, './adminClientService.ts'), 'utf8');
    const utilityStart = source.indexOf('private secureRandomIndex');
    const utilitySource = source.slice(utilityStart, source.indexOf('formatClientData', utilityStart));

    expect(utilitySource).not.toMatch(/Math\.random/);
    expect(utilitySource).toMatch(/getRandomValues/);
    expect(utilitySource).toMatch(/Fisher-Yates/);
  });
});
