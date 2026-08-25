/**
 * ForgeButton parity + binding tests — Phase 1.5 wiring-gate acceptance
 * (plan §6 Phase 1.5, §12.1). Two proofs:
 *  1. TASTE-ANCHOR PARITY: the crystalline-swan pack carries the ORIGINAL
 *     GlowButton's exact values — parsed from GlowButton.tsx source at test
 *     time, so drift in EITHER file turns this red (never a hand-copied table).
 *  2. BINDING CONTRACT: ForgeButton renders the core's classes/aria and honors
 *     GlowButton's legacy prop aliases, so strangler swaps are safe.
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import ForgeButton from './ForgeButton';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..', '..', '..', '..');
const glowSrc = readFileSync(join(here, '..', 'buttons', 'GlowButton.tsx'), 'utf8');
const packSrc = readFileSync(
  join(repoRoot, 'packages', 'swan-forge', 'tokens', 'packs', 'crystalline-swan.css'),
  'utf8',
).replace(/\/\*[\s\S]*?\*\//g, '');

/**
 * Pull a named field out of a GlowButton BUTTON_THEMES variant block.
 * Anchored to the BUTTON_THEMES table (not the first `variant:` anywhere) and
 * asserts the match is unique inside it — a silent false-parity is the failure
 * mode this guards against (GLM Phase-1.5 review §4).
 */
function glowTheme(variant: string, field: string): string {
  const tableStart = glowSrc.indexOf('const BUTTON_THEMES');
  if (tableStart < 0) throw new Error('BUTTON_THEMES table not found in GlowButton.tsx');
  const tableEnd = glowSrc.indexOf('\n};', tableStart); // the object's own closing brace at column 0
  if (tableEnd < 0) throw new Error('BUTTON_THEMES table end not found');
  const table = glowSrc.slice(tableStart, tableEnd);
  const blocks = [...table.matchAll(new RegExp(`\\n\\s*${variant}:\\s*{([^}]*)}`, 'g'))];
  if (blocks.length !== 1) throw new Error(`expected exactly one ${variant} block in BUTTON_THEMES, found ${blocks.length}`);
  const m = blocks[0][1].match(new RegExp(`${field}:\\s*"([^"]+)"`));
  if (!m) throw new Error(`${variant}.${field} not found`);
  return m[1];
}

/** CSS is last-wins: take the LAST base declaration (at-rule blocks stripped). */
function packToken(name: string): string {
  const base = packSrc.replace(/@(?:media|supports|container)[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
  const all = [...base.matchAll(new RegExp(`${name}\\s*:\\s*([^;]+);`, 'g'))];
  if (!all.length) throw new Error(`${name} not found in crystalline-swan.css`);
  return all[all.length - 1][1].trim();
}

const primitiveSrc = readFileSync(
  join(repoRoot, 'packages', 'swan-forge', 'tokens', 'primitive.css'),
  'utf8',
);

// VALUE parity (token subset) — NOT rendered/pixel parity. The rendered-cascade
// receipt lives in the Phase 1.5 record (plan §16): computed styles on the mounted
// GolfSection CTA in the production bundle via vite preview + Playwright.
describe('value parity (token subset): pack ⇄ original GlowButton (source-parsed, never hand-copied)', () => {
  it('accent TEXT is the original white (text-inverse fallback)', () => {
    expect(packToken('--sw-text-inverse')).toBe(glowTheme('accent', 'color'));
  });
  it('44px target floor is the primitive the skin resolves (min-block-size)', () => {
    const m = primitiveSrc.match(/--sw-p-target-min\s*:\s*([^;]+);/);
    expect(m?.[1].trim()).toBe('44px');
  });
  it('primary: Midnight Sapphire fill, Frost White text, purple→cyan Dual-Button Glow', () => {
    expect(packToken('--sw-color-primary')).toBe(glowTheme('primary', 'background'));
    expect(packToken('--sw-btn-primary-text')).toBe(glowTheme('primary', 'color'));
    expect(packToken('--sw-glow-a')).toBe(glowTheme('primary', 'glowStart'));
    expect(packToken('--sw-glow-b')).toBe(glowTheme('primary', 'glowEnd'));
  });
  it('accent: Wing Purple fill, Ice Wing→Arctic Cyan glow pair', () => {
    expect(packToken('--sw-color-accent')).toBe(glowTheme('accent', 'background'));
    expect(packToken('--sw-glow-b')).toBe(glowTheme('accent', 'glowStart'));
    expect(packToken('--sw-btn-accent-glow-b')).toBe(glowTheme('accent', 'glowEnd'));
  });
  it('gilded (the wired GolfSection variant): dark-gold fill + Gilded Fern glow pair', () => {
    expect(packToken('--sw-btn-gilded-bg')).toBe(glowTheme('gilded', 'background'));
    expect(packToken('--sw-btn-gilded-glow-a')).toBe(glowTheme('gilded', 'glowStart'));
    expect(packToken('--sw-btn-gilded-glow-b')).toBe(glowTheme('gilded', 'glowEnd'));
  });
  it('success + danger fills match the original', () => {
    expect(packToken('--sw-btn-success-bg')).toBe(glowTheme('success', 'background'));
    expect(packToken('--sw-btn-danger-bg')).toBe(glowTheme('danger', 'background'));
  });
  it('gilded/success/danger TEXT resolves to the original color via the text-primary fallback', () => {
    // skin resolves each variant's text through the per-variant override, then the
    // pack's text-primary; crystalline defines no per-variant text for these three.
    for (const v of ['gilded', 'success', 'danger']) {
      expect(packToken('--sw-text-primary')).toBe(glowTheme(v, 'color'));
    }
  });
  it('base motion multiplier is ON in the pack (reduced-motion block does not leak)', () => {
    expect(packToken('--sw-motion')).toBe('1');
  });
  it('GEOMETRY parity: Forge size defaults equal the original BUTTON_SIZES table (source-parsed)', () => {
    const buttonCss = readFileSync(join(repoRoot, 'packages', 'swan-forge', 'css', 'button.css'), 'utf8');
    const sizeTable = glowSrc.slice(glowSrc.indexOf('const BUTTON_SIZES'), glowSrc.indexOf('\n};', glowSrc.indexOf('const BUTTON_SIZES')));
    const orig = (size: string, field: string) => sizeTable.match(new RegExp(`${size}:\\s*{[^}]*${field}:\\s*"([^"]+)"`))?.[1];
    const forge = (token: string) => buttonCss.match(new RegExp(`var\\(${token},\\s*([^)]+)\\)`))?.[1].trim();
    expect(forge('--sw-btn-height')).toBe(orig('medium', 'height'));
    expect(forge('--sw-btn-radius')).toBe(orig('medium', 'borderRadius'));
    expect(forge('--sw-btn-height-sm')).toBe(orig('small', 'height'));
    expect(forge('--sw-btn-radius-sm')).toBe(orig('small', 'borderRadius'));
    expect(forge('--sw-btn-height-lg')).toBe(orig('large', 'height'));
    expect(forge('--sw-btn-radius-lg')).toBe(orig('large', 'borderRadius'));
    expect(buttonCss).toMatch(/font-weight:\s*500;/);
    expect(glowSrc).toMatch(/font-weight:\s*500;/);
  });
  it('focus-shadow and ease ARE defined in the pack (composites the JS projection omits)', () => {
    expect(packToken('--sw-focus-shadow')).toContain('--sw-focus-ring'); // swan-guard-allow-hex test asserts token TEXT; Forge tokens are defined in packages/swan-forge
    expect(packToken('--sw-ease')).toBeTruthy();
  });
});

describe('ForgeButton binding contract', () => {
  it('renders text, sw-namespaced classes, self-scoped pack class, and the variant', () => {
    render(<ForgeButton text="Improve Your Game" variant="gilded" />);
    const btn = screen.getByRole('button', { name: 'Improve Your Game' });
    expect(btn.className).toContain('sw-pack-crystalline-swan');
    expect(btn.className).toContain('sw-btn');
    expect(btn.className).toContain('sw-btn--gilded');
    expect(btn).toHaveAttribute('data-variant', 'gilded');
    expect(btn).toHaveAttribute('type', 'button');
  });
  it('honors GlowButton legacy aliases (theme=neonBlue → accent)', () => {
    render(<ForgeButton theme="neonBlue" text="Legacy" />);
    expect(screen.getByRole('button', { name: 'Legacy' }).className).toContain('sw-btn--accent');
  });
  it('loading: focusable, aria-busy, click suppressed', () => {
    const onClick = vi.fn();
    render(<ForgeButton text="Saving" isLoading onClick={onClick} />);
    const btn = screen.getByRole('button', { name: 'Saving' });
    expect(btn).toHaveAttribute('aria-busy', 'true');
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });
  it('disabled uses native attribute and suppresses clicks', () => {
    const onClick = vi.fn();
    render(<ForgeButton text="Off" disabled onClick={onClick} />);
    const btn = screen.getByRole('button', { name: 'Off' });
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });
  it('legacy props: animateOnRender → entrance class; pulse/haptic/glowIntensity never reach the DOM', () => {
    render(<ForgeButton text="Legacy" pulse haptic animateOnRender glowIntensity="high" startIcon={<span>★</span>} />);
    const btn = screen.getByRole('button', { name: /Legacy/ });
    for (const junk of ['pulse', 'haptic', 'animateonrender', 'glowintensity']) {
      expect(btn.hasAttribute(junk)).toBe(false);
    }
    expect(btn.className).toContain('sw-btn--enter');
    expect(btn.textContent).toContain('★');
    render(<ForgeButton text="Static" />);
    expect(screen.getByRole('button', { name: 'Static' }).className).not.toContain('sw-btn--enter');
  });
  it('click fires when active', () => {
    const onClick = vi.fn();
    render(<ForgeButton text="Go" onClick={onClick} />);
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
