import { describe, expect, it } from 'vitest';
import { buildCoachCommandTitle } from './CoachCommandCenter.commandTitle';

describe('buildCoachCommandTitle', () => {
  it('keeps active thread titles authoritative', () => {
    expect(buildCoachCommandTitle({
      activeThreadTitle: 'Ava thread',
      commandText: 'Check plan',
      hasActiveThread: true,
      routeClientLabel: 'Client #42',
      routeIntent: 'plan_review',
    })).toBe('Ava thread');
  });

  it('labels Build Plan review routes as plan review, not workout logs', () => {
    expect(buildCoachCommandTitle({
      activeThreadTitle: 'Unused',
      commandText: 'Check Day 2',
      hasActiveThread: false,
      routeClientLabel: 'Client #42',
      routeIntent: 'plan_review',
    })).toBe('Client #42 Build Plan review');
  });

  it('keeps existing onboarding and daily log titles', () => {
    expect(buildCoachCommandTitle({
      activeThreadTitle: 'Unused',
      commandText: 'Start onboarding',
      hasActiveThread: false,
      routeClientLabel: null,
      routeIntent: 'client_onboarding',
    })).toBe('New client onboarding');
    expect(buildCoachCommandTitle({
      activeThreadTitle: 'Unused',
      commandText: 'Bench 3x10',
      hasActiveThread: false,
      routeClientLabel: 'Client #7',
      routeIntent: 'log_workout',
    })).toBe('Client #7 daily workout log');
  });
});
