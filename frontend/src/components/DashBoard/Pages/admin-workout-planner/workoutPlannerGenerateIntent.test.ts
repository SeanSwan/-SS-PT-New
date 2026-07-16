/**
 * H4 contract: spoken generate detail becomes validated overrides — never a
 * guess, never a raw string passed through to the generation request.
 */
import { describe, expect, it } from 'vitest';
import {
  normalizePlannerGeneratePayload,
  plannerGenerateReceiptText,
} from './workoutPlannerGenerateIntent';

describe('normalizePlannerGeneratePayload', () => {
  it('maps canonical and spoken category names', () => {
    expect(normalizePlannerGeneratePayload({ category: 'legs' }).category).toBe('legs');
    expect(normalizePlannerGeneratePayload({ category: 'Leg day' }).category).toBe('legs');
    expect(normalizePlannerGeneratePayload({ category: 'lower body' }).category).toBe('legs');
    expect(normalizePlannerGeneratePayload({ category: 'full body' }).category).toBe('full_body');
    expect(normalizePlannerGeneratePayload({ category: 'full_body' }).category).toBe('full_body');
  });

  it('maps spoken goals to canonical plan goals', () => {
    expect(normalizePlannerGeneratePayload({ goal: 'muscle growth' }).goal).toBe('hypertrophy');
    expect(normalizePlannerGeneratePayload({ goal: 'Fat Loss' }).goal).toBe('fat_loss');
    expect(normalizePlannerGeneratePayload({ goal: 'strength' }).goal).toBe('strength');
    expect(normalizePlannerGeneratePayload({ goal: 'golf' }).goal).toBe('golf_performance');
  });

  it('accepts only NASM phases 1-5', () => {
    expect(normalizePlannerGeneratePayload({ phase: 3 }).phaseNumber).toBe(3);
    expect(normalizePlannerGeneratePayload({ phase: '4' }).phaseNumber).toBe(4);
    expect(normalizePlannerGeneratePayload({ phase: 9 }).phaseNumber).toBeUndefined();
    expect(normalizePlannerGeneratePayload({ phase: 0 }).phaseNumber).toBeUndefined();
  });

  it('drops unrecognized detail instead of guessing and survives junk payloads', () => {
    expect(normalizePlannerGeneratePayload({ category: 'mobility flow', goal: 'vibes' })).toEqual({});
    expect(normalizePlannerGeneratePayload(undefined)).toEqual({});
    expect(normalizePlannerGeneratePayload({ preventDefault: () => {} })).toEqual({});
  });
});

describe('plannerGenerateReceiptText', () => {
  it('names exactly what is being generated', () => {
    expect(plannerGenerateReceiptText({ category: 'legs', goal: 'hypertrophy', phaseNumber: 3 }))
      .toBe('Generating a fresh legs workout — hypertrophy, Phase 3…');
    expect(plannerGenerateReceiptText({})).toBe('Generating a fresh workout…');
  });
});
