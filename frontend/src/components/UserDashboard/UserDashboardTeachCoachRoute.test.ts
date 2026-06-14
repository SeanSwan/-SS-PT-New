import { describe, expect, it } from 'vitest';
import {
  USER_HOME_TRAINING_PROMPT,
  USER_WORKOUTS_TEACH_PROMPT,
  buildUserDashboardTeachCoachRoute,
  buildUserWorkoutsCoachPrompt,
} from './UserDashboardTeachCoachRoute';

describe('buildUserDashboardTeachCoachRoute', () => {
  it('routes user Teach Me prompts into the client Coach assistant as a staged prompt', () => {
    const route = buildUserDashboardTeachCoachRoute(' teach me the workout log flow ');
    const url = new URL(route, 'https://app.local');

    expect(url.pathname).toBe('/dashboard/client/coach-assistant');
    expect(url.searchParams.get('teachPrompt')).toBe('teach me the workout log flow');
  });

  it('keeps blank prompts as a normal Coach route', () => {
    expect(buildUserDashboardTeachCoachRoute('   ')).toBe('/dashboard/client/coach-assistant');
  });

  it('keeps the workouts prompt generic enough for a URL handoff', () => {
    expect(USER_WORKOUTS_TEACH_PROMPT).toContain('workouts tab');
    expect(USER_WORKOUTS_TEACH_PROMPT).not.toMatch(/client|user|name|email|phone/i);
  });

  it('keeps the Home training prompt focused on the training loop', () => {
    expect(USER_HOME_TRAINING_PROMPT).toContain('Home training loop');
    expect(USER_HOME_TRAINING_PROMPT).toContain("today's session");
    expect(USER_HOME_TRAINING_PROMPT).not.toMatch(/client|user|name|email|phone/i);
  });

  it('adds a compact workout snapshot for one-click Coach handoffs without PII', () => {
    const prompt = buildUserWorkoutsCoachPrompt({
      hasHistory: true,
      totalExerciseTouches: 7,
      mostActiveCategory: 'Back',
      streak: 3,
      topExercise: 'Lat Pulldown',
    });

    expect(prompt).toContain('Current workout snapshot');
    expect(prompt).toContain('7 logged exercise touches');
    expect(prompt).toContain('Most active: Back');
    expect(prompt).toContain('Current streak: 3 days');
    expect(prompt).toContain('Top movement: Lat Pulldown');
    expect(prompt).toContain('recommend the next workout to log');
    expect(prompt).not.toMatch(/client|user|name|email|phone/i);
    expect(prompt.length).toBeLessThan(460);
  });
});
