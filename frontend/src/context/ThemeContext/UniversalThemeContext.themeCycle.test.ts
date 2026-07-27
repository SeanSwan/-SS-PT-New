import { describe, expect, it } from 'vitest';
import { themes, themeCycle, type ThemeId } from './UniversalThemeContext';
import { themeToggleMetadata } from './UniversalThemeToggle';
import { generateCSSVariables } from '../../utils/theme/themeUtils';

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
  // 2026-07-03 identity wave
  'sakura-midnight',
  'indigo-pulse',
  'sunset-mirage',
  'steel-tempest',
  'vapor-dream',
  'burgundy-noir',
  'tron-grid',
  'orchid-veil',
  'deep-jade',
  'midnight-mango',
  // 2026-07-22 finishing pass — four curated, code-verified colorways
  'crimson-vault',
  'verdant-signal',
  'indigo-rite',
  'violet-ember',
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

  it('adds every premium colorway to the theme changer without hiding them from the cycle', () => {
    // 20 original premium + 4 added in the 2026-07-22 finishing pass (all code-verified).
    expect(premiumThemeIds).toHaveLength(24);

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

describe('theme changer control (2026-07-03 redesign)', () => {
  const readSource = (rel: string) =>
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('node:fs').readFileSync(require('node:path').resolve(__dirname, rel), 'utf8') as string;

  it('keeps the toggle data-driven — no hardcoded per-theme style branches', () => {
    const toggle = readSource('./UniversalThemeToggle.tsx');
    const styles = readSource('./UniversalThemeToggle.styles.ts');
    expect(toggle).not.toMatch(/case 'crystalline-/);
    expect(styles).not.toMatch(/case 'crystalline-/);
    expect(styles).toContain('$bg');
    expect(styles).toContain('prefers-reduced-motion');
  });

  it('wires the site-wide animations switch end to end', () => {
    const context = readSource('./UniversalThemeContext.tsx');
    const panel = readSource('./UniversalThemeToggle.panel.tsx');
    const tokens = readSource('../../styles/tokens.css');
    expect(context).toContain("localStorage.getItem('swanstudios-motion')");
    expect(context).toContain('MotionConfig');
    expect(context).toContain("motionEnabled ? 'user' : 'always'");
    expect(context).toContain("setAttribute('data-motion'");
    expect(panel).toContain('Animations');
    expect(tokens).toContain("html[data-motion='off']");
  });

  it('shows every registered theme in the picker groups (More bucket catches strays)', async () => {
    const { buildThemeGroups } = await import('./UniversalThemeToggle.panel');
    const grouped = buildThemeGroups().flatMap((group) => group.ids);
    expect(new Set(grouped).size).toBe(grouped.length);
    expect([...grouped].sort()).toEqual((Object.keys(themes) as ThemeId[]).sort());
  });

  it('keeps the featured set curated, valid, and never hiding the active theme', async () => {
    const { FEATURED_THEME_IDS, buildFeaturedIds } = await import('./UniversalThemeToggle.panel');
    expect(FEATURED_THEME_IDS.length).toBeGreaterThanOrEqual(8);
    expect(FEATURED_THEME_IDS.length).toBeLessThanOrEqual(14);
    for (const id of FEATURED_THEME_IDS) expect(themes[id]).toBeDefined();
    expect(new Set(FEATURED_THEME_IDS).size).toBe(FEATURED_THEME_IDS.length);
    // an off-list active theme is appended so it stays visible
    expect(buildFeaturedIds('vapor-dream' as ThemeId)).toContain('vapor-dream');
    expect(buildFeaturedIds('crystalline-default' as ThemeId)).toHaveLength(FEATURED_THEME_IDS.length);
  });
});

describe('all-theme WCAG contrast floor (2026-07-03 sweep)', () => {
  // Approximate rgba()/hex text colors against a solid hex background by
  // alpha-compositing before measuring. Gradients aren't measurable here —
  // those pairs are covered by the visual sweep instead.
  const parseColor = (value: string): { r: number; g: number; b: number; a: number } | null => {
    const hex = value.match(/^#([0-9a-fA-F]{6})$/);
    if (hex) {
      const v = Number.parseInt(hex[1], 16);
      return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255, a: 1 };
    }
    const rgba = value.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/);
    if (rgba) {
      return { r: +rgba[1], g: +rgba[2], b: +rgba[3], a: rgba[4] === undefined ? 1 : +rgba[4] };
    }
    return null;
  };

  const compositeOver = (fg: string, bgHex: string): { r: number; g: number; b: number } | null => {
    const f = parseColor(fg);
    const b = parseColor(bgHex);
    if (!f || !b) return null;
    return {
      r: f.r * f.a + b.r * (1 - f.a),
      g: f.g * f.a + b.g * (1 - f.a),
      b: f.b * f.a + b.b * (1 - f.a),
    };
  };

  const luminanceOf = ({ r, g, b }: { r: number; g: number; b: number }) => {
    const lin = (c: number) => {
      const v = c / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  };

  const ratio = (fg: string, bgHex: string): number | null => {
    const f = compositeOver(fg, bgHex);
    const b = parseColor(bgHex);
    if (!f || !b) return null;
    const lf = luminanceOf(f);
    const lb = luminanceOf(b);
    return (Math.max(lf, lb) + 0.05) / (Math.min(lf, lb) + 0.05);
  };

  it('keeps body and secondary text >= 4.5:1 on primary and elevated surfaces for all 38 themes', () => {
    const failures: string[] = [];
    for (const id of Object.keys(themes) as ThemeId[]) {
      const theme = themes[id];
      const surfaces: Array<[string, string]> = [
        ['bg.primary', theme.background.primary],
        ['bg.secondary', theme.background.secondary],
      ];
      const elevated = theme.background.elevated;
      if (/^#([0-9a-fA-F]{6})$/.test(elevated)) surfaces.push(['bg.elevated', elevated]);

      for (const [surfaceName, surface] of surfaces) {
        if (!/^#([0-9a-fA-F]{6})$/.test(surface)) continue;
        for (const [textName, text] of [
          ['text.primary', theme.text.primary],
          ['text.secondary', theme.text.secondary],
        ] as Array<[string, string]>) {
          const r = ratio(text, surface);
          if (r !== null && r < 4.5) {
            failures.push(`${id}: ${textName} on ${surfaceName} = ${r.toFixed(2)}:1`);
          }
        }
      }
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });

  it('keeps muted text >= 3:1 (large-text floor) on the primary surface for all 38 themes', () => {
    const failures: string[] = [];
    for (const id of Object.keys(themes) as ThemeId[]) {
      const theme = themes[id];
      if (!/^#([0-9a-fA-F]{6})$/.test(theme.background.primary)) continue;
      const r = ratio(theme.text.muted, theme.background.primary);
      if (r !== null && r < 3) failures.push(`${id}: text.muted = ${r.toFixed(2)}:1`);
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });

  it('keeps the primary accent readable (>= 3:1) on the primary surface for all 38 themes', () => {
    const failures: string[] = [];
    for (const id of Object.keys(themes) as ThemeId[]) {
      const theme = themes[id];
      if (!/^#([0-9a-fA-F]{6})$/.test(theme.background.primary)) continue;
      const r = ratio(theme.colors.primary, theme.background.primary);
      if (r !== null && r < 3) failures.push(`${id}: colors.primary = ${r.toFixed(2)}:1`);
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });
});

describe('brand-token RGB bridge (theme-changer compat, 2026-07-03)', () => {
  const themeIds = Object.keys(themes) as ThemeId[];

  it('re-points --wing-purple-rgb at the active theme palette', () => {
    const ruby = generateCSSVariables('ruby-forge' as ThemeId, themes);
    // ruby-forge wingPurple <- spec.secondary #BE123C -> 190, 18, 60
    expect(ruby).toContain('--wing-purple-rgb: 190, 18, 60;');
    expect(ruby).not.toContain('--wing-purple-rgb: 139, 92, 246;');
  });

  it('keeps the default theme identical to the static tokens.css values', () => {
    const dflt = generateCSSVariables('crystalline-default' as ThemeId, themes);
    expect(dflt).toContain('--wing-purple-rgb: 139, 92, 246;');
    expect(dflt).toContain('--ice-wing-rgb: 96, 192, 240;');
  });

  it('fails soft: no malformed --*-rgb line for any theme', () => {
    for (const id of themeIds) {
      const css = generateCSSVariables(id, themes);
      expect(css, `${id} emitted rgba into an rgb triplet`).not.toMatch(/--[a-z-]+-rgb:\s*rgba\(/);
      expect(css, `${id} emitted an empty rgb triplet`).not.toMatch(/--[a-z-]+-rgb:\s*;/);
    }
  });

  it('injects every previously-undefined semantic alias for every theme', () => {
    const required = [
      '--error:', '--status-danger:', '--status-success:', '--status-warning:',
      '--feedback-success:', '--feedback-warning:', '--feedback-danger:',
      '--surface-base:', '--surface-dark:', '--surface-muted:', '--card-bg:',
      '--input-bg:', '--accent-tertiary:', '--glow-accent:', '--focus-ring:',
      '--primary-cyan:', '--chart-primary:', '--border-accent:',
      '--border-accent-soft:', '--glass-bg:', '--glass-border:',
      '--shadow-strong:', '--achievement-text:', '--achievement-accent:'
    ];
    for (const id of themeIds) {
      const css = generateCSSVariables(id, themes);
      for (const token of required) {
        expect(css, `${id} missing ${token}`).toContain(token);
      }
    }
  });
});
