/**
 * themePrePaint.test.ts
 * =====================
 *
 * The pre-paint bootstrap in `index.html` has to know each theme's page background
 * before the bundle loads — that is the whole point of it. That makes it a second
 * copy of palette data, which is exactly the kind of copy that rots silently.
 *
 * This test is the anti-rot gate: it fails the moment the inline map disagrees with
 * `themes`, or the inline default disagrees with the default App actually passes.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { themes, SYSTEM_DARK_THEME, THEME_STORAGE_KEY, FOLLOW_SYSTEM_STORAGE_KEY } from './UniversalThemeContext';
import { injectThemeVariables } from '../../utils/theme/themeUtils';

const frontendRoot = resolve(__dirname, '../../..');
const htmlSource = readFileSync(resolve(frontendRoot, 'index.html'), 'utf8');
const appSource = readFileSync(resolve(frontendRoot, 'src/App.tsx'), 'utf8');

const backgroundBlock = htmlSource.match(/var SWAN_THEME_BACKGROUNDS = \{([\s\S]*?)\n {8}\};/);

const parseInlineBackgrounds = (): Record<string, string> => {
  if (!backgroundBlock) return {};
  return Object.fromEntries(
    [...backgroundBlock[1].matchAll(/'([a-z0-9-]+)': '([^']+)'/g)].map((m) => [m[1], m[2]])
  );
};

describe('pre-paint theme bootstrap', () => {
  it('exists in index.html and runs before the app bundle', () => {
    expect(htmlSource).toContain('var SWAN_THEME_BACKGROUNDS');
    expect(htmlSource).toContain('var SWAN_THEME_KEY');
    expect(htmlSource.indexOf('SWAN_THEME_BACKGROUNDS')).toBeLessThan(
      htmlSource.indexOf('<script type="module"')
    );
  });

  it('covers exactly the registered themes, with each theme\'s own page background', () => {
    const inline = parseInlineBackgrounds();
    const themeIds = Object.keys(themes);

    expect(Object.keys(inline).sort()).toEqual([...themeIds].sort());

    for (const themeId of themeIds) {
      expect(inline[themeId], `${themeId} background`).toBe(
        themes[themeId as keyof typeof themes].background.primary
      );
    }
  });

  it('falls back to the same theme App passes to the provider', () => {
    const appDefault = appSource.match(/<UniversalThemeProvider defaultTheme="([^"]+)"/)?.[1];

    expect(appDefault).toBeTruthy();
    expect(htmlSource).toContain(`var SWAN_DEFAULT_THEME = '${appDefault}';`);
    expect(appDefault).toBe(SYSTEM_DARK_THEME);
  });

  it('reads the same storage keys the provider writes', () => {
    expect(htmlSource).toContain(`var SWAN_THEME_KEY = '${THEME_STORAGE_KEY}';`);
    expect(htmlSource).toContain(`var SWAN_FOLLOW_SYSTEM_KEY = '${FOLLOW_SYSTEM_STORAGE_KEY}';`);
  });

  it('guards every storage access so a blocked localStorage cannot abort the bootstrap', () => {
    expect(htmlSource).toContain('function read(key) {');
    expect(htmlSource).toMatch(/try \{\s*return window\.localStorage\.getItem\(key\);/);
  });

  /**
   * THE load-bearing assertion for the half-applied theme switch.
   *
   * The bootstrap used to seed these as INLINE custom properties via
   * `root.style.setProperty(...)`. An inline custom property on <html> outranks
   * the `:root` rule `injectThemeVariables()` writes, so those five variables
   * stayed pinned to whatever theme loaded first — measured in the running app as
   * `--accent-primary` following the theme while `--bg-primary` sat at #0D1117
   * across every switch.
   *
   * The rule is now: the bootstrap writes a <style> element, and the injector
   * deletes it on mount, so there is one authority at a time.
   */
  it('seeds CSS variables through a <style> element, never as inline properties', () => {
    const inlineCustomPropertyWrites = [
      ...htmlSource.matchAll(/\.style\.setProperty\(\s*'--/g),
    ];
    expect(
      inlineCustomPropertyWrites.length,
      'bootstrap writes custom properties inline, which outranks the theme stylesheet'
    ).toBe(0);

    expect(htmlSource).toContain("prepaint.id = 'swan-theme-prepaint'");
    expect(htmlSource).toContain('document.head.appendChild(prepaint)');
  });

  it('hands off cleanly: the injector retires the pre-paint element', () => {
    const themeUtilsSource = readFileSync(
      resolve(frontendRoot, 'src/utils/theme/themeUtils.ts'),
      'utf8'
    );

    expect(themeUtilsSource).toContain("getElementById('swan-theme-prepaint')");
    expect(themeUtilsSource).toMatch(/swan-theme-prepaint'\)\?\.remove\(\)/);
  });
});

/**
 * HY4 round 1, Finding 8 — "the pre-paint handoff guard is source-text only."
 *
 * That was fair. The assertion above greps `themeUtils.ts` for the string
 * `swan-theme-prepaint`; it would still pass if the removal sat behind a branch
 * that never executed. A guard that reads source certifies the source, not the
 * behaviour — and the failure mode this whole file exists for (two authorities on
 * the same custom properties) is a runtime property, invisible in source.
 *
 * So this drives the REAL injector against a REAL DOM and checks the observable
 * result: after takeover, one authority.
 */
describe('pre-paint handoff — behavioural', () => {
  afterEach(() => {
    document.getElementById('swan-theme-prepaint')?.remove();
    document.getElementById('theme-variables')?.remove();
    document.documentElement.removeAttribute('data-theme');
  });

  it('retires the pre-paint seed and leaves the injector as sole authority', () => {
    // Stand in for what index.html writes before the bundle loads.
    const prepaint = document.createElement('style');
    prepaint.id = 'swan-theme-prepaint';
    prepaint.textContent = ':root { --bg-primary: #0D1117; }';
    document.head.appendChild(prepaint);

    expect(document.getElementById('swan-theme-prepaint')).toBeTruthy();

    injectThemeVariables('solar-gold');

    // The seed is gone, so it can no longer outrank the stylesheet that duplicates it.
    expect(document.getElementById('swan-theme-prepaint')).toBeNull();

    const themeVars = document.getElementById('theme-variables');
    expect(themeVars).toBeTruthy();
    expect(themeVars!.textContent).toContain(':root');
    expect(themeVars!.textContent).toContain('--bg-primary');

    // And it really injected the theme it was handed, not a default.
    expect(document.documentElement.getAttribute('data-theme')).toBe('solar-gold');
    expect(themeVars!.textContent).toContain(themes['solar-gold'].background.primary);
  });

  it('reuses one stylesheet across switches instead of stacking them', () => {
    injectThemeVariables('solar-gold');
    injectThemeVariables('enchanted-forest');
    injectThemeVariables('crystalline-dark');

    // Stacked stylesheets would mean the LAST one appended wins by document order —
    // the same class of bug as the inline-property precedence failure, arrived at
    // from the other direction.
    expect(document.querySelectorAll('#theme-variables')).toHaveLength(1);
    expect(document.documentElement.getAttribute('data-theme')).toBe('crystalline-dark');
    expect(document.getElementById('theme-variables')!.textContent).toContain(
      themes['crystalline-dark'].background.primary
    );
  });
});
