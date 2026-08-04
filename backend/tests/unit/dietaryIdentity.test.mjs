/**
 * Regression: user-scoped dietary identity (SWA-71 P0 — allergies fail-open).
 * Locks in: tri-state semantics (no row = never asked ≠ "no allergies"; a DB
 * failure stays unknown), taxonomy normalization ("peanuts"/"tree nuts" match
 * ingredient-checkable slugs), declared-empty is a valid explicit "none", and
 * uncoded entries are preserved (never silently dropped).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ findOne: vi.fn(), upsert: vi.fn() }));

vi.mock('../../models/UserDietaryIdentity.mjs', () => ({
  default: { findOne: mocks.findOne, upsert: mocks.upsert },
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

const { normalizeAllergen, normalizeAllergenList } = await import('../../services/nutrition/allergenTaxonomy.mjs');
const { getDietaryIdentity, declareDietaryIdentity } = await import('../../services/nutrition/dietaryIdentityService.mjs');

describe('allergen taxonomy normalization', () => {
  it('maps free-text variants onto canonical, matchable slugs', () => {
    expect(normalizeAllergen('Peanuts').allergen).toBe('peanut');
    expect(normalizeAllergen('tree nuts').allergen).toBe('tree_nut');
    expect(normalizeAllergen('allergic to shrimp').allergen).toBe('shellfish');
    expect(normalizeAllergen('LACTOSE intolerant').allergen).toBe('milk');
    expect(normalizeAllergen('celiac').allergen).toBe('wheat_gluten');
  });

  it('preserves uncoded entries as other + rawText instead of dropping them', () => {
    const odd = normalizeAllergen('dragonfruit sensitivity');
    expect(odd.allergen).toBe('other');
    expect(odd.rawText).toBe('dragonfruit sensitivity');
  });

  it('dedupes by slug and drops empties', () => {
    const list = normalizeAllergenList(['peanut', 'Peanuts', '', '  ', 'walnuts', 'cashews']);
    expect(list.map((a) => a.allergen)).toEqual(['peanut', 'tree_nut']);
  });
});

describe('dietary identity tri-state (fail-closed)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.upsert.mockResolvedValue([{ id: 1 }]);
  });

  it('no row = never_asked — NOT "no allergies"', async () => {
    mocks.findOne.mockResolvedValue(null);
    const identity = await getDietaryIdentity(42);
    expect(identity.status).toBe('never_asked');
  });

  it('a DB failure stays unknown (never reads as safe)', async () => {
    mocks.findOne.mockRejectedValue(new Error('db down'));
    const identity = await getDietaryIdentity(42);
    expect(identity.status).toBe('never_asked');
  });

  it('declared-empty is a valid explicit "none" with provenance', async () => {
    const result = await declareDietaryIdentity({ userId: 42, allergies: [], capturedBy: 42 });
    expect(result.ok).toBe(true);
    expect(mocks.upsert.mock.calls[0][0]).toMatchObject({
      allergiesDeclared: true,
      allergies: [],
      confirmedAt: expect.any(Date),
    });
  });

  it('normalizes declared free text through the taxonomy before persisting', async () => {
    await declareDietaryIdentity({ userId: 42, allergies: ['peanuts', 'raw shellfish'], capturedBy: 7, captureSource: 'trainer' });
    const saved = mocks.upsert.mock.calls[0][0];
    expect(saved.allergies.map((a) => a.allergen)).toEqual(['peanut', 'shellfish']);
    expect(saved.captureSource).toBe('trainer');
  });

  it('row with allergiesDeclared=false reads as incomplete, not declared', async () => {
    mocks.findOne.mockResolvedValue({ allergiesDeclared: false, allergies: [], dietaryRestrictions: ['Vegan'], confirmedAt: null });
    const identity = await getDietaryIdentity(42);
    expect(identity.status).toBe('incomplete');
    expect(identity.dietaryRestrictions).toEqual(['Vegan']);
  });
});
