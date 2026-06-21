import { readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';
import { buildRestaurantLogPayload, formatRestaurantMacro, formatRestaurantServing, splitRestaurantResults } from './RestaurantTab.logic';
import type { FoodDetail, FoodResult } from '../../hooks/useRestaurantSearch';

const makeDetail = (overrides: Partial<FoodDetail> = {}): FoodDetail => ({
  id: 'food-1',
  name: 'Burrito Bowl',
  brand: 'Chipotle',
  type: 'Brand',
  primaryServing: {
    description: '1 bowl',
    calories: 620,
    protein: 42,
    carbs: 68,
    fat: 21,
    fiber: 8,
    sugar: 6,
    sodium: 1480,
    cholesterol: 95,
    saturatedFat: 8,
  },
  servings: [],
  source: 'fatsecret',
  ...overrides,
});

describe('RestaurantTab logic', () => {
  it('builds the same food-log payload shape for restaurant detail saves', () => {
    expect(buildRestaurantLogPayload(makeDetail())).toEqual({
      name: 'Chipotle Burrito Bowl',
      calories: 620,
      protein: 42,
      carbs: 68,
      fat: 21,
      portion: '1 bowl',
      brandName: 'Chipotle',
      mealSource: 'restaurant',
    });
  });

  it('does not persist malformed provider serving labels in restaurant detail saves', () => {
    const detail = makeDetail({
      primaryServing: {
        ...makeDetail().primaryServing,
        description: '1e2g',
      },
    });

    expect(buildRestaurantLogPayload(detail).portion).toBe('Serving details unavailable');
  });

  it('keeps brand and generic results separated for the mounted result sections', () => {
    const results = [
      { id: '1', brand: 'Panera', name: 'Soup' },
      { id: '2', brand: null, name: 'Rice' },
    ] as FoodResult[];

    expect(splitRestaurantResults(results)).toEqual({
      brandResults: [results[0]],
      genericResults: [results[1]],
    });
  });

  it('rejects malformed provider macro values before display', () => {
    expect(formatRestaurantMacro('1e3', ' cal')).toBeNull();
    expect(formatRestaurantMacro('0x10', 'g P')).toBeNull();
    expect(formatRestaurantMacro(['45'], 'g C')).toBeNull();
    expect(formatRestaurantMacro(Number.POSITIVE_INFINITY, 'g F')).toBeNull();
    expect(formatRestaurantMacro('4.5', 'g fat')).toBe('4.5g fat');
  });

  it('rejects malformed provider serving labels before display', () => {
    expect(formatRestaurantServing('1 bowl')).toBe('1 bowl');
    expect(formatRestaurantServing('100g')).toBe('100g');
    expect(formatRestaurantServing('1e2g')).toBeNull();
    expect(formatRestaurantServing('0g')).toBeNull();
    expect(formatRestaurantServing('0')).toBeNull();
    expect(formatRestaurantServing('0x10g')).toBeNull();
    expect(formatRestaurantServing(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it('keeps the mounted RestaurantTab display wired through the formatter', () => {
    const source = readFileSync('src/components/FoodTracker/RestaurantTab.tsx', 'utf8');
    expect(source).toContain('formatRestaurantMacro(selectedFood.primaryServing.calories');
    expect(source).toContain('formatRestaurantServing(selectedFood.primaryServing.description)');
    expect(source).toContain('formatRestaurantServing(serving.description)');
    expect(source).toContain('formatRestaurantMacro(food.calories');
    expect(source).toContain('formatRestaurantServing(food.servingSize)');
  });
});
