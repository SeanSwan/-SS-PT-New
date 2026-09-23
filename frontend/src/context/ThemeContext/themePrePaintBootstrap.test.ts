/**
 * themePrePaintBootstrap.test.ts
 * ==============================
 *
 * Executes the ACTUAL pre-paint bootstrap from `frontend/index.html`, in a controlled
 * DOM, across the storage × OS-preference matrix.
 *
 * WHY THIS FILE EXISTS (Astra A1-04, hostile review R5, 2026-09-19)
 * ===============================================================
 * `themePrePaint.test.ts` asserts things ABOUT the bootstrap — that the inline map
 * matches the palette, that the storage keys match, that it writes a `<style>` element
 * and not inline properties. All of those are source-text assertions. Its one
 * behavioural section then builds a *hand-made* `<style id="swan-theme-prepaint">` and
 * calls it a stand-in for what index.html writes:
 *
 *     // Stand in for what index.html writes before the bundle loads.
 *
 * That substitute is the defect. The injector's handoff is genuinely tested, but the
 * bootstrap's own DECISION — read the follow flag, consult the OS, fall back to the
 * default, choose a background, compute luminance, write the seed — is never executed.
 * The suite would stay green if that branch were inverted, if the storage key were
 * misspelled, or if the script threw before appending anything. Astra's phrasing was
 * exact: it "does not execute the actual inline resolver".
 *
 * So this file runs the real thing. The script text is extracted from index.html and
 * evaluated against a DOM this test controls, and the assertions are about what a
 * BROWSER would see: `data-theme` on <html>, the seed stylesheet's contents, and the
 * `theme-color` meta. Nothing here greps source except to prove the extraction found
 * the script at all.
 *
 * WHY A SUBSTITUTE SEED LOOKED SUFFICIENT
 * The precedence rule has two readers — this bootstrap and `resolveInitialTheme()` in
 * `themePersistence.ts` — and they once disagreed, which painted the stale stored theme
 * on a cold load and then visibly jumped. Testing one reader's *handoff* against a fake
 * seed cannot catch a disagreement between the two readers, because the fake seed has
 * no opinion. Only executing the real branch can.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FOLLOW_SYSTEM_STORAGE_KEY, THEME_STORAGE_KEY, themes } from './UniversalThemeContext';

const frontendRoot = resolve(__dirname, '../../..');
const htmlSource = readFileSync(resolve(frontendRoot, 'index.html'), 'utf8');

/**
 * The bootstrap body. Extracted by shape rather than by line number, so moving the
 * script inside index.html does not silently empty this file's subject.
 */
const bootstrapScript =
  htmlSource.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1]?.trim() ?? '';

/** Run the real script against the current DOM. */
const runBootstrap = () => new Function(bootstrapScript)();

const seed = () => document.getElementById('swan-theme-prepaint')?.textContent ?? '';

const originalMatchMedia = window.matchMedia;

/** jsdom ships no `matchMedia`; the bootstrap treats a throw as "prefers dark". */
const setPrefersDark = (prefersDark: boolean | 'throw') => {
  if (prefersDark === 'throw') {
    (window as unknown as { matchMedia: unknown }).matchMedia = () => {
      throw new Error('matchMedia unavailable');
    };
    return;
  }
  (window as unknown as { matchMedia: unknown }).matchMedia = (query: string) => ({
    matches: prefersDark,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
};

describe('the pre-paint bootstrap actually runs', () => {
  beforeEach(() => {
    // Anti-vacuity: an empty or truncated extraction would make every test below pass
    // while executing nothing at all. This is the check that stops that.
    expect(bootstrapScript.length, 'bootstrap not extracted from index.html').toBeGreaterThan(500);
    expect(bootstrapScript).toContain('SWAN_THEME_BACKGROUNDS');
    expect(bootstrapScript).toContain('swan-theme-prepaint');

    window.localStorage.clear();
    document.getElementById('swan-theme-prepaint')?.remove();
    document.documentElement.removeAttribute('data-theme');
    document.querySelector('meta[name="theme-color"]')?.remove();
    setPrefersDark(true);
  });

  afterEach(() => {
    document.getElementById('swan-theme-prepaint')?.remove();
    document.documentElement.removeAttribute('data-theme');
    document.querySelector('meta[name="theme-color"]')?.remove();
    window.localStorage.clear();
    (window as unknown as { matchMedia: unknown }).matchMedia = originalMatchMedia;
  });

  it('paints the stored theme when there is one', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'solar-gold');

    runBootstrap();

    expect(document.documentElement.getAttribute('data-theme')).toBe('solar-gold');
    expect(seed()).toContain(`--bg-primary:${themes['solar-gold'].background.primary}`);
    // --bg-base is seeded alongside --bg-primary; a bootstrap that set only one would
    // leave half the page on the default colour.
    expect(seed()).toContain(`--bg-base:${themes['solar-gold'].background.primary}`);
  });

  it('falls back to the default theme when storage holds something unknown', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'not-a-registered-theme');

    runBootstrap();

    // An unrecognised id must not reach `data-theme`, or the app mounts on a theme
    // whose CSS variables do not exist.
    expect(document.documentElement.getAttribute('data-theme')).toBe('crystalline-dark');
    expect(seed()).toContain('--bg-primary:#0D1117');
  });

  it('uses the default theme when storage is empty', () => {
    runBootstrap();
    expect(document.documentElement.getAttribute('data-theme')).toBe('crystalline-dark');
  });

  describe('follow-system outranks the stored theme', () => {
    // The precedence rule. It has a second reader in `resolveInitialTheme()`, and when
    // the two disagreed a cold load painted the stale theme and then jumped.
    it('follows the OS to the dark theme', () => {
      window.localStorage.setItem(FOLLOW_SYSTEM_STORAGE_KEY, 'true');
      setPrefersDark(true);

      runBootstrap();

      expect(document.documentElement.getAttribute('data-theme')).toBe('crystalline-dark');
    });

    it('follows the OS to the light theme', () => {
      window.localStorage.setItem(FOLLOW_SYSTEM_STORAGE_KEY, 'true');
      setPrefersDark(false);

      runBootstrap();

      expect(document.documentElement.getAttribute('data-theme')).toBe('crystalline-light');
      expect(seed()).toContain('color-scheme:light');
    });

    it('ignores a stored theme while the follow flag is set', () => {
      // The exact cold-load bug: stored theme present, follow-system also true.
      // Follow wins, and the stored value must not leak through.
      window.localStorage.setItem(FOLLOW_SYSTEM_STORAGE_KEY, 'true');
      window.localStorage.setItem(THEME_STORAGE_KEY, 'solar-gold');
      setPrefersDark(false);

      runBootstrap();

      expect(document.documentElement.getAttribute('data-theme')).toBe('crystalline-light');
      expect(seed()).not.toContain('solar-gold');
    });

    it('treats an unavailable matchMedia as "prefers dark" rather than throwing', () => {
      // The bootstrap guards the call because a locked-down browser can omit it. If
      // that guard regressed, the whole script would abort and NOTHING would be seeded
      // — which is invisible to a source-text assertion.
      window.localStorage.setItem(FOLLOW_SYSTEM_STORAGE_KEY, 'true');
      setPrefersDark('throw');

      expect(() => runBootstrap()).not.toThrow();
      expect(document.documentElement.getAttribute('data-theme')).toBe('crystalline-dark');
      expect(seed()).toContain('--bg-primary:#0D1117');
    });
  });

  it('seeds through a <style> element and never as an inline custom property', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'solar-gold');

    runBootstrap();

    // The load-bearing rule. An inline custom property on <html> outranks the `:root`
    // rule the injector writes, which pinned the page background to the boot theme for
    // the whole session. Asserted here against the RUNNING script, not the source text.
    const inline = document.documentElement.getAttribute('style') ?? '';
    expect(inline).not.toContain('--bg-primary');
    expect(document.getElementById('swan-theme-prepaint')).toBeTruthy();
  });

  it('reports the theme to the browser chrome through the theme-color meta', () => {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
    window.localStorage.setItem(THEME_STORAGE_KEY, 'solar-gold');

    runBootstrap();

    expect(meta.getAttribute('content')).toBe(themes['solar-gold'].background.primary);
  });

  it('derives the light/dark decision from the background, not from the theme id', () => {
    // `crystalline-light` is a light background under a dark-sounding family name, and
    // `frozen-aurora` is light too. Deriving `color-scheme` from the id would get both
    // wrong, and the failure is a white page with dark scrollbars.
    for (const [id, expected] of [
      ['crystalline-light', 'light'],
      ['frozen-aurora', 'light'],
      ['crystalline-dark', 'dark'],
      ['obsidian-black', 'dark'],
    ] as const) {
      window.localStorage.setItem(THEME_STORAGE_KEY, id);
      document.getElementById('swan-theme-prepaint')?.remove();

      runBootstrap();

      expect(seed(), `${id} color-scheme`).toContain(`color-scheme:${expected}`);
    }
  });
});
