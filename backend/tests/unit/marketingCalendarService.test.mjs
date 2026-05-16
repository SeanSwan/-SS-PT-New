/**
 * Marketing Calendar Service - Unit Tests
 * =======================================
 * TDD coverage for persisted marketing calendar items plus read-only
 * personal-training calendar awareness.
 */

import { describe, expect, it, vi } from 'vitest';
import { createMarketingCalendarService } from '../../services/marketingCalendarService.mjs';

const makeRow = (data) => ({
  ...data,
  get: vi.fn(() => data),
  update: vi.fn(async (patch) => makeRow({ ...data, ...patch })),
  destroy: vi.fn(async () => undefined),
});

const makeService = ({ calendarRows = [], sessionRows = [] } = {}) => {
  const CalendarModel = {
    findAll: vi.fn(async () => calendarRows.map(makeRow)),
    findByPk: vi.fn(async (id) => {
      const row = calendarRows.find(item => String(item.id) === String(id));
      return row ? makeRow(row) : null;
    }),
    create: vi.fn(async (payload) => makeRow({
      id: 'marketing-1',
      createdAt: new Date('2026-05-16T12:00:00.000Z'),
      updatedAt: new Date('2026-05-16T12:00:00.000Z'),
      ...payload,
    })),
  };
  const SessionModel = {
    findAll: vi.fn(async () => sessionRows.map(makeRow)),
  };

  return {
    service: createMarketingCalendarService({ CalendarModel, SessionModel }),
    CalendarModel,
    SessionModel,
  };
};

describe('marketingCalendarService', () => {
  it('creates a persisted marketing item and returns PT conflicts as advisory only', async () => {
    const { service, CalendarModel } = makeService({
      sessionRows: [
        {
          id: 42,
          sessionDate: new Date('2026-05-16T18:15:00.000Z'),
          endDate: new Date('2026-05-16T19:15:00.000Z'),
          duration: 60,
          status: 'confirmed',
          trainerId: 7,
          userId: 21,
          location: 'Studio',
        },
      ],
    });

    const result = await service.createItem({
      title: 'Neighborhood training offer',
      content: 'Local training offer for next week.',
      channel: 'social',
      platform: 'nextdoor',
      scheduledAt: '2026-05-16T18:00:00.000Z',
      durationMinutes: 45,
      timezone: 'America/Los_Angeles',
    }, { userId: 1 });

    expect(CalendarModel.create).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Neighborhood training offer',
      platform: 'nextdoor',
      status: 'draft',
      createdBy: 1,
      scheduledAt: new Date('2026-05-16T18:00:00.000Z'),
    }));
    expect(result.item.id).toBe('marketing-1');
    expect(result.advisories).toEqual([
      expect.objectContaining({
        calendar: 'personal_training',
        externalId: '42',
        severity: 'advisory',
        blocksScheduling: false,
      }),
    ]);
  });

  it('lists persisted marketing items and never injects demo calendar events', async () => {
    const { service } = makeService({
      calendarRows: [
        {
          id: 'stored-1',
          title: 'Stored campaign post',
          content: 'Persisted content',
          channel: 'social',
          platform: 'instagram',
          status: 'scheduled',
          scheduledAt: new Date('2026-05-17T15:00:00.000Z'),
          durationMinutes: 30,
          timezone: 'America/Los_Angeles',
          createdAt: new Date('2026-05-16T12:00:00.000Z'),
          updatedAt: new Date('2026-05-16T12:00:00.000Z'),
        },
      ],
    });

    const result = await service.listItems({
      start: '2026-05-17T00:00:00.000Z',
      end: '2026-05-18T00:00:00.000Z',
    });

    expect(result).toEqual([
      expect.objectContaining({
        id: 'stored-1',
        title: 'Stored campaign post',
        advisories: [],
      }),
    ]);
    expect(result.map(item => item.title)).not.toContain('Instagram: Monday Motivation Reel');
  });

  it('rejects invalid calendar payloads before hitting the database', async () => {
    const { service, CalendarModel } = makeService();

    await expect(service.createItem({ title: '', scheduledAt: '' }, { userId: 1 }))
      .rejects
      .toThrow('title is required');

    expect(CalendarModel.create).not.toHaveBeenCalled();
  });
});
