/**
 * Real-time schedule privacy contract.
 *
 * Proves that broad role rooms receive only schedule invalidation metadata,
 * while authorized session, assigned-trainer, client, and admin rooms retain
 * the full event required for private workflows.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const emitted = [];

vi.mock('../../socket/socketManager.mjs', () => ({
  getIO: () => ({
    to: (room) => ({
      emit: (event, payload) => emitted.push({ room, event, payload }),
      except: (excludedUser) => ({
        emit: (event, payload) => emitted.push({ room, excludedUser, event, payload }),
      }),
    }),
  }),
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../models/index.mjs', () => ({
  getUser: vi.fn(),
  getSession: vi.fn(),
}));

const { realTimeScheduleService } = await import('../../services/realTimeScheduleService.mjs');

const SESSION = {
  id: 91,
  trainerId: 7,
  userId: 42,
  startTime: '2026-07-17T18:00:00.000Z',
  endTime: '2026-07-17T19:00:00.000Z',
  status: 'scheduled',
  location: 'Studio A',
};

function emissionFor(room) {
  return emitted.find((entry) => entry.room === room);
}

function broadEmissions() {
  return emitted.filter((entry) => ['trainer', 'client', 'public'].includes(entry.room));
}

describe('real-time schedule room privacy', () => {
  beforeEach(() => {
    emitted.length = 0;
    realTimeScheduleService.resetMetrics();
  });

  it('keeps booking identity private while preserving broad invalidation metadata', async () => {
    await realTimeScheduleService.broadcastSessionBooked(SESSION, {
      id: 42,
      firstName: 'Private',
      lastName: 'Client',
    });

    expect(emissionFor('trainer:7')).toMatchObject({
      event: 'schedule:update',
      payload: {
        clientId: 42,
        data: {
          clientId: 42,
          clientName: 'Private Client',
        },
      },
    });
    expect(emissionFor('user:42').payload.data.clientName).toBe('Private Client');

    const broadTrainer = emissionFor('trainer');
    expect(broadTrainer.payload.clientId).toBeNull();
    expect(broadTrainer.payload.trainerId).toBeNull();
    expect(broadTrainer.payload.data).toEqual({ sessionId: 91 });
    expect(broadTrainer.payload.data).not.toHaveProperty('clientId');
    expect(broadTrainer.payload.data).not.toHaveProperty('clientName');
  });

  it('removes private update fields from every broad schedule room', async () => {
    await realTimeScheduleService.broadcastSessionUpdated(SESSION, {
      startTime: SESSION.startTime,
      notes: 'Private medical accommodation',
      internalClientFlag: 'restricted',
    });

    expect(emissionFor('trainer:7').payload.data.changes.notes)
      .toBe('Private medical accommodation');
    expect(emissionFor('user:42').payload.data.changes.internalClientFlag)
      .toBe('restricted');

    expect(broadEmissions()).toHaveLength(3);
    for (const entry of broadEmissions()) {
      expect(entry.payload.clientId).toBeNull();
      expect(entry.payload.trainerId).toBeNull();
      expect(entry.payload.data).toEqual({ sessionId: 91, status: 'scheduled' });
      expect(entry.payload.data).not.toHaveProperty('clientId');
      expect(entry.payload.data).not.toHaveProperty('changes');
      expect(JSON.stringify(entry.payload)).not.toContain('Private medical accommodation');
      expect(JSON.stringify(entry.payload)).not.toContain('restricted');
    }
  });

  it('does not spread arbitrary completion objects into schedule events', async () => {
    await realTimeScheduleService.broadcastSessionCompleted(SESSION, {
      email: 'private@example.com',
      phone: '+15555550123',
      password: 'never-broadcast',
      attendanceStatus: 'present',
    });

    for (const entry of emitted) {
      expect(entry.payload.data).not.toHaveProperty('email');
      expect(entry.payload.data).not.toHaveProperty('phone');
      expect(entry.payload.data).not.toHaveProperty('password');
      expect(JSON.stringify(entry.payload)).not.toContain('never-broadcast');
    }
    expect(emissionFor('trainer:7').payload.data).toMatchObject({
      sessionId: 91,
      trainerId: 7,
      clientId: 42,
      attendanceStatus: 'present',
    });
  });

  it('drops object-shaped cancellation metadata instead of serializing user models', async () => {
    await realTimeScheduleService.broadcastSessionCancelled(
      SESSION,
      { email: 'private@example.com', password: 'never-broadcast' },
      { id: 42, phone: '+15555550123' },
    );

    for (const entry of emitted) {
      expect(entry.payload.data).not.toHaveProperty('reason');
      expect(entry.payload.data).not.toHaveProperty('cancelledBy');
      expect(JSON.stringify(entry.payload)).not.toContain('private@example.com');
      expect(JSON.stringify(entry.payload)).not.toContain('never-broadcast');
      expect(JSON.stringify(entry.payload)).not.toContain('+15555550123');
    }
  });

  it('honors explicit role-room targeting used by broadcast helpers', async () => {
    await realTimeScheduleService.broadcastToTrainers('schedule:refresh', {
      reason: 'availability_changed',
    });

    expect(emissionFor('trainer')).toMatchObject({
      event: 'schedule:update',
      payload: { type: 'schedule:refresh' },
    });
  });
});
