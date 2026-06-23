import { describe, expect, it } from 'vitest';
import { themes, themeCycle } from './UniversalThemeContext';
import { themeToggleMetadata } from './UniversalThemeToggle';

const premiumThemeIds = [
  'ruby-forge',
  'emerald-vault',
  'solar-gold',
  'amethyst-night',
  'rose-quartz',
  'copper-patina',
  'aqua-abyss',
  'graphite-luxe',
  'pearl-noir',
  'circuit-lime',
] as const;

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

  it('adds ten premium colorways to the theme changer without hiding them from the cycle', () => {
    expect(premiumThemeIds).toHaveLength(10);

    for (const themeId of premiumThemeIds) {
      const theme = themes[themeId as keyof typeof themes];

      expect(theme).toBeDefined();
      expect(themeCycle).toContain(themeId);
      expect(themeToggleMetadata[themeId as keyof typeof themeToggleMetadata].description).toBe(theme.name);
    }
  });

  it('tunes Carbon Fiber as a graphite and platinum theme instead of another cyan-blue theme', () => {
    const carbon = themes['carbon-fiber'];
    const fixedBlueValues = ['#60c0f0', '#50a0f0', '#002060', '#003080'];

    expect(fixedBlueValues).not.toContain(carbon.colors.primary.toLowerCase());
    expect(fixedBlueValues).not.toContain(carbon.colors.primaryBlue.toLowerCase());
    expect(carbon.colors.primary.toLowerCase()).toBe('#d8dee6');
    expect(carbon.colors.secondary.toLowerCase()).toBe('#a7b0bc');
  });
});
