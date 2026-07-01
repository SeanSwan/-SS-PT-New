import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it, vi } from 'vitest';
import { createAdminClientService } from './adminClientService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('adminClientService createClient', () => {
  it('drops submitted client passwords so reset-link handoff owns credential setup', async () => {
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
        role: 'client',
        isActive: true,
        availableSessions: 1,
      }),
      undefined,
    );
    expect(post.mock.calls[0][1]).not.toHaveProperty('password');
  });

  it('drops external client passwords so claim-link handoff owns credential setup', async () => {
    const post = vi.fn().mockResolvedValue({
      data: { success: true, data: { client: { id: 77 }, claimUrl: 'https://sswanstudios.com/claim/SWAN-ABCDEFGH' } },
    });
    const api = {
      defaults: { baseURL: 'https://sswanstudios.com' },
      get: vi.fn(),
      post,
      put: vi.fn(),
      delete: vi.fn(),
    };
    const service = createAdminClientService(api);

    await service.createExternalClient({
      firstName: 'Move',
      lastName: 'Client',
      email: 'move@example.com',
      clientSource: 'move_fitness',
      password: 'DoNotSend123!',
    });

    expect(post).toHaveBeenCalledWith(
      '/api/admin/clients/create-external',
      expect.objectContaining({
        firstName: 'Move',
        lastName: 'Client',
        email: 'move@example.com',
        clientSource: 'move_fitness',
      }),
      undefined,
    );
    expect(post.mock.calls[0][1]).not.toHaveProperty('password');
  });
  it('contains no client-side temporary password generator', () => {
    const source = readFileSync(resolve(__dirname, './adminClientService.ts'), 'utf8');

    expect(source).not.toContain('generateTempPassword');
    expect(source).not.toContain('Generate temporary password for new clients');
    expect(source).not.toContain('Fisher-Yates shuffle');
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

  it('preserves backend reset-link policy messages for admin surfaces', async () => {
    const post = vi.fn().mockRejectedValue({
      response: {
        data: {
          message: 'Client is inactive. Reactivate the client before sending a password reset link.',
        },
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
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      await expect(service.sendClientPasswordReset('client-42'))
        .rejects.toThrow(/reactivate the client before sending a password reset link/i);
      expect(consoleError).toHaveBeenCalledWith(
        'Error sending password reset:',
        expect.objectContaining({ response: expect.any(Object) }),
      );
    } finally {
      consoleError.mockRestore();
    }
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

describe('adminClientService logWorkout', () => {
  it('routes the Clients & Team workout modal through canonical workout forms for diary and billing truth', async () => {
    const post = vi.fn().mockResolvedValue({
      data: {
        success: true,
        form: {
          id: 'form-42',
          clientId: 42,
          date: '2026-06-08',
          totalSets: 2,
          sessionDeducted: true,
          billing: {
            status: 'deducted',
            shouldDeduct: true,
            sessionDeducted: true,
            creditsDeducted: 1,
            creditsRequired: 1,
            remainingSessions: 3,
          },
        },
        message: 'Workout logged successfully and session deducted',
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

    const result = await service.logWorkout(42, {
      title: 'Leg Day',
      date: '2026-06-08',
      duration: 45,
      intensity: 8,
      notes: 'Strong control',
      exercises: [{
        name: 'Goblet Squat',
        exerciseNote: 'Keep chest tall',
        sets: [
          { setNumber: 1, reps: 10, weight: 40, tempo: '3/1/1', rest: 60, rpe: 7, notes: 'clean' },
          { setNumber: 2, reps: 8, weight: 45 },
        ],
      }],
    });

    expect(post).toHaveBeenCalledWith(
      '/api/workout-forms',
      {
        clientId: 42,
        date: '2026-06-08',
        sessionNotes: 'Strong control',
        overallIntensity: 8,
        exercises: [{
          exerciseName: 'Goblet Squat',
          exerciseNote: 'Keep chest tall',
          sets: [
            { setNumber: 1, reps: 10, weight: 40, tempo: '3/1/1', restTime: 60, rpe: 7, notes: 'clean' },
            { setNumber: 2, reps: 8, weight: 45 },
          ],
        }],
      },
      undefined,
    );
    expect(post).not.toHaveBeenCalledWith(
      '/api/admin/clients/42/workouts',
      expect.anything(),
      undefined,
    );
    expect(result).toMatchObject({
      success: true,
      id: 'form-42',
      workoutId: 'form-42',
      workout: {
        id: 'form-42',
        userId: 42,
        date: '2026-06-08',
        totalSets: 2,
      },
      billing: {
        status: 'deducted',
        sessionDeducted: true,
        creditsDeducted: 1,
      },
    });
  });
});
