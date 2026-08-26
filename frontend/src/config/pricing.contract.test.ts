/**
 * Pricing policy contract.
 *
 * The client-handoff sheet drifted once already: it advertised a $200 tier that
 * does not exist and a 10-session pack at $160/session labelled "Save $200" - a
 * volume discount SwanStudios does not offer. Because the only consumer is the
 * sheet a trainer hands a prospect, that drift was a live mis-quote risk on the
 * acquisition surface.
 *
 * These assertions encode the policy so the next edit has to argue with a test
 * rather than silently reintroduce a discount.
 */
import { describe, expect, it } from 'vitest';
import { PACKAGES, SESSION_RATE_60_MIN, SESSION_RATE_30_MIN } from './pricing';

describe('pricing policy contract', () => {
  it('holds the flat session rates', () => {
    expect(SESSION_RATE_60_MIN).toBe(175);
    expect(SESSION_RATE_30_MIN).toBe(110);
  });

  it('never advertises a 60-minute rate below the flat rate', () => {
    for (const pkg of PACKAGES) {
      if (pkg.duration === 30) continue;
      if (pkg.perSession !== undefined) {
        expect(pkg.perSession).toBe(SESSION_RATE_60_MIN);
      }
    }
  });

  it('prices every multi-session program at exactly sessions x the flat rate', () => {
    const programs = PACKAGES.filter((pkg) => typeof pkg.sessions === 'number');
    expect(programs.length).toBeGreaterThan(0);

    for (const pkg of programs) {
      expect(pkg.price).toBe((pkg.sessions as number) * SESSION_RATE_60_MIN);
    }
  });

  it('offers the single-session options at the policy rates', () => {
    const single = PACKAGES.filter((pkg) => typeof pkg.duration === 'number');
    const rates = single.map((pkg) => pkg.price).sort((a, b) => a - b);
    expect(rates).toEqual([SESSION_RATE_30_MIN, SESSION_RATE_60_MIN]);
  });

  it('carries no discount or savings framing', () => {
    for (const pkg of PACKAGES) {
      expect(pkg).not.toHaveProperty('savings');
      const blob = [pkg.name, pkg.description, ...pkg.features].join(' ').toLowerCase();
      expect(blob).not.toMatch(/\bsave\b|\bdiscount\b|\bsavings\b/);
    }
  });

  it('advertises the three programs the business actually sells', () => {
    const byId = Object.fromEntries(PACKAGES.map((pkg) => [pkg.id, pkg]));
    expect(byId['program-3-month'].price).toBe(8400);
    expect(byId['program-6-month'].price).toBe(16800);
    expect(byId['program-12-month'].price).toBe(33600);
  });
});
