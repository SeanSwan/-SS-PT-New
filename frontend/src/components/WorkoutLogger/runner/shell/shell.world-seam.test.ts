/**
 * ┌─────────────────────────────────────────────────────────────┐
 * │ SESSION SHELL — Lens world-seam law (Sean, 2026-07-31).     │
 * │ Live bug: the NOW hero wore var(--surface-raised, #003080)  │
 * │ and --surface-raised is defined NOWHERE — the blue fallback │
 * │ always won, under EVERY Appearance Studio palette ("the     │
 * │ main panel stays blue no matter what theme I choose").      │
 * │ Law: runner chrome colors ride the WorldContractRoot seam   │
 * │ (--world-bg/panel/text/muted/accent/action) or a declared   │
 * │ semantic constant (gold=earned, purple=Coach, danger/warn,  │
 * │ focus ring). Static app tokens that no Lens palette can     │
 * │ move are BANNED here — they are how "stays blue" happens.   │
 * │ Exception: the ActionBar commit primary is BRAND-FIXED by   │
 * │ ruling (Dual-Button Glow) — the world seam owns surfaces,   │
 * │ text and accents, never the commit action.                  │
 * └─────────────────────────────────────────────────────────────┘
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const RUNNER_DIR = resolve(__dirname, '..');
const WORLD_DEFAULTS = resolve(__dirname, '../../../../adapters/style-lens-swan/v2/worldDefaults.ts');

/** Chrome sources: runner/** minus tests and minus recipes/ (recipes carry
 *  their own token contract + computed-contrast audit). */
function walkChrome(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === 'recipes') continue;
      out.push(...walkChrome(full));
    } else if (/\.(ts|tsx)$/.test(name) && !name.includes('.test.')) {
      out.push(full);
    }
  }
  return out;
}

const files = walkChrome(RUNNER_DIR);
const label = (file: string) => relative(RUNNER_DIR, file).replace(/\\/g, '/');

/** Palette-dead app tokens: no Lens recipe emits them, so their fallback hex
 *  is permanent. Each has a world-seam replacement. */
const DEAD_TOKENS = [
  '--surface-raised',
  '--surface-elevated',
  '--surface-dark',
  '--bg-deep',
  '--bg-surface',
  '--bg-base',
  '--text-primary',
  '--text-secondary',
  '--text-muted',
  '--frost-white',
  '--card-dark',
];

/** The ONE brand-fixed exception: ActionBar's commit primary gradient
 *  (Dual-Button Glow ruling, RAIL-NAV-CONSULT-KIMI-2026-07-31 §e). */
const BRAND_PRIMARY_FILE = 'shell/zones/ActionBar.tsx';
const BRAND_PRIMARY_TOKENS = ['--accent-primary', '--swan-lavender'];

describe('Lens world-seam law: chrome colors must answer the palette', () => {
  it('scanned a real tree (non-vacuous guard)', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it('no palette-dead app tokens anywhere in runner chrome', () => {
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      const offenders = DEAD_TOKENS.filter((token) => source.includes(`var(${token}`));
      expect(
        { file: label(file), offenders },
        `${label(file)} uses palette-dead tokens ${offenders.join(', ')} — the fallback hex is `
        + 'permanent under every Lens palette. Ride --world-* (or a declared semantic constant).',
      ).toEqual({ file: label(file), offenders: [] });
    }
  });

  it('brand accent tokens appear ONLY in the ActionBar commit primary (ruled exception)', () => {
    for (const file of files) {
      if (label(file) === BRAND_PRIMARY_FILE) continue;
      const source = readFileSync(file, 'utf8');
      const offenders = BRAND_PRIMARY_TOKENS.filter((token) => source.includes(`var(${token}`));
      expect(
        { file: label(file), offenders },
        `${label(file)} wears the brand commit gradient tokens — those are ActionBar-primary-only; `
        + 'chrome accents ride --world-accent.',
      ).toEqual({ file: label(file), offenders: [] });
    }
  });

  it('every --world-* token the chrome consumes is guaranteed by WorldContractRoot', () => {
    const contract = readFileSync(WORLD_DEFAULTS, 'utf8');
    const guaranteed = new Set(
      [...contract.matchAll(/(--world-[a-z-]+):/g)].map((match) => match[1]),
    );
    expect(guaranteed.size).toBeGreaterThanOrEqual(6); // bg, panel, text, muted, accent, action
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      const consumed = [...source.matchAll(/var\((--world-[a-z-]+)[,)]/g)].map((m) => m[1]);
      const orphans = consumed.filter((token) => !guaranteed.has(token));
      expect(
        { file: label(file), orphans },
        `${label(file)} consumes world tokens the contract never defines — they would dead-fallback `
        + 'exactly like the tokens this law bans.',
      ).toEqual({ file: label(file), orphans: [] });
    }
  });

  it('color-mix backgrounds carry a flat pre-declaration (iOS < 16.2 fallback)', () => {
    // New-code law (Kimi c.5): a `background:` whose value needs color-mix must
    // be preceded by a plain background declaration somewhere in the same block.
    // Statically approximated: every styles file that sets a color-mix background
    // must also contain at least one flat var() background declaration.
    for (const file of files.filter((f) => /Rail\.styles\.ts$/.test(f))) {
      const source = readFileSync(file, 'utf8');
      if (/background:[^;]*color-mix/.test(source)) {
        expect(source, `${label(file)} needs a flat background fallback before color-mix`)
          .toMatch(/background:\s*var\(--world-/);
      }
    }
  });
});
