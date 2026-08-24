#!/usr/bin/env node
/**
 * @swan/forge — WCAG contrast audit over RESOLVED token pairs (plan §11.A4).
 * Parses every theme pack, resolves each declared pair through the token
 * resolution order (component-override → pack semantic), computes the WCAG 2.x
 * contrast ratio, and fails (exit 2) on any unwaived pair below its minimum.
 * Also enforces pack completeness: every pack must define every semantic name.
 * Zero dependencies. Waivers print LOUDLY — no silent caps.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG = dirname(dirname(fileURLToPath(import.meta.url)));
const PACKS_DIR = join(PKG, 'tokens', 'packs');

/** Semantic names every pack MUST define (mirrors tokens/semantic.contract.md). */
export const SEMANTIC_NAMES = [
  '--sw-bg-base', '--sw-bg-surface', '--sw-bg-elevated', '--sw-bg-overlay',
  '--sw-text-primary', '--sw-text-secondary', '--sw-text-muted', '--sw-text-inverse',
  '--sw-color-primary', '--sw-color-accent', '--sw-color-gold',
  '--sw-color-success', '--sw-color-danger', '--sw-color-warning',
  '--sw-border', '--sw-border-strong', '--sw-glow-a', '--sw-glow-b',
  '--sw-focus-ring', '--sw-focus-shadow',
  '--sw-font-heading', '--sw-font-body', '--sw-font-data', '--sw-font-ui', '--sw-text-scale',
  '--sw-shadow-1', '--sw-shadow-2', '--sw-shadow-3',
  '--sw-motion', '--sw-ease',
  '--sw-asset-hero-video', '--sw-asset-brand-mark',
];

/**
 * Audited pairs: [foreground, background, minRatio, label, waived?, waiveReason?]
 * fg/bg accept a resolution CHAIN (first defined wins) — models override→semantic.
 */
export const PAIRS = [
  { fg: ['--sw-text-primary'], bg: ['--sw-bg-base'], min: 4.5, label: 'body text / page' },
  { fg: ['--sw-text-primary'], bg: ['--sw-bg-surface'], min: 4.5, label: 'body text / card' },
  { fg: ['--sw-text-primary'], bg: ['--sw-bg-elevated'], min: 4.5, label: 'body text / modal' },
  { fg: ['--sw-text-secondary'], bg: ['--sw-bg-surface'], min: 4.5, label: 'secondary text / card' },
  { fg: ['--sw-text-muted'], bg: ['--sw-bg-surface'], min: 4.5, label: 'muted text / card' },
  { fg: ['--sw-btn-primary-text', '--sw-text-inverse'], bg: ['--sw-color-primary'], min: 4.5, label: 'button primary label' },
  {
    fg: ['--sw-btn-accent-text', '--sw-text-inverse'], bg: ['--sw-color-accent'], min: 4.5,
    label: 'button accent label',
    waived: true,
    waiveReason: 'Matches shipped original GlowButton brand pairing (white on Wing Purple ~4.2:1 in crystalline-swan). FLAGGED FOR SEAN DESIGN REVIEW — plan §11/Phase 1 finding.',
  },
  { fg: ['--sw-btn-gilded-text', '--sw-text-primary'], bg: ['--sw-btn-gilded-bg', '--sw-color-gold'], min: 4.5, label: 'button gilded label' },
  { fg: ['--sw-btn-success-text', '--sw-text-primary'], bg: ['--sw-btn-success-bg', '--sw-color-success'], min: 4.5, label: 'button success label' },
  { fg: ['--sw-btn-danger-text', '--sw-text-primary'], bg: ['--sw-btn-danger-bg', '--sw-color-danger'], min: 4.5, label: 'button danger label' },
  { fg: ['--sw-focus-ring'], bg: ['--sw-bg-base'], min: 3.0, label: 'focus ring / page (non-text)' },
];

/** Parse `--name: value;` declarations from a pack file. @param {string} css */
export function parseTokens(css) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const m of css.matchAll(/(--sw-[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

/** @param {string} hex #RGB or #RRGGBB → [r,g,b] 0..255, or null */
export function hexToRgb(hex) {
  const h = hex.trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(h)) return [...h].map((c) => parseInt(c + c, 16));
  if (/^[0-9a-f]{6}$/i.test(h)) return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return null;
}

/** WCAG relative luminance. @param {[number,number,number]} rgb */
export function relLuminance([r, g, b]) {
  const lin = (v) => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG contrast ratio between two hex colors. */
export function contrastRatio(hexA, hexB) {
  const a = hexToRgb(hexA); const b = hexToRgb(hexB);
  if (!a || !b) return null;
  const [l1, l2] = [relLuminance(a), relLuminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Resolve a chain of token names to a concrete hex value in a pack. */
export function resolveChain(tokens, chain) {
  for (const name of chain) {
    const v = tokens[name];
    if (v && v.startsWith('#')) return v;
  }
  return null;
}

export function auditPack(name, css) {
  const tokens = parseTokens(css);
  const missing = SEMANTIC_NAMES.filter((n) => !(n in tokens));
  const results = [];
  for (const pair of PAIRS) {
    const fg = resolveChain(tokens, pair.fg);
    const bg = resolveChain(tokens, pair.bg);
    if (!fg || !bg) { results.push({ ...pair, pack: name, ratio: null, status: 'UNRESOLVED' }); continue; }
    const ratio = contrastRatio(fg, bg);
    const pass = ratio !== null && ratio >= pair.min;
    results.push({ ...pair, pack: name, fgHex: fg, bgHex: bg, ratio, status: pass ? 'PASS' : pair.waived ? 'WAIVED-FAIL' : 'FAIL' });
  }
  return { missing, results };
}

// ── CLI ──────────────────────────────────────────────────────────────
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  let failures = 0;
  for (const file of readdirSync(PACKS_DIR).filter((f) => f.endsWith('.css'))) {
    const { missing, results } = auditPack(file, readFileSync(join(PACKS_DIR, file), 'utf8'));
    console.log(`\n=== pack: ${file} ===`);
    if (missing.length) { failures += missing.length; console.log(`  CONTRACT INCOMPLETE — missing: ${missing.join(', ')}`); }
    for (const r of results) {
      const ratio = r.ratio ? r.ratio.toFixed(2) : '—';
      const line = `  [${r.status}] ${r.label}: ${ratio}:1 (min ${r.min})`;
      console.log(line);
      if (r.status === 'FAIL' || r.status === 'UNRESOLVED') failures += 1;
      if (r.status === 'WAIVED-FAIL') console.log(`      ⚠ WAIVED: ${r.waiveReason}`);
    }
  }
  console.log(failures ? `\nAUDIT FAIL — ${failures} blocking finding(s)` : '\nAUDIT PASS (waivers printed above, if any)');
  process.exit(failures ? 2 : 0);
}
