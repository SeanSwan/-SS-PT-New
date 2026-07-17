/**
 * surfaceMotionTiers.contract.test.ts — locks the calm-zone guarantee.
 *
 * These assertions are the mechanism behind "data, money and legal lanes are guaranteed calm".
 * If one fails, a surface silently gained motion it is not licensed for.
 */
import { describe, it, expect } from 'vitest';
import {
  SURFACE_MOTION_TIERS,
  DEFAULT_SURFACE_TIER,
  licenceFor,
  resolveMotionTier,
  motionAffordances,
  tierAllows,
  CAPABILITY_CEILING,
} from './surfaceMotionTiers';

describe('surface motion licences', () => {
  it('freezes every money, legal and operator lane at M0', () => {
    // Ratified law: motion here is a liability. Changing one of these needs Sean + a new receipt.
    const MUST_BE_FROZEN = ['store.checkout', 'legal.waiver', 'admin.finance', 'coach.assistant'] as const;
    for (const surface of MUST_BE_FROZEN) {
      expect(SURFACE_MOTION_TIERS[surface], `${surface} must be M0`).toBe('M0');
      expect(motionAffordances(licenceFor(surface)).isFrozen).toBe(true);
    }
  });

  it('never lets a dashboard reach cinematic (M3) atmosphere', () => {
    // The world whispers in the rooms where people work; it only sings on conversion surfaces.
    const dashboards = Object.keys(SURFACE_MOTION_TIERS).filter((s) => s.startsWith('dashboard.'));
    expect(dashboards.length).toBeGreaterThan(0);
    for (const surface of dashboards) {
      expect(motionAffordances(licenceFor(surface)).allowsAtmosphere, `${surface} must not allow atmosphere`).toBe(false);
    }
  });

  it('fails SAFE for unregistered surfaces', () => {
    // A forgotten registration must never buy motion.
    expect(licenceFor('surface.that.does.not.exist')).toBe(DEFAULT_SURFACE_TIER);
    expect(DEFAULT_SURFACE_TIER).toBe('M0');
  });

  it('takes the MINIMUM of licence and device capability (both directions)', () => {
    // Licence caps a powerful device...
    expect(resolveMotionTier('dashboard.trainer', 'full')).toBe('M1');
    // ...and capability caps a generous licence.
    expect(resolveMotionTier('marketing.home', 'balanced')).toBe('M2');
    expect(resolveMotionTier('marketing.home', 'full')).toBe('M3');
  });

  it('reduces every surface to frozen on the essential tier (reduced-motion path)', () => {
    // useAnimationTier maps prefers-reduced-motion -> 'essential'. The authored static story is then
    // the WHOLE story, on every surface, with no exceptions and no per-surface opt-out.
    expect(CAPABILITY_CEILING.essential).toBe('M0');
    for (const surface of Object.keys(SURFACE_MOTION_TIERS)) {
      expect(resolveMotionTier(surface, 'essential'), `${surface} must freeze under reduced motion`).toBe('M0');
    }
  });

  it('orders tiers so affordances are monotonic', () => {
    expect(tierAllows('M3', 'M1')).toBe(true);
    expect(tierAllows('M1', 'M3')).toBe(false);
    const m3 = motionAffordances('M3');
    expect([m3.allowsFeedback, m3.allowsReveals, m3.allowsAtmosphere]).toEqual([true, true, true]);
    const m0 = motionAffordances('M0');
    expect([m0.allowsFeedback, m0.allowsReveals, m0.allowsAtmosphere]).toEqual([false, false, false]);
  });
});
