import { describe, expect, it } from 'vitest';
import { commandResultSummary } from './coachCommandResultSummary';

const client = { id: 7, firstName: 'Sam' };

describe('commandResultSummary', () => {
  it('summarizes workout, nutrition, and client-list command receipts', () => {
    expect(commandResultSummary('log_workout', {
      exerciseCount: 3,
      totalSets: 12,
      xpAwarded: 45,
    }, client)).toBe('Workout logged for Sam. 3 exercise(s), 12 sets. +45 XP.');

    expect(commandResultSummary('log_meals', {
      mealsLogged: 2,
      date: '2026-06-01',
      totalCalories: 1900,
      totalProtein: 150,
    }, client)).toBe('2 meals logged for Sam on 2026-06-01. 1900 kcal. 150g protein.');

    expect(commandResultSummary('list_active_clients', {
      returnedCount: 3,
      totalCount: 4,
      swanStudiosCount: 2,
      moveFitnessCount: 1,
    }, null)).toBe('3 of 4 active clients loaded. 2 SwanStudios. 1 Move Fitness.');
  });

  it('summarizes measurement and pain command receipts', () => {
    expect(commandResultSummary('view_measurement_trends', {
      totalMeasurements: 2,
      latestWeight: 181,
      weightChange: -4,
      bodyFatChange: -1.2,
      daysSinceStart: 30,
    }, client)).toBe('2 measurements for Sam. Latest: 181 lbs. Weight change: -4 lbs. Body fat: -1.2%. Over 30 days.');

    expect(commandResultSummary('view_latest_measurements', {
      measurementDate: null,
    }, client)).toBe('No measurements on file for Sam.');

    const painReceipt = commandResultSummary('add_pain_entry', {
      bodyRegion: 'left_knee',
      painLevel: 7,
    }, client);

    expect(painReceipt).toContain('Pain entry logged for Sam');
    expect(painReceipt).toContain('left knee');
    expect(painReceipt).toContain('Level 7/10.');
  });

  it('summarizes scheduling and fallback receipts', () => {
    expect(commandResultSummary('view_available_slots', {
      availableSlotCount: 2,
      date: '2026-06-03',
      durationMinutes: 45,
      firstSlotStartUtc: '15:00',
      lastSlotEndUtc: '18:45',
    }, null)).toBe('2 available slots on 2026-06-03 for 45-minute sessions. First starts at 15:00 UTC. Last ends at 18:45 UTC.');

    expect(commandResultSummary('view_today_sessions', {
      count: 0,
      date: '2026-06-03',
    }, null)).toBe('No sessions scheduled on 2026-06-03.');

    expect(commandResultSummary('navigate_client_profile', {
      destination: 'Client Profile',
    }, null)).toBe('Navigated to Client Profile.');

    expect(commandResultSummary('view_goal_progress', {}, null)).toBe('View Goal Progress loaded.');
    expect(commandResultSummary('custom_command', {}, null)).toBe('custom command completed.');
  });
});
