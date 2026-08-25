#!/usr/bin/env node
/**
 * @swan/forge — one-way SC-theme generator (plan §12.1, Ox round-3 Critical #1).
 * THE PACK IS THE SINGLE SOURCE OF TRUTH. This script reads
 * tokens/packs/crystalline-swan.css and emits a generated, read-only TS module
 * for any styled-components/JS-theme consumer that needs Forge token VALUES in
 * JS. Nobody hand-edits the output; divergence = regenerate.
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
  const live = css.replace(/\/\*[\s\S]*?\*\//g, '');
  /** @type {Record<string, string>} */
  const tokens = {};
  for (const m of live.matchAll(/(--sw-[\w-]+)\s*:\s*([^;]+);/g)) tokens[m[1]] = m[2].trim();
  // camelCase the names for JS ergonomics: --sw-color-primary → colorPrimary
  /** @type {Record<string, string>} */
  const theme = {};
  for (const [name, value] of Object.entries(tokens)) {
    if (value.includes('var(')) continue; // composite values stay CSS-side
    const key = name.replace(/^--sw-/, '').replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
    theme[key] = value;
  }
  return theme;
}

export function renderModule(theme) {
  // Rule 6 / frontend-guards G4: hex is legal ONLY in token sources. This file IS the
  // generated token registry, so every hex line carries the guard's allow tag — the
  // generator emits compliance; humans never hand-tag generated output.
  const entries = Object.entries(theme)
    .map(([k, v]) => `  ${k}: ${JSON.stringify(v)},${/#[0-9a-fA-F]{3,8}\b/.test(v) ? ' // swan-guard-allow-hex generated from crystalline-swan.css (token source of truth)' : ''}`)
    .join('\n');
  return `/**
 * GENERATED FILE — DO NOT EDIT (drift-checked in CI-class gates).
 * Source of truth: packages/swan-forge/tokens/packs/crystalline-swan.css
 * Regenerate: node packages/swan-forge/scripts/generate-sc-theme.mjs
 * Check:      node packages/swan-forge/scripts/generate-sc-theme.mjs --check
 */
export const forgeTheme = {
${entries}
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
