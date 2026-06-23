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

const hexToRgb = (hex: string) => {
  const normalized = hex.replace('#', '');
  const value = Number.parseInt(normalized, 16);

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
};

const channelToLinear = (channel: number) => {
  const value = channel / 255;

  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};

const relativeLuminance = (hex: string) => {
  const { r, g, b } = hexToRgb(hex);

  return 0.2126 * channelToLinear(r) + 0.7152 * channelToLinear(g) + 0.0722 * channelToLinear(b);
};

const contrastRatio = (foreground: string, background: string) => {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
};

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

  it('keeps Arctic Dawn premium-light instead of washed-out white-on-white', () => {
    const arcticDawn = themes['crystalline-light'];

    expect(arcticDawn.colors.void.toLowerCase()).toBe('#0b1726');
    expect(contrastRatio(arcticDawn.text.muted, arcticDawn.background.primary)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(arcticDawn.text.accent, arcticDawn.background.primary)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(arcticDawn.colors.void, arcticDawn.background.primary)).toBeGreaterThanOrEqual(7);
    expect(arcticDawn.background.surface).not.toContain('255, 255, 255');
    expect(arcticDawn.background.elevated).not.toContain('255, 255, 255');
    expect(arcticDawn.gradients.card).not.toContain('rgba(255, 255, 255');
  });
});
