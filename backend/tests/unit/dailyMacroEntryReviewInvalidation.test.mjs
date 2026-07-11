import { describe, expect, it } from 'vitest';
import { buildMacroEntryUpdates } from '../../routes/dailyMacroRoutes.utils.mjs';

describe('DailyMacroLog review invalidation', () => {
  it('requeues a client edit and clears the original reviewer receipt', () => {
    const updates = buildMacroEntryUpdates({
      calories: 400,
      verified: true,
      reviewStatus: 'verified',
      reviewedByUserId: 91,
      reviewedAt: new Date('2026-07-09T12:00:00.000Z'),
    }, { calories: 425 });

    expect(updates).toEqual({
      calories: 425,
      verified: false,
      reviewStatus: 'needs_review',
      reviewReason: 'edited_after_review',
      reviewedByUserId: null,
      reviewedAt: null,
    });
  });

  it('does not queue an ordinary unreviewed manual edit', () => {
    const updates = buildMacroEntryUpdates({
      description: 'Rice bowl',
      verified: false,
      reviewStatus: 'client_confirmed',
    }, { description: 'Chicken rice bowl' });

    expect(updates).toEqual({
      description: 'Chicken rice bowl',
      verified: false,
    });
  });
});
