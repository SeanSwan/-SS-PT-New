import { describe, expect, it } from 'vitest';
import { shouldRouteToCommandLane } from './CoachCommandCenter.commandLane';

describe('CoachCommandCenter command lane routing', () => {
  it('routes recall-style trainer commands into the deterministic command lane', () => {
    expect(shouldRouteToCommandLane('what did we do last time')).toBe(true);
    expect(shouldRouteToCommandLane('what did Ava Stone do last workout')).toBe(true);
    expect(shouldRouteToCommandLane('where is Ava Stone in onboarding')).toBe(true);
  });

  it('keeps normal conversation in chat', () => {
    expect(shouldRouteToCommandLane('thanks, that makes sense')).toBe(false);
  });
});
