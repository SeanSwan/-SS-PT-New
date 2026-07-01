/**
 * Content Studio storage usage service.
 *
 * Uses the VideoCatalog trust fields that are set after R2 upload completion.
 * This keeps the admin meter fast and avoids listing the private bucket on each
 * dashboard load.
 */

export const CONTENT_STUDIO_R2_USD_PER_GB_MONTH = 0.015;
export const EMPTY_CONTENT_STUDIO_STORAGE_USAGE = Object.freeze({
  totalBytes: 0,
  objectCount: 0,
  estMonthlyUsd: 0,
});

const BYTES_PER_GB = 1024 ** 3;

const toFiniteBytes = (value) => {
  if (typeof value === 'bigint') return Number(value);
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

export const estimateContentStudioMonthlyUsd = (totalBytes) => (
  Number(((toFiniteBytes(totalBytes) / BYTES_PER_GB) * CONTENT_STUDIO_R2_USD_PER_GB_MONTH).toFixed(6))
);

const rowToPlain = (row) => {
  if (!row) return {};
  if (typeof row.get === 'function') return row.get({ plain: true }) || {};
  return row;
};

export function summarizeContentStudioStorageRows(rows = []) {
  let totalBytes = 0;
  let objectCount = 0;

  for (const row of rows) {
    const data = rowToPlain(row);
    if (!data.hostedKey) continue;

    const bytes = toFiniteBytes(data.fileSizeBytes ?? data.declaredFileSize);
    if (bytes <= 0) continue;

    objectCount += 1;
    totalBytes += bytes;
  }

  return {
    totalBytes: Math.round(totalBytes),
    objectCount,
    estMonthlyUsd: estimateContentStudioMonthlyUsd(totalBytes),
  };
}

export async function loadContentStudioStorageUsage({ VideoCatalog } = {}) {
  let VideoCatalogModel = VideoCatalog;

  if (!VideoCatalogModel) {
    const { getAllModels } = await import('../models/index.mjs');
    VideoCatalogModel = getAllModels().VideoCatalog;
  }

  if (!VideoCatalogModel || typeof VideoCatalogModel.findAll !== 'function') {
    return { ...EMPTY_CONTENT_STUDIO_STORAGE_USAGE };
  }

  const rows = await VideoCatalogModel.findAll({
    where: { source: 'upload' },
    attributes: ['hostedKey', 'fileSizeBytes', 'declaredFileSize'],
    raw: true,
  });

  return summarizeContentStudioStorageRows(rows);
}