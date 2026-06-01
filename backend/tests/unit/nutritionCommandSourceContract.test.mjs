/**
 * Nutrition command registry contracts
 * ====================================
 * Locks nutrition AI commands to mounted nutrition/food-scanner routes.
 */
import { describe, expect, it } from 'vitest';
import nutritionCommands from '../../services/ai/commandRegistry/nutritionCommands.mjs';

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
