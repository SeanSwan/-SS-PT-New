import { describe, expect, it } from 'vitest';
import { hasDispatcher } from '../../services/ai/commandDispatcher.mjs';
import scheduleCommands from '../../services/ai/commandRegistry/scheduleCommands.mjs';

const scheduleSessionCommand = scheduleCommands.find((command) => command.type === 'schedule_session');
const rescheduleSessionCommand = scheduleCommands.find((command) => command.type === 'reschedule_session');

describe('Swan Coach schedule command dispatcher contract', () => {
  it('wires trainer/admin scheduling commands that are exposed in the registry', () => {
    expect(hasDispatcher('schedule_session')).toBe(true);
    expect(hasDispatcher('reschedule_session')).toBe(true);
    expect(hasDispatcher('set_availability')).toBe(true);
  });

  it('preserves an admin-dictated trainer assignment for schedule_session', () => {
    const parsed = scheduleSessionCommand.inputSchema.safeParse({
      clientId: 44,
      trainerId: 7,
      date: '2026-06-01',
      time: '15:30',
      duration: 45,
    });

    expect(parsed.success).toBe(true);
    expect(parsed.data.trainerId).toBe(7);
  });

  it('advertises mounted session write routes instead of the retired admin/create path', () => {
    expect(scheduleSessionCommand.endpoint).toBe('/api/sessions/admin/book');
    expect(rescheduleSessionCommand.endpoint).toBe('/api/sessions/:sessionId/reschedule');
    expect(scheduleCommands.map((command) => command.endpoint)).not.toContain('/api/sessions/admin/create');
  });
});
