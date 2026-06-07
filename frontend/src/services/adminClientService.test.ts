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

describe('adminClientService sendClientPasswordReset', () => {
  it('sends a reset-email request without raw password data', async () => {
    const post = vi.fn().mockResolvedValue({
      data: { success: true, message: 'Password reset email sent' },
    });
    const api = {
      defaults: { baseURL: 'https://sswanstudios.com' },
      get: vi.fn(),
      post,
      put: vi.fn(),
      delete: vi.fn(),
    };
    const service = createAdminClientService(api);

    await service.sendClientPasswordReset('client-42');

    expect(post).toHaveBeenCalledWith(
      '/api/admin/clients/client-42/send-password-reset',
      {},
      undefined,
    );
  });

  it('keeps legacy admin-client surfaces off raw password prompts', () => {
    const hookSource = readFileSync(
      resolve(__dirname, '../components/DashBoard/Pages/admin-clients/hooks/useClientActions.ts'),
      'utf8',
    );
    const enhancedSource = readFileSync(
      resolve(__dirname, '../components/DashBoard/Pages/admin-clients/EnhancedAdminClientManagementView.tsx'),
      'utf8',
    );

    expect(hookSource).not.toMatch(/prompt\([^)]*password/i);
    expect(hookSource).not.toContain('newPassword');
    expect(hookSource).toMatch(/sendClientPasswordReset\(client\.id\)/);
    expect(enhancedSource).not.toMatch(/prompt\([^)]*password/i);
    expect(enhancedSource).not.toContain('newPassword');
    expect(enhancedSource).toMatch(/sendClientPasswordReset\(client\.id\)/);
  });
});

describe('adminClientService generateWorkoutPlan', () => {
  it('routes legacy callers through the canonical Swan Coach planning endpoint', async () => {
    const post = vi.fn().mockResolvedValue({
      data: {
        success: true,
        plan: { planningSystem: 'swan_coach_planning' },
      },
    });
    const api = {
      defaults: { baseURL: 'https://sswanstudios.com' },
      get: vi.fn(),
      post,
      put: vi.fn(),
      delete: vi.fn(),
    };
    const service = createAdminClientService(api);

    await service.generateWorkoutPlan('42', {
      durationWeeks: 26,
      sessionsPerWeek: 3,
      primaryGoal: 'strength',
    });

    expect(post).toHaveBeenCalledWith(
      '/api/workout-builder/plan',
      {
        clientId: 42,
        durationWeeks: 26,
        sessionsPerWeek: 3,
        primaryGoal: 'strength',
      },
      undefined,
    );
  });
});
