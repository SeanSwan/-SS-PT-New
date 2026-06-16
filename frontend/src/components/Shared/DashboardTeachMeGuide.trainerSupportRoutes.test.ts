import { describe, expect, it } from 'vitest';
import { getDashboardTeachMeGuide } from './DashboardTeachMeGuide.logic';

describe('DashboardTeachMeGuide trainer support routes', () => {
  it('keeps schedule, messages, and PLAUD on exact trainer next actions', () => {
    const schedule = getDashboardTeachMeGuide({
      role: 'trainer',
      pathname: '/dashboard/trainer/schedule',
    });

    expect(schedule.title).toBe('Trainer schedule control');
    expect(schedule.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Open Schedule', to: '/dashboard/trainer/schedule' }),
      expect.objectContaining({ label: 'Log Workout', to: '/dashboard/trainer/clients?intent=log_workout' }),
      expect.objectContaining({ label: 'Message Client', to: '/dashboard/trainer/messages' }),
    ]));
    expect(schedule.primaryPrompt).toContain('schedule');

    const messages = getDashboardTeachMeGuide({
      role: 'trainer',
      pathname: '/dashboard/trainer/messages',
    });

    expect(messages.title).toBe('Trainer client messaging');
    expect(messages.primaryAction).toEqual({
      label: 'Open Messages',
      to: '/dashboard/trainer/messages',
    });
    expect(messages.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Open Messages', to: '/dashboard/trainer/messages' }),
      expect.objectContaining({ label: 'Log Workout', to: '/dashboard/trainer/clients?intent=log_workout' }),
      expect.objectContaining({ label: 'Open Coach', to: '/dashboard/trainer/coach-assistant' }),
    ]));

    const plaud = getDashboardTeachMeGuide({
      role: 'trainer',
      pathname: '/dashboard/trainer/plaud',
    });

    expect(plaud.title).toBe('Trainer PLAUD intake');
    expect(plaud.primaryAction).toEqual({
      label: 'Open PLAUD',
      to: '/dashboard/trainer/plaud',
    });
    expect(plaud.fastPath.join(' ')).toMatch(/recording|transcript|client/i);
  });

  it('keeps trainer broadcast routes tied back to the training loop', () => {
    const live = getDashboardTeachMeGuide({
      role: 'trainer',
      pathname: '/dashboard/trainer/live',
    });

    expect(live.title).toBe('Trainer live coaching');
    expect(live.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: 'Live Streams', to: '/dashboard/trainer/live' }),
      expect.objectContaining({ label: 'Log Workout', to: '/dashboard/trainer/clients?intent=log_workout' }),
      expect.objectContaining({ label: 'Schedule', to: '/dashboard/trainer/schedule' }),
    ]));

    const creators = getDashboardTeachMeGuide({
      role: 'trainer',
      pathname: '/dashboard/trainer/creators',
    });

    expect(creators.title).toBe('Trainer creator handoff');
    expect(creators.primaryAction).toEqual({
      label: 'Open Creators',
      to: '/dashboard/trainer/creators',
    });
    expect(creators.focus).toMatch(/client|follow-up/i);
  });
});
