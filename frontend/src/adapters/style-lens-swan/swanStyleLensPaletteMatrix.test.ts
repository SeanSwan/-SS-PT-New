import { describe, expect, it } from 'vitest';
import {
  DEFAULT_APPEARANCE_PROFILE,
  validateAppearanceProfile,
} from '../../core/style-lens-os';
import { themes } from '../../context/ThemeContext/UniversalThemeContext';
import {
  SWAN_SENTINEL_MANIFESTS,
  SWAN_STYLE_LENS_REGISTRY,
} from './index';

const luminance = (hex: string) => {
  const channels = hex.match(/[a-f\d]{2}/gi)?.map((value) => parseInt(value, 16) / 255) ?? [];
  const linear = channels.map((value) =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
};

const contrast = (foreground: string, background: string) => {
  const values = [luminance(foreground), luminance(background)];
  return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
};

describe('Swan color theme and structural lens precedence', () => {
  it('keeps color identity additive across every registered theme and sentinel', () => {
    const themeIds = Object.keys(themes);
    expect(themeIds.length).toBeGreaterThanOrEqual(18);

    themeIds.forEach((paletteThemeId) => {
      SWAN_SENTINEL_MANIFESTS.forEach((lens) => {
        expect(lens.palettePolicy).toEqual({ mode: 'inherit-any' });
        expect(
          validateAppearanceProfile(
            {
              ...DEFAULT_APPEARANCE_PROFILE,
              paletteThemeId,
              styleLensId: lens.id,
              updatedAt: '2026-07-11T23:30:00.000Z',
            },
            SWAN_STYLE_LENS_REGISTRY,
          ).ok,
          `${paletteThemeId} + ${lens.id}`,
        ).toBe(true);
      });
    });

  });
  it('proves primary text contrast across the full color by sentinel matrix', () => {
    const rows = Object.entries(themes).map(([id, theme]) => ({
      id,
      ratio: contrast(theme.text.primary, theme.background.primary),
    }));
    const minimum = rows.reduce((lowest, row) =>
      row.ratio < lowest.ratio ? row : lowest,
    );
    const light = rows.find(({ id }) => id === 'crystalline-light');
    const combinations = rows.length * SWAN_SENTINEL_MANIFESTS.length;

    console.log(
      `[style-lens-palette-matrix] themes=${rows.length} combinations=${combinations} min=${minimum.id}:${minimum.ratio.toFixed(2)} light=${light?.ratio.toFixed(2)}`,
    );
    expect(rows.every(({ ratio }) => ratio >= 4.5)).toBe(true);
    expect(light?.ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('defines color as token ownership and lenses as structural ownership', () => {
    expect(SWAN_SENTINEL_MANIFESTS.every(
      ({ palettePolicy }) => palettePolicy.mode === 'inherit-any',
    )).toBe(true);
  });
});
