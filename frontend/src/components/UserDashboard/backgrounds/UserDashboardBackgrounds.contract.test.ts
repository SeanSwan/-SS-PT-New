import { describe, expect, it } from 'vitest';
import {
  CUSTOM_USER_DASHBOARD_BACKGROUND_ID,
  DEFAULT_USER_DASHBOARD_BACKGROUND_ID,
  USER_DASHBOARD_BACKGROUNDS,
  USER_DASHBOARD_BACKGROUND_ROTATION_INTERVALS,
  buildUserDashboardBackgroundStyle,
  getNextUserDashboardBackgroundId,
  normalizeBackgroundPreference,
} from './UserDashboardBackgrounds';

describe('UserDashboard background recipes', () => {
  it('ships thirty theme-token driven recipes', () => {
    expect(USER_DASHBOARD_BACKGROUNDS).toHaveLength(30);
    expect(new Set(USER_DASHBOARD_BACKGROUNDS.map((background) => background.id)).size).toBe(30);

    expect(USER_DASHBOARD_BACKGROUNDS.map((background) => background.id)).toEqual(
      expect.arrayContaining([
        'forest-swan',
        'deep-space-swan',
        'matrix-swan',
        'data-aurora-swan',
        'cyberpunk-swan',
        'ocean-swan',
        'ice-cathedral-swan',
        'golden-forge-swan',
        'violet-eclipse-swan',
        'holographic-prism-swan',
      ]),
    );
    USER_DASHBOARD_BACKGROUNDS.forEach((background) => {
      expect(background.name).toBeTruthy();
      expect(background.mood).toBeTruthy();
      expect(background.art).toContain('var(--');
      expect(background.base).toContain('var(--');
      expect(background.art).not.toContain('url(');
    });
  });

  it('uses a practical rotation range from quick preview to daily', () => {
    expect(USER_DASHBOARD_BACKGROUND_ROTATION_INTERVALS.map((item) => item.minutes))
      .toEqual([5, 10, 30, 60, 240, 1440]);
  });

  it('keeps custom photos fixed and requires a safe local image URL', () => {
    expect(normalizeBackgroundPreference({
      mode: 'rotate',
      selectedId: CUSTOM_USER_DASHBOARD_BACKGROUND_ID,
      intervalMinutes: 60,
      customImageUrl: 'javascript:alert(1)',
    })).toEqual({
      mode: 'rotate',
      selectedId: DEFAULT_USER_DASHBOARD_BACKGROUND_ID,
      intervalMinutes: 60,
      customImageUrl: null,
    });

    expect(normalizeBackgroundPreference({
      mode: 'fixed',
      selectedId: CUSTOM_USER_DASHBOARD_BACKGROUND_ID,
      intervalMinutes: 10,
      customImageUrl: 'data:image/jpeg;base64,abc',
    }).selectedId).toBe(CUSTOM_USER_DASHBOARD_BACKGROUND_ID);
  });

  it('rotates through the recipe list and wraps cleanly', () => {
    expect(getNextUserDashboardBackgroundId('ghost-swan')).toBe('crystalline-topography');
    expect(getNextUserDashboardBackgroundId('holographic-prism-swan')).toBe('ghost-swan');
    expect(getNextUserDashboardBackgroundId(CUSTOM_USER_DASHBOARD_BACKGROUND_ID)).toBe('ghost-swan');
  });

  it('builds CSS variables for recipes and custom photo backgrounds', () => {
    const recipeStyle = buildUserDashboardBackgroundStyle('ghost-swan', '/Logo.png');
    expect(recipeStyle['--user-dashboard-bg-art']).toContain('var(--accent-primary');
    expect(recipeStyle['--user-dashboard-bg-mark-image']).toContain('/Logo.png');

    const customStyle = buildUserDashboardBackgroundStyle(
      CUSTOM_USER_DASHBOARD_BACKGROUND_ID,
      '/Logo.png',
      'data:image/jpeg;base64,abc',
    );
    expect(customStyle['--user-dashboard-bg-base']).toContain('data:image/jpeg;base64,abc');
    expect(customStyle['--user-dashboard-bg-base-size']).toBe('auto, cover');
  });
});
