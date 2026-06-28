/**
 * clientOnboardingFollowUpNotificationService.test.mjs
 * =====================================================
 * Locks client-requested onboarding follow-up notifications to in-app,
 * non-sensitive, non-blocking behavior.
 */
import { describe, expect, it, vi } from 'vitest';

import {
  buildCoverageFollowUpNotification,
  createClientCoverageFollowUpNotifications,
} from '../../services/clientOnboardingFollowUpNotificationService.mjs';

describe('clientOnboardingFollowUpNotificationService', () => {
  it('builds concise category-specific in-app tasks for non-sensitive fields', () => {
    const payload = buildCoverageFollowUpNotification({
      clientId: 42,
      actorId: 7,
      item: {
        coverageKey: 'preferred_training_days',
        label: 'Preferred training days',
        category: 'schedule_availability',
        status: 'client_requested',
        metadata: { requiredFor: ['programming', 'communication'] },
      },
    });

    expect(payload).toEqual(expect.objectContaining({
      userId: 42,
      senderId: 7,
      type: 'client',
      title: 'Onboarding follow-up: Schedule and availability',
      message: 'Please update Preferred training days in your onboarding checklist.',
      link: '/dashboard/client/coach-assistant?source=onboarding-follow-up&coverageKey=preferred_training_days',
    }));
  });

  it('redacts sensitive medical prompt detail from notification messages', () => {
    const payload = buildCoverageFollowUpNotification({
      clientId: 42,
      actorId: 7,
      item: {
        coverageKey: 'health_concerns',
        label: 'Health concerns',
        category: 'health_injury_risk',
        status: 'client_requested',
        metadata: { isSensitive: true, requiredFor: ['safety'] },
      },
    });

    expect(payload.message).toBe('Please complete a secure onboarding follow-up for Health, injuries, and risk in your dashboard.');
    expect(payload.message).not.toContain('Health concerns');
  });

  it('creates tasks only for client-requested items and tracks requested timestamps', async () => {
    const notification = { id: 9001 };
    const createNotificationFn = vi.fn(async () => ({ success: true, notification }));
    const update = vi.fn(async () => {});
    const CoverageItemModel = {
      findOne: vi.fn(async () => ({ update })),
    };

    const result = await createClientCoverageFollowUpNotifications({
      clientId: 42,
      actorId: 7,
      coverageItems: [
        { coverageKey: 'health_concerns', label: 'Health concerns', category: 'health_injury_risk', status: 'client_requested', metadata: { isSensitive: true } },
        { coverageKey: 'fitness_level', label: 'Fitness level', category: 'training_history_preferences', status: 'known' },
      ],
      createNotificationFn,
      CoverageItemModel,
    });

    expect(createNotificationFn).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      requestedFromClient: true,
      requestedFromClientAt: expect.any(Date),
      metadata: expect.objectContaining({ followUpNotificationId: 9001 }),
    }), expect.any(Object));
    expect(result).toEqual(expect.objectContaining({
      requested: 1,
      created: 1,
      skipped: 1,
      failed: 0,
    }));
  });

  it('does not fail the approved ledger write when notification creation fails', async () => {
    const createNotificationFn = vi.fn(async () => ({ success: false, error: 'socket unavailable' }));

    const result = await createClientCoverageFollowUpNotifications({
      clientId: 42,
      actorId: 7,
      coverageItems: [
        { coverageKey: 'primary_goal', label: 'Primary training goal', category: 'goals_outcomes', status: 'client_requested' },
      ],
      createNotificationFn,
      CoverageItemModel: { findOne: vi.fn() },
    });

    expect(result).toEqual(expect.objectContaining({
      requested: 1,
      created: 0,
      skipped: 0,
      failed: 1,
    }));
  });
});
