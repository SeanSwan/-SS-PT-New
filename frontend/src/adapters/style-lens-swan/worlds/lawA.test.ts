/**
 * LAW A — automated enforcement for every BUILT world (hostile round 4).
 * ======================================================================
 * WHY THIS FILE EXISTS: Law A ("chrome stays Crystalline Swan; the world paints
 * only the setting"), the retired-Galaxy-Swan ban (CLAUDE.md Identity), Rule 6
 * (`var(--token, #fallback)`) and Rule 7 (WCAG 4.5:1) were enforced by REVIEW
 * ONLY. Nothing in CI could catch a world recipe that shipped `#00FFFF`, a
 * bare hex where a palette token exists, a typo'd token name that falls back
 * forever, or a setting panel too light for Frost White text. With 19 more
 * worlds to author, review-only enforcement is a guarantee of drift.
 *
 * Every check reads the REAL recipes out of the registry, so it covers each new
 * world automatically the moment it is registered — no per-world test to forget.
 * Contrast math reuses `context/ThemeContext/colorScience.ts` (Rule 18) rather
 * than a second implementation.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { contrastRatio } from '../../../context/ThemeContext/colorScience';
import { builtWorlds } from './registry';

/** RETIRED Galaxy-Swan palette — a hard permanent ban (CLAUDE.md Identity). */
const RETIRED_HEX = ['#0a0a1a', '#00ffff', '#7851a9'];

/**
 * The ONLY recipe tokens where a bare hex is sanctioned: a world's own SETTING
 * depth. These are bespoke per-world darks with no Crystalline Swan palette slot
 * (the same carve-out `v2/worldDefaults.ts` takes for the default world). Every
 * other color-carrying token must route through a palette custom property so a
 * palette change moves the worlds with it.
 */
const SANCTIONED_BARE_HEX_TOKENS = new Set(['world-panel', 'world-bg', 'world-shadow']);

/** Frost White — the `--world-text` value every world inherits. */
const WORLD_TEXT = '#e0ecf4';
/**
 * Worst-case (LIGHTEST) backdrop a world panel composites over: the default
 * world's Obsidian Black. A lighter backdrop lifts the composite and LOWERS
 * contrast against light text, so this is the honest worst case — the Lab
 * concepts' own `--signature-bg` (#030712) is darker and therefore safer.
 */
const WORST_BACKDROP = { r: 0x0a, g: 0x0a, b: 0x0f };
/** `conceptShared.styles.ts` Panel paints `--world-panel` at 92%. */
const PANEL_ALPHA_MULTIPLIER = 0.92;

/**
 * The palette file, read from disk. NOT a `?raw` import: under vitest that
 * resolves to an EMPTY string (CSS imports are stubbed), which makes every
 * token-existence assertion fail for the wrong reason. NOT `import.meta.url`
 * either: the jsdom environment does not expose a `file:` URL. Vitest's root
 * differs by invocation cwd (`frontend` vs `frontend/src`), so probe both. The
 * `size > 20` assertion in the first test is the anti-vacuous-pass guard.
 */
const TOKENS_CSS_CANDIDATES = ['src/styles/tokens.css', 'styles/tokens.css', 'frontend/src/styles/tokens.css'];
const tokensCssPath = TOKENS_CSS_CANDIDATES.map((p) => resolve(process.cwd(), p)).find(existsSync);
if (!tokensCssPath) {
  throw new Error(
    `Law A guard cannot locate styles/tokens.css from cwd ${process.cwd()} — ` +
      `the palette moved; update TOKENS_CSS_CANDIDATES (do NOT delete this check).`,
  );
}
const tokensCss = readFileSync(tokensCssPath, 'utf8');
const DEFINED_CUSTOM_PROPS = new Set(
  [...tokensCss.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]),
);

const built = builtWorlds();

describe('Law A · every built world', () => {
  it('has at least one built world to check (guard against a vacuous pass)', () => {
    expect(built.length).toBeGreaterThan(0);
    expect(DEFINED_CUSTOM_PROPS.size).toBeGreaterThan(20);
  });

  it('ships ZERO retired Galaxy-Swan hex anywhere in the recipe', () => {
    for (const world of built) {
      const blob = JSON.stringify(world.recipe).toLowerCase();
      for (const hex of RETIRED_HEX) {
        expect(blob.includes(hex), `${world.id} contains retired Galaxy-Swan ${hex}`).toBe(false);
      }
    }
  });

  it('uses var(--token, #fallback) for every color token outside the setting carve-out', () => {
    for (const world of built) {
      for (const [name, rawValue] of Object.entries(world.recipe.tokens ?? {})) {
        const value = String(rawValue);
        if (!value.includes('#')) continue;
        if (SANCTIONED_BARE_HEX_TOKENS.has(name)) continue;
        expect(
          /var\(--[a-z0-9-]+,\s*#[0-9a-fA-F]{3,8}\s*\)/.test(value),
          `${world.id} token "${name}" carries a bare hex (${value}) — wrap it as ` +
            `var(--palette-token, #fallback) or add the token to the setting carve-out ` +
            `with a written reason`,
        ).toBe(true);
      }
    }
  });

  it('never references a custom property that does not exist (no silent forever-fallback)', () => {
    for (const world of built) {
      for (const [name, rawValue] of Object.entries(world.recipe.tokens ?? {})) {
        for (const match of String(rawValue).matchAll(/var\((--[a-z0-9-]+)/g)) {
          const prop = match[1];
          // --world-* is the recipe's OWN output contract, not a palette input.
          if (prop.startsWith('--world-')) continue;
          expect(
            DEFINED_CUSTOM_PROPS.has(prop),
            `${world.id} token "${name}" references ${prop}, which is NOT defined in ` +
              `src/styles/tokens.css — the fallback would fire forever (typo or renamed token)`,
          ).toBe(true);
        }
      }
    }
  });

  it('keeps Frost White on the setting panel at WCAG 4.5:1 (Rule 7)', () => {
    for (const world of built) {
      const panel = String(world.recipe.tokens?.['world-panel'] ?? '');
      if (!panel) continue;
      // Recipes express the setting as color-mix(in srgb, #HEX P%, transparent).
      const mix = panel.match(/color-mix\(\s*in\s+srgb\s*,\s*(#[0-9a-fA-F]{3,8})\s+([\d.]+)%\s*,\s*transparent\s*\)/);
      expect(mix, `${world.id} world-panel "${panel}" is not the expected color-mix form`).not.toBeNull();
      if (!mix) continue;
      const [, hex, pct] = mix;
      const alpha = (Number(pct) / 100) * PANEL_ALPHA_MULTIPLIER;
      const rgb = {
        r: parseInt(hex.slice(1, 3), 16),
        g: parseInt(hex.slice(3, 5), 16),
        b: parseInt(hex.slice(5, 7), 16),
      };
      const ratio = contrastRatio(
        WORLD_TEXT,
        `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha.toFixed(4)})`,
        WORST_BACKDROP,
      );
      expect(
        ratio,
        `${world.id} Frost White on the setting panel is ${ratio.toFixed(2)}:1 (needs >= 4.5)`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('declares the 44px touch floor and required reduced-motion fallback', () => {
    for (const world of built) {
      expect(world.recipe.constraints.minimumTouchTargetPx, world.id).toBeGreaterThanOrEqual(44);
      expect(world.recipe.constraints.reducedMotionFallback, world.id).toBe('required');
    }
  });
});
