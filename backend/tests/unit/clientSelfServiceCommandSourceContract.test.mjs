/**
 * Client self-service command registry contracts
 * ==============================================
 * Locks workout/progress/gamification self-service commands to mounted client
 * routes and preserves low-friction read filters.
 */
import { describe, expect, it } from 'vitest';
import clientSelfServiceCommands from '../../services/ai/commandRegistry/clientSelfService.mjs';

const byType = (type) => clientSelfServiceCommands.find((command) => command.type === type);

describe('client self-service command registry contracts', () => {
  it('targets mounted workout, measurement, and gamification read routes', () => {
    expect(byType('my_workout_today')).toMatchObject({
      method: 'GET',
      endpoint: '/api/workouts/:myId/current',
      destructive: false,
      requiresConfirmation: false,
      selfService: true,
    });
    expect(byType('log_my_nutrition')).toMatchObject({
      method: 'POST',
      endpoint: '/api/macros',
      destructive: false,
      requiresConfirmation: true,
      selfService: true,
    });
    expect(byType('my_progress')).toMatchObject({
      method: 'GET',
      endpoint: '/api/measurements/user/:myId/stats',
      destructive: false,
      requiresConfirmation: false,
      selfService: true,
    });
    expect(byType('my_xp')).toMatchObject({
      method: 'GET',
      endpoint: '/api/gamification/profile',
      destructive: false,
      requiresConfirmation: false,
      selfService: true,
    });
    expect(byType('my_streaks_badges')).toMatchObject({
      method: 'GET',
      endpoint: '/api/gamification/profile',
      destructive: false,
      requiresConfirmation: false,
      selfService: true,
    });
    expect(byType('track_my_pain')).toMatchObject({
      method: 'POST',
      endpoint: '/api/pain-entries/:myId',
      destructive: false,
      requiresConfirmation: true,
      selfService: true,
    });
    expect(byType('exercises_to_avoid')).toMatchObject({
      method: 'GET',
      endpoint: '/api/pain-entries/:myId/active',
      destructive: false,
      requiresConfirmation: false,
      selfService: true,
    });
    expect(byType('schedule_my_session')).toMatchObject({
      method: 'GET',
      endpoint: '/api/availability/:trainerId/slots',
      destructive: false,
      requiresConfirmation: false,
      selfService: true,
    });
  });

  it('accepts voice-friendly read filters without needing a client ref', () => {
    expect(byType('my_workout_today').inputSchema.parse({})).toEqual({});
    expect(byType('log_my_nutrition').inputSchema.parse({
      date: '2026-05-31',
      meals: [{
        name: 'eggs and toast',
        mealType: 'breakfast',
        calories: '450',
        protein: '28',
      }],
    })).toEqual({
      date: '2026-05-31',
      meals: [{
        description: 'eggs and toast',
        mealType: 'breakfast',
        calories: 450,
        protein: 28,
      }],
    });
    expect(byType('my_progress').inputSchema.parse({
      days: '30',
    })).toEqual({
      days: 30,
    });
    expect(byType('my_xp').inputSchema.parse({})).toEqual({});
    expect(byType('my_streaks_badges').inputSchema.parse({
      limit: '5',
    })).toEqual({
      limit: 5,
    });
    expect(byType('track_my_pain').inputSchema.parse({
      bodyPart: 'lower back',
      painLevel: '7',
      notes: 'Private client wording',
    })).toEqual({
      bodyPart: 'lower back',
      painLevel: 7,
      notes: 'Private client wording',
    });
    expect(byType('exercises_to_avoid').inputSchema.parse({
      limit: '4',
    })).toEqual({
      limit: 4,
    });
    expect(byType('schedule_my_session').inputSchema.parse({
      trainerId: '7',
      date: '2026-06-02',
      duration: '45',
    })).toEqual({
      trainerId: 7,
      date: '2026-06-02',
      duration: 45,
    });
  });
});
