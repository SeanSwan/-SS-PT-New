import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (path: string) =>
  readFileSync(resolve(process.cwd(), path), 'utf8');

// S1-C split: the lens CSS moved out of SwanStyleLensGlobalStyles.ts (now a re-export shell) into
// always-present core + active-only per-lens files. These contract assertions read the LIVE split
// output (core + every lens file) so they still verify the shipping CSS, not the legacy fixture.
const LENS_DIR = 'src/adapters/style-lens-swan/styles/lenses';
const splitStyles = (): string => {
  const core = source('src/adapters/style-lens-swan/styles/lensCoreStyles.ts');
  const lenses = readdirSync(resolve(process.cwd(), LENS_DIR))
    .filter((f) => f.endsWith('.ts') && f !== 'index.ts')
    .map((f) => source(`${LENS_DIR}/${f}`))
    .join('\n');
  return `${core}\n${lenses}`;
};

const promotedLensIds = [
  'quiet-meridian',
  'blueprint-fold',
  'kintsugi-circuit',
  'analog-flight-recorder',
  'candy-glass-arcade',
  'recovery-cloister',
  'tempo-forge',
  'coach-ledger',
  'signal-garden',
  'split-horizon',
  'prism-terminal',
  'tidal-columns',
  'monastic-grid',
  'orbit-atlas',
  'carbon-atelier',
  'kinetic-kanban',
  'aurora-index',
  'modular-harbor',
  'terrain-console',
  'chronograph-board',
  'glass-rail',
  'meridian-magazine',
  'lunar-stack',
  'cedar-workshop',
  'crystalline-cathedral',
];

describe('Swan Style Lens runtime binding', () => {
  it('mounts the Swan registry and scoped visual adapter', () => {
    const app = source('src/App.tsx');

    expect(app).toContain('SWAN_STYLE_LENS_REGISTRY');
    expect(app).toContain('SwanStyleLensGlobalStyles');
    expect(app).toContain(
      '<StyleLensProvider registry={SWAN_STYLE_LENS_REGISTRY}>',
    );
  });

  it('binds every promoted lens to scoped structural CSS variables', () => {
    const styles = splitStyles();

    promotedLensIds.forEach((id) => {
      expect(styles).toContain("data-style-lens='" + id + "'");
    });
    expect(styles).toContain('--lens-sidebar-width');
    expect(styles).toContain('--lens-main-padding');
    expect(styles).toContain('--lens-panel-radius');
    expect(styles).toContain('prefers-reduced-motion');
  });

  it('preserves the Dual-Button Glow contract through semantic action tones', () => {
    const styles = splitStyles();
    const preview = source(
      'src/context/ThemeContext/AppearanceStudio/AppearanceStudioPreview.tsx',
    );

    expect(styles).toContain("data-swan-button-tone='blue'");
    expect(styles).toContain('var(--wing-purple, #8b5cf6)');
    expect(styles).toContain("data-swan-button-tone='purple'");
    expect(styles).toContain('var(--ice-wing, #60c0f0)');
    expect(preview).toContain("data-swan-button-tone='blue'");
  });

  it('guards every lens-id descendant rule against crossing a ScopedLensFrame boundary', () => {
    // With a committed global lens on <html>, preview frames are still DOM
    // descendants of the html lens attribute. Any lens-id rule that styles
    // shell/scroll-root descendants MUST exclude subtrees of a scoped frame
    // carrying a different lens, or the global lens contaminates Compare
    // panes / the Style Explorer stage (e.g. analog-flight-recorder forcing
    // monospace into a quiet-meridian preview).
    const styles = splitStyles();

    const lensDescendantRules = styles.match(
      /\[data-style-lens='[a-z-]+'\][^{,]*\[data-(?:style-lens-shell|dashboard-scroll-root)\][^{]*\{/g,
    ) ?? [];
    expect(lensDescendantRules.length).toBeGreaterThan(0);
    lensDescendantRules.forEach((rule) => {
      expect(rule).toContain(":not([data-scoped-lens-frame]:not([data-style-lens='");
    });
  });

  it('marks and consumes the canonical dashboard shell', () => {
    const shell = source(
      'src/components/DashBoard/UniversalDashboardLayout.shell.tsx',
    );
    const styles = source(
      'src/components/DashBoard/UniversalDashboardLayout.styles.ts',
    );

    expect(shell).toContain('data-style-lens-shell');
    expect(styles).toContain('var(--lens-sidebar-width');
    expect(styles).toContain('var(--lens-main-padding');
});
});
