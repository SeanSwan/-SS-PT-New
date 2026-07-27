/**
 * SwanRankBadge + ranks.config + CrystalCygnet tests.
 * Verifies the data-driven rank math, the gunmetal-not-grey low tier, sub-tier
 * pip fill, crown gating, companion mobile-cull structure, and the Molt.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import SwanRankBadge from './SwanRankBadge';
import CrystalCygnet from './CrystalCygnet';
import {
  badgeStateFor, rankOf, subTierOf, rankFrameOf, RANK_FRAMES, RANK_COUNT,
} from './ranks.config';

describe('ranks.config', () => {
  it('has 10 ranks every 100 levels, contiguous over 1..1000', () => {
    expect(RANK_COUNT).toBe(10);
    expect(RANK_FRAMES).toHaveLength(10);
    expect(RANK_FRAMES[0].minLevel).toBe(1);
    expect(RANK_FRAMES[9].maxLevel).toBe(1000);
    expect(rankOf(1)).toBe(1);
    expect(rankOf(100)).toBe(1);
    expect(rankOf(101)).toBe(2);
    expect(rankOf(1000)).toBe(10);
  });

  it('fills a sub-tier pip every 10 levels (1..10 within a rank)', () => {
    expect(subTierOf(1)).toBe(1);
    expect(subTierOf(10)).toBe(1);
    expect(subTierOf(11)).toBe(2);
    expect(subTierOf(100)).toBe(10);
    expect(subTierOf(101)).toBe(1); // resets at the new rank
  });

  it('NEVER ships a grey low rank — rank 1 edge is gunmetal, not a grey token', () => {
    const r1 = rankFrameOf(1);
    // gunmetal token, never a bare grey / disabled hue
    expect(r1.frameEdge).toContain('--rank-gunmetal');
    expect(r1.name).toBe('Cygnet');
  });

  it('unlocks the crown only at the top ranks and marks the Sovereign', () => {
    expect(rankFrameOf(50).crown).toBe(false);   // rank 1
    expect(rankFrameOf(650).crown).toBe(true);   // rank 7+
    expect(badgeStateFor(1000).isSovereign).toBe(true);
    expect(badgeStateFor(500).isSovereign).toBe(false);
  });

  it('accretes facets by rank (Crystal Growth is monotonic)', () => {
    expect(rankFrameOf(1000).facets).toBeGreaterThan(rankFrameOf(1).facets);
  });

  it('clamps out-of-range levels', () => {
    expect(rankOf(-5)).toBe(1);
    expect(rankOf(99999)).toBe(10);
    expect(subTierOf(NaN)).toBe(1);
  });
});

describe('SwanRankBadge', () => {
  it('renders the rank name + number and nests the level number from the ring', () => {
    const { getByText } = render(<SwanRankBadge pct={40} level={7} />);
    expect(getByText(/Cygnet/)).toBeTruthy();
    expect(getByText('7')).toBeTruthy(); // ring's level number
  });

  it('shows a crown at a top rank and none at a low rank', () => {
    const low = render(<SwanRankBadge pct={10} level={30} />);
    const high = render(<SwanRankBadge pct={10} level={950} showCompanion={false} />);
    // crown svg path only present on high-rank badges
    const lowPaths = low.container.querySelectorAll('path');
    const highPaths = high.container.querySelectorAll('path');
    expect(highPaths.length).toBeGreaterThan(lowPaths.length);
  });

  it('is fully decorative — no nested progressbar/button ARIA trap at the frame level', () => {
    const { container } = render(<SwanRankBadge pct={40} level={5} />);
    // the frame svg is aria-hidden; the accessible role stays with the parent
    // that mounts the badge (the badge itself declares no role=button ancestor)
    expect(container.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
    expect(container.querySelector('[role="progressbar"]')).toBeNull();
  });
});

describe('CrystalCygnet (companion)', () => {
  it('renders and is decorative', () => {
    const { container } = render(<CrystalCygnet level={1} />);
    expect(container.querySelector('svg[focusable="false"]')).not.toBeNull();
    expect(container.querySelector('.cygnet-head')).not.toBeNull();
  });

  it('Molts whiter as level rises (gunmetal → frost-white plane fill)', () => {
    const low = render(<CrystalCygnet level={1} />);
    const high = render(<CrystalCygnet level={1000} />);
    const lowPct = parseInt((low.container.firstElementChild as HTMLElement)?.style.getPropertyValue('--molt-white') || '0', 10);
    const highPct = parseInt((high.container.firstElementChild as HTMLElement)?.style.getPropertyValue('--molt-white') || '0', 10);
    expect(highPct).toBeGreaterThan(lowPct);
  });

  it('freezes (no animation classes stripped, still-pose) in still quality', () => {
    const { container } = render(<CrystalCygnet level={500} quality="still" />);
    expect(container.querySelector('[data-still="true"]')).not.toBeNull();
  });
});