#!/usr/bin/env node
/**
 * @swan/forge — WCAG contrast audit over RESOLVED token pairs (plan §11.A4, hardened per GLM code review §12/§13).
 * Parses every theme pack, resolves each declared pair through the token resolution
 * order (component-override → pack semantic), computes the WCAG 2.x contrast ratio,
 * and fails (exit 2) on any unwaived pair below its minimum. Also enforces:
 *  - pack completeness (every semantic name defined)
 *  - NO duplicate declarations of any audited token (GLM HIGH: a duplicate inside
 *    @media/@supports lets a pack show the audit one value and the browser another —
 *    duplicates of audited tokens are therefore a hard failure, not a merge)
 *  - waiver governance: waivers carry {owner, expiry, packs[]}; expired or
 *    non-listed-pack ⇒ the failure is REAL, not waived (mirrors EXCEPTIONS.md law)
 * Zero dependencies. Waivers print LOUDLY — no silent caps.
 * Known limitation (documented): values must be 6/3-digit hex to resolve; color-mix()
 * and var() chains report UNRESOLVED and fail — keep audited tokens plain hex.
 * Gradient/transparent-background policy (Ox F3): the showcase-card gradient and the
 * ghost button's transparent fill are NOT statically auditable; their worst-case is
 * pinned by construction — showcase gradient mixes ≤30% of a fill into bg-surface
 * (audited), and ghost renders text-primary on whatever surface hosts it (audited
 * pairs cover base/surface/elevated). Content placement rules live in the specs.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG = dirname(dirname(fileURLToPath(import.meta.url)));
const PACKS_DIR = join(PKG, 'tokens', 'packs');

/** Semantic names every pack MUST define (kept in sync with tokens/semantic.contract.md — sync-tested). */
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
 * Audited pairs. fg/bg are resolution CHAINS (first defined wins: override → semantic).
 * A waiver is an OBJECT {owner, expiry: 'YYYY-MM-DD', packs: [pack filenames], reason}
 * — pack-scoped and time-boxed, exactly like the drift-lint EXCEPTIONS ledger.
 */
export const PAIRS = [
  { fg: ['--sw-text-primary'], bg: ['--sw-bg-base'], min: 4.5, label: 'body text / page' },
  { fg: ['--sw-text-primary'], bg: ['--sw-bg-surface'], min: 4.5, label: 'body text / card' },
  { fg: ['--sw-text-primary'], bg: ['--sw-bg-elevated'], min: 4.5, label: 'body text / modal' },
  { fg: ['--sw-text-secondary'], bg: ['--sw-bg-surface'], min: 4.5, label: 'secondary text / card' },
  { fg: ['--sw-text-secondary'], bg: ['--sw-bg-elevated'], min: 4.5, label: 'secondary text / modal body' },
  { fg: ['--sw-text-muted'], bg: ['--sw-bg-surface'], min: 4.5, label: 'muted text / card' },
  { fg: ['--sw-text-muted'], bg: ['--sw-bg-base'], min: 4.5, label: 'muted text / page' },
  { fg: ['--sw-text-muted'], bg: ['--sw-bg-elevated'], min: 4.5, label: 'placeholder (muted) / input bg' },
  { fg: ['--sw-text-secondary'], bg: ['--sw-bg-base'], min: 4.5, label: 'secondary text / page' },
  { fg: ['--sw-color-danger'], bg: ['--sw-bg-surface'], min: 4.5, label: 'danger as text (field error) / card' },
  { fg: ['--sw-color-warning'], bg: ['--sw-bg-surface'], min: 4.5, label: 'warning as text (field warning) / card' },
  { fg: ['--sw-color-gold'], bg: ['--sw-bg-elevated'], min: 4.5, label: 'gold pill text / elevated' },
  { fg: ['--sw-color-success'], bg: ['--sw-bg-elevated'], min: 4.5, label: 'success pill text / elevated' },
  { fg: ['--sw-color-danger'], bg: ['--sw-bg-elevated'], min: 4.5, label: 'danger pill text / elevated' },
  { fg: ['--sw-text-inverse'], bg: ['--sw-color-accent'], min: 4.5, label: 'badge / accent pill text', waiver: { owner: 'sean', expiry: '2026-10-01', packs: ['crystalline-swan.css'], reason: 'Same white-on-Wing-Purple pairing as the accent button (4.23:1) — one decision resolves both; see button accent waiver.' } },
  { fg: ['--sw-text-inverse'], bg: ['--sw-color-primary'], min: 4.5, label: 'pill-tab selected / avatar initials on primary' },
  { fg: ['--sw-btn-primary-text', '--sw-text-inverse'], bg: ['--sw-color-primary'], min: 4.5, label: 'button primary label' },
  {
    fg: ['--sw-btn-accent-text', '--sw-text-inverse'], bg: ['--sw-color-accent'], min: 4.5,
    label: 'button accent label',
    waiver: {
      owner: 'sean', expiry: '2026-10-01', packs: ['crystalline-swan.css'],
      reason: 'Matches shipped original GlowButton brand pairing (white on Wing Purple ~4.23:1). Time-boxed pending Sean design review; expiry makes this a hard FAIL if unresolved.',
    },
  },
  { fg: ['--sw-btn-gilded-text', '--sw-text-primary'], bg: ['--sw-btn-gilded-bg', '--sw-color-gold'], min: 4.5, label: 'button gilded label' },
  { fg: ['--sw-btn-success-text', '--sw-text-primary'], bg: ['--sw-btn-success-bg', '--sw-color-success'], min: 4.5, label: 'button success label' },
  { fg: ['--sw-btn-danger-text', '--sw-text-primary'], bg: ['--sw-btn-danger-bg', '--sw-color-danger'], min: 4.5, label: 'button danger label' },
  { fg: ['--sw-focus-ring'], bg: ['--sw-bg-base'], min: 3.0, label: 'focus ring / page (non-text)' },
  // Chart series (forgeChartTheme FORGE_SERIES) — WCAG 1.4.11 non-text contrast vs the page (panel round 6, Ox #5)
  { fg: ['--sw-glow-b'], bg: ['--sw-bg-base'], min: 3.0, label: 'chart series 1 (glow-b) / page (non-text)' },
  { fg: ['--sw-glow-a'], bg: ['--sw-bg-base'], min: 3.0, label: 'chart series 2 (glow-a) / page (non-text)' },
  { fg: ['--sw-color-gold'], bg: ['--sw-bg-base'], min: 3.0, label: 'chart series 3 (gold) / page (non-text)' },
  { fg: ['--sw-color-success'], bg: ['--sw-bg-base'], min: 3.0, label: 'chart series 4 (success) / page (non-text)' },
  { fg: ['--sw-color-warning'], bg: ['--sw-bg-base'], min: 3.0, label: 'chart series 5 (warning) / page (non-text)' },
  { fg: ['--sw-glow-b'], bg: ['--sw-bg-surface'], min: 4.5, label: 'auth link (glow-b as text) / card' },
];

/** Every token name any pair can resolve through — duplicates of these are audit-evasion. */
export const AUDITED_TOKENS = [...new Set(PAIRS.flatMap((p) => [...p.fg, ...p.bg]))];

/**
 * Parse `--name: value;` declarations. Returns { tokens, duplicates } where
 * duplicates lists audited tokens declared more than once anywhere in the file
 * (context-free on purpose: ANY second declaration of an audited token — media
 * query, @supports, second selector block — is rejected rather than merged).
 * @param {string} css
 */
export function parseTokens(css) {
  // Ox F2: strip comments FIRST — a token that exists only inside /* … */ must not
  // satisfy the completeness gate (the browser never applies it).
  const live = css.replace(/\/\*[\s\S]*?\*\//g, '');
  /** @type {Record<string, string>} */
  const tokens = {};
  /** @type {Record<string, number>} */
  const counts = {};
  for (const m of live.matchAll(/(--sw-[\w-]+)\s*:\s*([^;]+);/g)) {
    counts[m[1]] = (counts[m[1]] ?? 0) + 1;
    tokens[m[1]] = m[2].trim();
  }
  const duplicates = AUDITED_TOKENS.filter((n) => (counts[n] ?? 0) > 1);
  return { tokens, counts, duplicates };
}

/** @param {string} hex #RGB or #RRGGBB → [r,g,b] 0..255, or null (4/8-digit alpha hex deliberately rejected → loud UNRESOLVED) */
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

/** Is this pair's waiver applicable for this pack, today? */
export function waiverApplies(pair, packName, today = new Date()) {
  const w = pair.waiver;
  if (!w) return false;
  if (!Array.isArray(w.packs) || !w.packs.includes(packName)) return false;
  if (!w.expiry || new Date(w.expiry) < today) return false;
  return true;
}

export function auditPack(name, css, today = new Date()) {
  const { tokens, duplicates } = parseTokens(css);
  const missing = SEMANTIC_NAMES.filter((n) => !(n in tokens));
  const results = [];
  for (const pair of PAIRS) {
    const fg = resolveChain(tokens, pair.fg);
    const bg = resolveChain(tokens, pair.bg);
    if (!fg || !bg) { results.push({ ...pair, pack: name, ratio: null, status: 'UNRESOLVED' }); continue; }
    const ratio = contrastRatio(fg, bg);
    const pass = ratio !== null && ratio >= pair.min;
    // Ox F1: a waiver excuses a KNOWN low ratio, never instrument failure —
    // a null ratio (corrupt hex) on a waived pair is a blocking FAIL.
    const status = pass ? 'PASS'
      : ratio !== null && waiverApplies(pair, name, today) ? 'WAIVED-FAIL'
      : 'FAIL';
    results.push({ ...pair, pack: name, fgHex: fg, bgHex: bg, ratio, status });
  }
  return { missing, duplicates, results };
}

// ── CLI ──────────────────────────────────────────────────────────────
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  let failures = 0;
  for (const file of readdirSync(PACKS_DIR).filter((f) => f.endsWith('.css'))) {
    const { missing, duplicates, results } = auditPack(file, readFileSync(join(PACKS_DIR, file), 'utf8'));
    console.log(`\n=== pack: ${file} ===`);
    if (missing.length) { failures += missing.length; console.log(`  CONTRACT INCOMPLETE — missing: ${missing.join(', ')}`); }
    if (duplicates.length) { failures += duplicates.length; console.log(`  DUPLICATE AUDITED TOKEN(S) — evasion risk, hard fail: ${duplicates.join(', ')}`); }
    for (const r of results) {
      const ratio = r.ratio ? r.ratio.toFixed(2) : '—';
      console.log(`  [${r.status}] ${r.label}: ${ratio}:1 (min ${r.min})`);
      if (r.status === 'FAIL' || r.status === 'UNRESOLVED') failures += 1;
      if (r.status === 'WAIVED-FAIL') console.log(`      ⚠ WAIVED (owner: ${r.waiver.owner}, expires ${r.waiver.expiry}, pack-scoped): ${r.waiver.reason}`);
    }
  }
  console.log(failures ? `\nAUDIT FAIL — ${failures} blocking finding(s)` : '\nAUDIT PASS (waivers printed above, if any)');
  process.exit(failures ? 2 : 0);
}
