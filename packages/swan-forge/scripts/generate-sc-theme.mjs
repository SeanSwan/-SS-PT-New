#!/usr/bin/env node
/**
 * @swan/forge — one-way SC-theme generator (plan §12.1, Ox round-3 Critical #1).
 * The pack is the single source of truth FOR FORGE COMPONENTS and for any JS-theme
 * consumer that imports the generated module. Trailhead-truth (Rule 75): as of
 * Phase 1.5 the generator + drift gate are PROVEN but no SS-PT consumer imports
 * `forgeTheme` yet — legacy GlowButton consumers still read UniversalThemeContext
 * until strangler adoption retires them. "Generator proven, adoption pending."
 * Nobody hand-edits the output; divergence = regenerate. `--check` runs inside
 * `npm run gate` for the package (GitHub Actions are account-dead at the moment —
 * drift-check 2026-08-24 — so the local gate is the enforcement surface).
 *
 * Usage:
 *   node scripts/generate-sc-theme.mjs            # writes the generated file
 *   node scripts/generate-sc-theme.mjs --check    # exit 2 if the file has drifted
 *
 * Output: frontend/src/styles/forgeTheme.generated.ts (path fixed on purpose —
 * generated artifacts should be impossible to mistake for hand-written code).
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG = dirname(dirname(fileURLToPath(import.meta.url)));
const REPO = dirname(dirname(PKG)); // packages/swan-forge → packages → repo root
const PACK = join(PKG, 'tokens', 'packs', 'crystalline-swan.css');
const OUT = join(REPO, 'frontend', 'src', 'styles', 'forgeTheme.generated.ts');

/** Parse live (comment-stripped) `--sw-*` declarations — same discipline as the audit. */
export function packToTheme(css) {
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  // GLM Phase-1.5 review: the JS projection must reflect the pack's BASE values.
  // Conditional blocks (@media prefers-reduced-motion, @supports) override only
  // under their condition — a last-wins regex leaked `--sw-motion: 0` into the
  // projection and looked like a dead pack. Strip at-rule blocks before parsing.
  const live = noComments.replace(/@(?:media|supports|container)[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
  /** @type {Record<string, string>} */
  const tokens = {};
  for (const m of live.matchAll(/(--sw-[\w-]+)\s*:\s*([^;]+);/g)) tokens[m[1]] = m[2].trim();
  /** @type {Record<string, string>} */
  const theme = {};
  /** @type {Record<string, string>} composite (var()-bearing) values, kept visible instead of silently dropped */
  const composites = {};
  const seen = new Map();
  for (const [name, value] of Object.entries(tokens)) {
    const key = name.replace(/^--sw-/, '').replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
    if (seen.has(key)) throw new Error(`camelCase collision: ${seen.get(key)} and ${name} both map to ${key}`);
    seen.set(key, name);
    if (value.includes('var(')) composites[key] = value;
    else theme[key] = value;
  }
  return { theme, composites };
}

export function renderModule({ theme, composites }) {
  // Rule 6 / frontend-guards G4: hex is legal ONLY in token sources. This file IS the
  // generated token registry, so every hex line carries the guard's allow tag — the
  // generator emits compliance; humans never hand-tag generated output.
  const entries = Object.entries(theme)
    .map(([k, v]) => `  ${k}: ${JSON.stringify(v)},${/#[0-9a-fA-F]{3,8}\b/.test(v) ? ' // swan-guard-allow-hex generated from crystalline-swan.css (token source of truth)' : ''}`)
    .join('\n');
  return `/**
 * GENERATED FILE — DO NOT EDIT (drift-checked by \`npm run gate\` in packages/swan-forge).
 * Source of truth: packages/swan-forge/tokens/packs/crystalline-swan.css
 * Regenerate: node packages/swan-forge/scripts/generate-sc-theme.mjs
 * Check:      node packages/swan-forge/scripts/generate-sc-theme.mjs --check
 */
export const forgeTheme = {
${entries}
} as const;

/**
 * Composite tokens (their values reference other custom properties) — resolvable ONLY
 * in the cascade, so consumers read them via getComputedStyle(el).getPropertyValue(name).
 * Listed by NAME so nothing is silently dropped from the projection.
 */
export const forgeThemeComposites = {
${Object.keys(composites).map((k) => `  ${k}: ${JSON.stringify('--sw-' + k.replace(/[A-Z0-9]/g, (c) => '-' + c.toLowerCase()))},`).join('\n')}
} as const;

export type ForgeTheme = typeof forgeTheme;
`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const expected = renderModule(packToTheme(readFileSync(PACK, 'utf8')));
  if (process.argv.includes('--check')) {
    const actual = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
    if (actual !== expected) {
      console.error('[generate-sc-theme] DRIFT: generated theme does not match the pack. Regenerate.');
      process.exit(2);
    }
    console.log('[generate-sc-theme] check OK — generated theme matches the pack');
  } else {
    mkdirSync(dirname(OUT), { recursive: true });
    writeFileSync(OUT, expected);
    console.log(`[generate-sc-theme] wrote ${OUT}`);
  }
}
