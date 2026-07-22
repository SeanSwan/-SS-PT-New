/**
 * EvidenceLensBand.test.tsx — SWA-25 contract guards
 * ===================================================
 * Locks the ratification's data-truth laws onto the Evidence Lens band:
 *  1. The circled number comes from the marketingStats truth module (never a raw literal).
 *  2. The proof copy is the ratified honest framing (records, not promises).
 *  3. The draw animation carries a reduced-motion escape (ring renders complete).
 *  4. The band is mounted in HomeVNext (a lazy import declaration is not a mount — JSX is).
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'fs';
import { join } from 'path';
import { EvidenceLensBand } from './EvidenceLensBand';
import { MARKETING_STATS } from '../../../content/marketingStats';

const SRC = (f: string): string => readFileSync(join(__dirname, f), 'utf-8');

describe('EvidenceLensBand (SWA-25)', () => {
  it('circles the truth-module number, not an invented one', () => {
    render(<EvidenceLensBand />);
    const { value, suffix } = MARKETING_STATS.exerciseLibrary;
    expect(screen.getByText(`${value}${suffix}`)).toBeTruthy();
  });

  it('sources its number ONLY from marketingStats (no raw proof literals)', () => {
    const src = SRC('EvidenceLensBand.tsx');
    expect(src).toContain("from '../../../content/marketingStats'");
    // The known value must not be hardcoded anywhere in the component source.
    // (font-weight declarations stripped first — weight 900 is typography, not a claim.)
    const { value } = MARKETING_STATS.exerciseLibrary;
    const withoutTypography = src.replace(/font-weight\s*:\s*\d+/g, 'font-weight:W');
    expect(withoutTypography).not.toMatch(new RegExp(`\\b${value}\\b`));
  });

  it('does not duplicate a fact the stats strip already shows (card standard)', () => {
    // The strip (HomeData STATS) shows 6 stats; the lens must circle one it does NOT.
    const homeData = readFileSync(join(__dirname, 'shared/HomeData.ts'), 'utf-8');
    expect(homeData).not.toContain('MARKETING_STATS.exerciseLibrary');
  });

  it('keeps the ratified honest framing', () => {
    render(<EvidenceLensBand />);
    expect(screen.getByText(/we don't promise transformations/i)).toBeTruthy();
    expect(screen.getByText(/marks evidence, never hype/i)).toBeTruthy();
  });

  it('has a reduced-motion escape for the lens draw', () => {
    const src = SRC('EvidenceLensBand.tsx');
    expect(src).toContain('prefers-reduced-motion');
    expect(src).toMatch(/animation:\s*none/);
  });

  it('is mounted DIRECTLY in canonical HomePage.V4 — no flag, no toggle (Sean 2026-07-21)', () => {
    const home = SRC('HomePage.V4.tsx');
    expect(home).toContain('<EvidenceLensBand />');
    // The mount must be unconditional: no flag hook or && guard on the band's line.
    expect(home).not.toMatch(/EvidenceLensBand[^\n]*&&|&&[^\n]*<EvidenceLensBand/);
  });
});
