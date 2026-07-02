/**
 * Nutrition command registry contracts
 * ====================================
 * Locks nutrition AI commands to mounted nutrition/food-scanner routes.
 */
import { describe, expect, it } from 'vitest';
import nutritionCommands from '../../services/ai/commandRegistry/nutritionCommands.mjs';
import {
  buildCommandSummaryForClassifier,
  getCommandsForRole,
  initializeRegistry,
} from '../../services/ai/commandRegistry/index.mjs';

const byType = (type) => nutritionCommands.find((command) => command.type === type);

describe('AI nutrition command source contracts', () => {
  it('scan_food targets the mounted food search route without requiring a client ref', () => {
    const scanFood = byType('scan_food');

    expect(scanFood).toMatchObject({
      method: 'GET',
      endpoint: '/api/food-scanner/search',
      destructive: false,
      requiresConfirmation: false,
      requiresClientRef: false,
    });
    expect(scanFood.roleRequired).toEqual(expect.arrayContaining(['admin', 'trainer', 'client']));
  });

  it('exposes read-only scan_food to raw user accounts without exposing trainer nutrition writes', () => {
    initializeRegistry();

    const scanFood = byType('scan_food');
    const userCommandTypes = new Set(getCommandsForRole('user').map((command) => command.type));
    const classifierSummary = buildCommandSummaryForClassifier('user');

    expect(scanFood).toMatchObject({
      destructive: false,
      requiresConfirmation: false,
      requiresClientRef: false,
    });
    expect(scanFood.roleRequired).toEqual(expect.arrayContaining(['admin', 'trainer', 'client', 'user']));
    expect(userCommandTypes).toContain('scan_food');
    expect(userCommandTypes).not.toContain('log_meals');
    expect(userCommandTypes).not.toContain('create_nutrition_plan');
    expect(classifierSummary).toContain('scan_food:');
    expect(classifierSummary).not.toContain('log_meals:');
  });

  it('scan_food accepts voice-friendly food names and barcode strings', () => {
    const scanFood = byType('scan_food');

    expect(scanFood.inputSchema.parse({
      query: 'Greek yogurt',
      limit: '3',
    })).toEqual({
      query: 'Greek yogurt',
      limit: 3,
    });

    expect(scanFood.inputSchema.parse({
      query: '0123456789012',
    })).toEqual({
      barcode: '0123456789012',
      limit: 5,
    });

    expect(scanFood.inputSchema.parse({
      barcode: '12345678',
      limit: 2,
    })).toEqual({
      barcode: '12345678',
      limit: 2,
    });

    expect(() => scanFood.inputSchema.parse({})).toThrow();
  });

  it('flag_sodium_intake targets the mounted macro summary route', () => {
    const sodium = byType('flag_sodium_intake');

    expect(sodium).toMatchObject({
      method: 'GET',
      endpoint: '/api/macros/summary?date=today&userId={clientId}',
      destructive: false,
      requiresConfirmation: false,
      requiresClientRef: true,
    });
    expect(sodium.inputSchema.parse({
      clientId: 42,
      date: '2026-05-31',
      sodiumLimit: '1500',
      mealSodiumLimit: '500',
    })).toEqual({
      clientId: 42,
      date: '2026-05-31',
      sodiumLimit: 1500,
      mealSodiumLimit: 500,
    });
  });
});
