import { describe, expect, it } from 'vitest';
import { themes, themeCycle } from './UniversalThemeContext';
import { themeToggleMetadata } from './UniversalThemeToggle';

describe('Universal theme cycle contract', () => {
  it('keeps every defined theme reachable exactly once from the header toggle cycle', () => {
    const themeIds = Object.keys(themes);

    expect(themeCycle).toHaveLength(themeIds.length);
    expect(new Set(themeCycle).size).toBe(themeCycle.length);
    expect(themeCycle).toEqual(themeIds);
  });

  it('keeps accessible metadata for every reachable theme', () => {
    const themeIds = Object.keys(themes);

    expect(Object.keys(themeToggleMetadata)).toEqual(themeIds);

    for (const themeId of themeIds) {
      const metadata = themeToggleMetadata[themeId as keyof typeof themeToggleMetadata];

      expect(metadata.description).toBe(themes[themeId as keyof typeof themes].name);
      expect(metadata.icon).toBeTruthy();
    }

    expect(themeToggleMetadata['crystalline-default'].description).toBe('Crystalline Swan');
  });
});
