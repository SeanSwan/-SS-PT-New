/**
 * Equipment IQ geometry contracts — even spoke spacing (7 OR 8 patterns,
 * never hardcoded), coverage radius scaling, weakest detection (backend
 * tie-break mirror), polygon paths, and the mobile arc-gauge layout.
 */
import { describe, expect, it } from 'vitest';
import {
  ARC_GAP_RAD,
  WEB_RADIUS_RATIO,
  computeArcGauge,
  computeSpokePoints,
  coveragePercent,
  findWeakestPattern,
  polygonPath,
} from './equipmentIQGeometry';

const pattern = (name: string, coverage: number) => ({ pattern: name, coverage });

const EIGHT = ['push', 'pull', 'hinge', 'squat', 'lunge', 'carry', 'core', 'rotation'];

describe('computeSpokePoints', () => {
  it('spaces 8 spokes evenly, first at the top', () => {
    const spokes = computeSpokePoints(EIGHT.map((p) => pattern(p, 0.5)), 320);
    expect(spokes).toHaveLength(8);
    expect(spokes[0].angle).toBe(0);
    for (let i = 1; i < spokes.length; i += 1) {
      expect(spokes[i].angle - spokes[i - 1].angle).toBeCloseTo((2 * Math.PI) / 8, 10);
    }
    // First spoke points straight up: same x as center, y above center.
    expect(spokes[0].outerX).toBeCloseTo(160, 1);
    expect(spokes[0].outerY).toBeLessThan(160);
  });

  it('spaces 7 spokes evenly too — count is never hardcoded', () => {
    const spokes = computeSpokePoints(EIGHT.slice(0, 7).map((p) => pattern(p, 1)), 320);
    expect(spokes).toHaveLength(7);
    for (let i = 1; i < spokes.length; i += 1) {
      expect(spokes[i].angle - spokes[i - 1].angle).toBeCloseTo((2 * Math.PI) / 7, 10);
    }
  });

  it('scales the coverage tip radius proportionally to coverage', () => {
    const size = 320;
    const spokes = computeSpokePoints(
      [pattern('push', 1), pattern('pull', 0.5), pattern('core', 0)],
      size,
    );
    const cx = size / 2;
    const cy = size / 2;
    const maxRadius = size * WEB_RADIUS_RATIO;
    const tipRadius = (s: (typeof spokes)[number]) => Math.hypot(s.tipX - cx, s.tipY - cy);
    expect(tipRadius(spokes[0])).toBeCloseTo(maxRadius, 1);
    expect(tipRadius(spokes[1])).toBeCloseTo(maxRadius * 0.5, 1);
    expect(tipRadius(spokes[2])).toBeCloseTo(0, 1);
    // Outer (guide) radius is coverage-independent.
    spokes.forEach((s) => {
      expect(Math.hypot(s.outerX - cx, s.outerY - cy)).toBeCloseTo(maxRadius, 1);
    });
  });

  it('clamps out-of-range coverage values into 0..1', () => {
    const spokes = computeSpokePoints(
      [pattern('push', 4), pattern('pull', -1), pattern('core', Number.NaN)],
      320,
    );
    expect(spokes[0].coverage).toBe(1);
    expect(spokes[1].coverage).toBe(0);
    expect(spokes[2].coverage).toBe(0);
  });

  it('returns [] for an empty pattern list', () => {
    expect(computeSpokePoints([], 320)).toEqual([]);
  });
});

describe('findWeakestPattern', () => {
  it('picks the lowest coverage', () => {
    expect(
      findWeakestPattern([pattern('push', 0.8), pattern('pull', 0.2), pattern('core', 0.5)]),
    ).toBe('pull');
  });

  it('breaks ties by earliest index — mirrors the backend', () => {
    expect(
      findWeakestPattern([pattern('push', 0.5), pattern('pull', 0.5), pattern('core', 0.5)]),
    ).toBe('push');
  });

  it('returns null for an empty list', () => {
    expect(findWeakestPattern([])).toBeNull();
  });
});

describe('polygonPath', () => {
  it('builds a closed heptagon with 7 vertices', () => {
    const path = polygonPath(80, 80, 62, 7);
    expect(path.startsWith('M ')).toBe(true);
    expect(path.endsWith(' Z')).toBe(true);
    expect(path.split(' L ')).toHaveLength(7);
  });

  it('returns an empty string for degenerate input', () => {
    expect(polygonPath(80, 80, 62, 2)).toBe('');
    expect(polygonPath(80, 80, 0, 7)).toBe('');
  });
});

describe('computeArcGauge', () => {
  it('creates one segment per pattern with track + proportional fill', () => {
    const gauge = computeArcGauge(
      [pattern('push', 1), pattern('pull', 0.5), pattern('core', 0)],
      320,
    );
    expect(gauge.segments).toHaveLength(3);
    gauge.segments.forEach((segment) => {
      expect(segment.trackPath).toMatch(/^M .+ A .+/);
    });
    expect(gauge.segments[0].fillPath).toMatch(/^M .+ A .+/);
    expect(gauge.segments[1].fillPath).toMatch(/^M .+ A .+/);
    // Zero coverage never draws a fill arc.
    expect(gauge.segments[2].fillPath).toBeNull();
  });

  it('keeps every segment inside the top semicircle', () => {
    const gauge = computeArcGauge(EIGHT.map((p) => pattern(p, 1)), 320);
    expect(gauge.segments).toHaveLength(8);
    gauge.segments.forEach((segment) => {
      const coords = segment.trackPath.match(/-?\d+(\.\d+)?/g)!.map(Number);
      // Path y-coordinates (indices 1 and last) sit at or above the center line.
      expect(coords[1]).toBeLessThanOrEqual(gauge.cy + 0.01);
      expect(coords[coords.length - 1]).toBeLessThanOrEqual(gauge.cy + 0.01);
    });
    // Sanity: gap constant participates in the sweep math.
    expect(ARC_GAP_RAD).toBeGreaterThan(0);
  });

  it('handles an empty pattern list without segments', () => {
    const gauge = computeArcGauge([], 320);
    expect(gauge.segments).toEqual([]);
    expect(gauge.width).toBe(320);
  });
});

describe('coveragePercent', () => {
  it('rounds and clamps to a whole percent', () => {
    expect(coveragePercent(0.625)).toBe(63);
    expect(coveragePercent(1.4)).toBe(100);
    expect(coveragePercent(-0.2)).toBe(0);
    expect(coveragePercent(Number.NaN)).toBe(0);
  });
});
