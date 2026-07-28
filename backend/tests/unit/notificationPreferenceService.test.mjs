import { describe, expect, it } from 'vitest';

import {
  NOTIFICATION_PREFERENCE_CATEGORIES,
  mergeNotificationPreferences,
  normalizeNotificationPreferences,
} from '../../services/notificationPreferenceService.mjs';

describe('notificationPreferenceService', () => {
  it('normalizes legacy user flags into channel and category preferences', () => {
    const prefs = normalizeNotificationPreferences(null, {
      emailNotifications: false,
      smsNotifications: true,
    });

    expect(prefs.channels).toEqual({ inApp: true, email: false, sms: true, push: false });
    expect(prefs.categories.messages).toEqual({ inApp: true, email: false, sms: false, push: false });
    expect(prefs.categories.schedule).toEqual({ inApp: true, email: false, sms: true, push: false });
    expect(prefs.quietHours).toEqual({ enabled: false, start: '21:00', end: '07:00', timezone: 'local' });
  });

  it('normalizes enterprise categories and maps legacy social/commerce aliases', () => {
    expect(NOTIFICATION_PREFERENCE_CATEGORIES).toEqual([
      'action_required',
      'messages',
      'schedule',
      'training',
      'billing',
      'community',
      'achievements',
      'system',
      'admin',
    ]);

    const prefs = normalizeNotificationPreferences({
      categories: {
        action_required: { email: true, sms: true, push: true },
        social: { email: true },
        commerce: { sms: true },
        madeUp: { push: true },
      },
    });

    expect(Object.keys(prefs.categories)).toEqual(NOTIFICATION_PREFERENCE_CATEGORIES);
    expect(prefs.categories.action_required).toMatchObject({ inApp: true, email: true, sms: true, push: true });
    expect(prefs.categories.community).toMatchObject({ inApp: true, email: true, sms: false, push: false });
    expect(prefs.categories.billing).toMatchObject({ inApp: true, email: true, sms: true, push: false });
    expect(prefs.categories).not.toHaveProperty('social');
    expect(prefs.categories).not.toHaveProperty('commerce');
    expect(prefs.categories).not.toHaveProperty('madeUp');
  });

  it('merges updates while dropping unknown categories and invalid quiet-hour values', () => {
    const current = normalizeNotificationPreferences({
      categories: { messages: { email: false } },
      quietHours: { enabled: false, start: '21:00', end: '07:00', timezone: 'local' },
    });

    const prefs = mergeNotificationPreferences(current, {
      channels: { email: false, sms: true, push: true },
      categories: {
        messages: { email: true, push: true },
        madeUp: { sms: true },
      },
      quietHours: { enabled: true, start: '25:00', end: '06:15', timezone: 'America/Los_Angeles' },
    });

    expect(prefs.channels).toEqual({ inApp: true, email: false, sms: true, push: true });
    expect(prefs.categories.messages).toMatchObject({ inApp: true, email: true, sms: false, push: true });
    expect(prefs.categories).not.toHaveProperty('madeUp');
    expect(prefs.quietHours).toEqual({ enabled: true, start: '21:00', end: '06:15', timezone: 'America/Los_Angeles' });
  });

  it('normalizes digest cadence and preview visibility preferences', () => {
    const current = normalizeNotificationPreferences({
      digestFrequency: 'daily',
      showPreview: false,
    });

    expect(current.digestFrequency).toBe('daily');
    expect(current.showPreview).toBe(false);

    const validUpdate = mergeNotificationPreferences(current, {
      digestFrequency: 'hourly',
      showPreview: true,
    });

    expect(validUpdate.digestFrequency).toBe('hourly');
    expect(validUpdate.showPreview).toBe(true);

    const invalidUpdate = mergeNotificationPreferences(validUpdate, {
      digestFrequency: 'weekly',
      showPreview: 'nope',
    });

    expect(invalidUpdate.digestFrequency).toBe('hourly');
    expect(invalidUpdate.showPreview).toBe(true);
  });
});
