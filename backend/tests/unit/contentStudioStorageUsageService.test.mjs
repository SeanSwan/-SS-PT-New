import { describe, expect, it } from 'vitest';

import {
  CONTENT_STUDIO_R2_USD_PER_GB_MONTH,
  estimateContentStudioMonthlyUsd,
  loadContentStudioStorageUsage,
  summarizeContentStudioStorageRows,
} from '../../services/contentStudioStorageUsageService.mjs';

const gib = 1024 ** 3;

describe('contentStudioStorageUsageService', () => {
  it('summarizes completed hosted video rows from trusted catalog sizes', () => {
    const usage = summarizeContentStudioStorageRows([
      { hostedKey: 'videos/1/a.mp4', fileSizeBytes: String(gib) },
      { hostedKey: 'videos/1/b.mp4', fileSizeBytes: null, declaredFileSize: gib / 2 },
      { hostedKey: null, fileSizeBytes: gib },
      { hostedKey: 'videos/1/c.mp4', fileSizeBytes: 0 },
    ]);

    expect(usage).toEqual({
      totalBytes: gib * 1.5,
      objectCount: 2,
      estMonthlyUsd: 0.0225,
    });
  });

  it('keeps the R2 monthly estimate tied to the expected GB-month rate', () => {
    expect(CONTENT_STUDIO_R2_USD_PER_GB_MONTH).toBe(0.015);
    expect(estimateContentStudioMonthlyUsd(gib * 2)).toBe(0.03);
  });

  it('loads only upload catalog trust fields from VideoCatalog', async () => {
    const calls = [];
    const VideoCatalog = {
      findAll: async (options) => {
        calls.push(options);
        return [
          { hostedKey: 'videos/1/a.mp4', fileSizeBytes: gib },
        ];
      },
    };

    await expect(loadContentStudioStorageUsage({ VideoCatalog })).resolves.toMatchObject({
      totalBytes: gib,
      objectCount: 1,
    });
    expect(calls).toEqual([{
      where: { source: 'upload' },
      attributes: ['hostedKey', 'fileSizeBytes', 'declaredFileSize'],
      raw: true,
    }]);
  });
});