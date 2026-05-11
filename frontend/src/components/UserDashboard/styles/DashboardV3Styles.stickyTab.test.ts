/**
 * Sticky TabNavigation + CSS-injection-defense regression tests
 * =============================================================
 * 2026-05-10 SLICES 1 + 2: locks the structural guarantees that fix
 * Sean's "tabs become inoperable after navigating away from Home" report
 * AND the AI-Village CHAIN-1 CSS-injection defense.
 *
 * Why source-text assertions instead of render tests: styled-components
 * insert class-scoped rules into a JSDOM <style> tag that getComputedStyle
 * does not reliably resolve in vitest. A render-and-getComputedStyle
 * approach would silently pass even after a declaration was deleted.
 * Reading the styled-component source and asserting the literal CSS lines
 * is the smallest reliable regression — if any future edit removes
 * `position: sticky`, drops the z-index, restores `overflow: hidden` on
 * MainContent / ContentGrid, restores a `url(${...})` template-literal
 * interpolation on BackgroundSection, or weakens the ProfileImage CSS-escape,
 * this test fails loudly.
 *
 * Post-refactor 2026-05-10: origin/main split DashboardV3Styles.ts into
 * 12 focused style modules. This test reads from the new split files
 * directly so it remains accurate even though the orchestrator barrel
 * is now a re-export.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const STYLES_DIR = __dirname;

function loadSplitSource(file: string): string {
  return readFileSync(join(STYLES_DIR, file), 'utf8');
}

function blockFor(source: string, exportName: string): string {
  const start = source.indexOf(`export const ${exportName} = styled`);
  if (start === -1) throw new Error(`${exportName} not found in split source`);
  const tail = source.indexOf('\n`;', start);
  if (tail === -1) throw new Error(`${exportName} block has no terminator`);
  return source.slice(start, tail);
}

const navStyles = loadSplitSource('DashboardV3NavigationStatusStyles.ts');
const layoutStyles = loadSplitSource('DashboardV3LayoutStyles.ts');
const bannerStyles = loadSplitSource('DashboardV3BannerStyles.ts');
const profilePhotoStyles = loadSplitSource('DashboardV3ProfilePhotoStyles.ts');
const statsStyles = loadSplitSource('DashboardV3StatsStyles.ts');

describe('TabNavigation sticky behavior', () => {
  const tab = blockFor(navStyles, 'TabNavigation');

  it('declares position: sticky', () => {
    expect(tab).toMatch(/position:\s*sticky/);
  });

  it('pins to top (0 or 0.5rem)', () => {
    expect(tab).toMatch(/top:\s*(0|0\.\d+rem|0px)/);
  });

  it('declares z-index in the safe range (10 < z < 1000 to sit above page chrome but below modals)', () => {
    const m = tab.match(/z-index:\s*(\d+)/);
    expect(m, 'TabNavigation must declare z-index').not.toBeNull();
    const zIndex = Number(m![1]);
    expect(zIndex).toBeGreaterThan(10);
    expect(zIndex).toBeLessThan(1000);
  });
});

describe('MainContent / ContentGrid no longer clip the sticky tab strip', () => {
  it('MainContent does not declare overflow: hidden', () => {
    const main = blockFor(navStyles, 'MainContent');
    const bodyNoComments = main.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(bodyNoComments).not.toMatch(/overflow:\s*hidden/);
  });

  it('ContentGrid does not declare overflow: hidden', () => {
    const grid = blockFor(layoutStyles, 'ContentGrid');
    const bodyNoComments = grid.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(bodyNoComments).not.toMatch(/overflow:\s*hidden/);
  });
});

describe('CSS-injection defenses on banner / profile image URLs', () => {
  it('BackgroundSection has NO `background: url(${...})` interpolation (Slice 2 eliminated the surface entirely)', () => {
    const bg = blockFor(bannerStyles, 'BackgroundSection');
    const bodyNoComments = bg.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(bodyNoComments).not.toMatch(/url\(\s*\$\{/);
  });

  it('BannerImage has object-fit: cover and a safe object-position default; no template interpolation', () => {
    const banner = blockFor(bannerStyles, 'BannerImage');
    expect(banner).toMatch(/object-fit:\s*cover/);
    expect(banner).toMatch(/object-position:\s*center center/);
    expect(banner).not.toMatch(/\$\{/);
  });

  it('ProfileImage wraps the URL in double-quoted url("...") form and strips backslash/quote', () => {
    const img = blockFor(profilePhotoStyles, 'ProfileImage');
    expect(img).toMatch(/url\("\$\{\$image\.replace\(\/\[\\\\"]\/g, ''\)}"\)/);
  });
});

describe('StatItem no longer baits clicks (Phase-2C UX consensus + rule 22)', () => {
  it('StatItem declares cursor: default (was cursor: pointer)', () => {
    const stat = blockFor(statsStyles, 'StatItem');
    const bodyNoComments = stat.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(bodyNoComments).toMatch(/cursor:\s*default/);
    expect(bodyNoComments).not.toMatch(/cursor:\s*pointer/);
  });
});
