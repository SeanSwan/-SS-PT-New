import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = (path: string) =>
  readFileSync(resolve(process.cwd(), path), 'utf8');

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
    const styles = source(
      'src/adapters/style-lens-swan/SwanStyleLensGlobalStyles.ts',
    );

    promotedLensIds.forEach((id) => {
      expect(styles).toContain("data-style-lens='" + id + "'");
    });
    expect(styles).toContain('--lens-sidebar-width');
    expect(styles).toContain('--lens-main-padding');
    expect(styles).toContain('--lens-panel-radius');
    expect(styles).toContain('prefers-reduced-motion');
  });

  it('preserves the Dual-Button Glow contract through semantic action tones', () => {
    const styles = source(
      'src/adapters/style-lens-swan/SwanStyleLensGlobalStyles.ts',
    );
    const preview = source(
      'src/context/ThemeContext/AppearanceStudio/AppearanceStudioPreview.tsx',
    );

    expect(styles).toContain("data-swan-button-tone='blue'");
    expect(styles).toContain('var(--wing-purple, #8b5cf6)');
    expect(styles).toContain("data-swan-button-tone='purple'");
    expect(styles).toContain('var(--ice-wing, #60c0f0)');
    expect(preview).toContain("data-swan-button-tone='blue'");
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
