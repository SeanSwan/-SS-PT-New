/**
 * BUNDLE BOUNDARY — Lab-only world recipes may not reach the app-wide barrel.
 * ==========================================================================
 * WHY (hostile round 9): `adapters/style-lens-swan/index.ts` is imported by the
 * whole app (it installs the lens global styles and the style registry). It
 * calls `buildV2OnlyAllowlistExemptions` during registry init. When it imported
 * that from `catalogV2Map`, it transitively pulled `worlds/registry`, which
 * eagerly imports EVERY world recipe module — so all 23 Lab-only recipes were
 * bundled into `dist/v3/index.*.js`, the main entry chunk every visitor
 * downloads on first paint. Confirmed by grepping the built output for
 * `swan.<world>.v2`; moving the import cut that chunk by ~22.8 kB raw /
 * ~2.56 kB gzip and relocated the recipes into the lazy Lab route chunk.
 *
 * The exemption set can only ever contain `dashboardChrome: false` entries, and
 * all 25 roster worlds ship a v1 chrome lens (so they are `true`). The barrel was
 * therefore paying a first-paint cost for data it structurally cannot use.
 *
 * This is a STATIC source check, not a bundle assertion: it fails at the one
 * edge that reintroduces the regression, with the reason attached, instead of
 * waiting for someone to notice the entry chunk growing.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ADAPTER_DIR_CANDIDATES = [
  'src/adapters/style-lens-swan',
  'adapters/style-lens-swan',
  'frontend/src/adapters/style-lens-swan',
];
const adapterDir = ADAPTER_DIR_CANDIDATES.map((p) => resolve(process.cwd(), p)).find(existsSync);
if (!adapterDir) {
  throw new Error(
    `bundle-boundary guard cannot locate the adapter from cwd ${process.cwd()} — update ` +
      `ADAPTER_DIR_CANDIDATES (do NOT delete this check).`,
  );
}

const read = (relative: string) => readFileSync(resolve(adapterDir, relative), 'utf8');
const importSpecifiers = (source: string): string[] =>
  [...source.matchAll(/^\s*import\s[^'"]*['"]([^'"]+)['"]/gm)].map((m) => m[1]);

describe('bundle boundary · the app-wide barrel stays recipe-free', () => {
  const barrel = read('index.ts');

  it('read a real barrel with real imports (anti-vacuous guard)', () => {
    expect(barrel.length).toBeGreaterThan(500);
    expect(importSpecifiers(barrel).length).toBeGreaterThan(3);
  });

  it('the barrel does not import catalogV2Map (its only path to the recipes)', () => {
    const offenders = importSpecifiers(barrel).filter((s) => s.includes('catalogV2Map'));
    expect(
      offenders,
      'adapters/style-lens-swan/index.ts is imported app-wide. Importing catalogV2Map here ' +
        'transitively bundles all built world recipes into the main entry chunk every visitor ' +
        'downloads. Import the metadata from ./v2/catalogV2Exemptions instead.',
    ).toEqual([]);
  });

  it('the barrel never reaches the world registry or a recipe directly', () => {
    const offenders = importSpecifiers(barrel).filter(
      (s) => s.includes('worlds/registry') || s.includes('worlds/recipes') || s.includes('labRecipes'),
    );
    expect(offenders, `barrel imports recipe-bearing modules: ${offenders.join(', ')}`).toEqual([]);
  });

  it('catalogV2Exemptions imports nothing at all, so it can never regrow the edge', () => {
    expect(importSpecifiers(read('v2/catalogV2Exemptions.ts'))).toEqual([]);
  });
});
