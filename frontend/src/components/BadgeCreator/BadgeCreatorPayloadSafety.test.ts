import { describe, expect, it } from 'vitest';
import { normalizeBatchImageRows } from './BadgeCreatorPayloadSafety';

describe('BadgeCreatorPayloadSafety', () => {
  it('caps provider batch payloads before normalizing rows', () => {
    const rows = [
      null,
      null,
      null,
      null,
      null,
      {
        index: 5,
        variation: 'Overflow Variation',
        success: true,
        imageUrl: '/uploads/badge-creator/overflow.png',
      },
    ];

    expect(normalizeBatchImageRows(rows)).toEqual([]);
  });
});
