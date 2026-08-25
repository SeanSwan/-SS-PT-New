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
import { join } from 'node:path';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import ForgeButton from './ForgeButton';

const repoRoot = join(__dirname, '..', '..', '..', '..', '..');
const glowSrc = readFileSync(
  join(__dirname, '..', 'buttons', 'GlowButton.tsx'),
  'utf8',
);
const packSrc = readFileSync(
  join(repoRoot, 'packages', 'swan-forge', 'tokens', 'packs', 'crystalline-swan.css'),
  'utf8',
).replace(/\/\*[\s\S]*?\*\//g, '');

/** Pull a named field out of a GlowButton BUTTON_THEMES variant block. */
function glowTheme(variant: string, field: string): string {
  const block = glowSrc.match(new RegExp(`${variant}:\\s*{([\\s\\S]*?)}`));
  if (!block) throw new Error(`variant ${variant} not found in GlowButton.tsx`);
  const m = block[1].match(new RegExp(`${field}:\\s*"([^"]+)"`));
  if (!m) throw new Error(`${variant}.${field} not found`);
  return m[1];
}

function packToken(name: string): string {
  const m = packSrc.match(new RegExp(`${name}\\s*:\\s*([^;]+);`));
  if (!m) throw new Error(`${name} not found in crystalline-swan.css`);
  return m[1].trim();
}

describe('taste-anchor parity: pack ⇄ original GlowButton (source-parsed, never hand-copied)', () => {
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
  it('click fires when active', () => {
    const onClick = vi.fn();
    render(<ForgeButton text="Go" onClick={onClick} />);
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
