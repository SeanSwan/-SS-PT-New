/**
 * Aegis HUD persisted-state normalization and persistence helpers.
 */

import { NEED_CONFIG } from './aegisHudConfig.mjs';

const isNeedRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const normalizeLastUpdated = (value, fallbackIso) => {
  const parsed = typeof value === 'string' ? Date.parse(value) : NaN;
  const fallbackTime = Date.parse(fallbackIso);
  return Number.isFinite(parsed) && (!Number.isFinite(fallbackTime) || parsed <= fallbackTime)
    ? new Date(parsed).toISOString()
    : fallbackIso;
};

export const toFiniteNumber = (value, fallback = 50) => (
  typeof value === 'number' && Number.isFinite(value) ? value : fallback
);

export const roundNeedValue = (value) => Math.round(value * 10) / 10;

export const clampNeedValue = (value, config, fallback = 50) => {
  const numericValue = toFiniteNumber(value, fallback);
  return Math.min(config.maxValue, Math.max(config.minValue, numericValue));
};

export const normalizeNeedsState = (value, now = new Date()) => {
  const source = isNeedRecord(value) ? value : {};
  const fallbackIso = now.toISOString();

  return Object.entries(NEED_CONFIG).reduce((state, [key, config]) => {
    const need = isNeedRecord(source[key]) ? source[key] : {};
    state[key] = {
      value: roundNeedValue(clampNeedValue(need.value, config)),
      lastUpdated: normalizeLastUpdated(need.lastUpdated, fallbackIso),
    };
    return state;
  }, {});
};

export const getElapsedHours = (now, need) => {
  const lastUpdatedTime = Date.parse(need.lastUpdated);
  return Math.max(0, (now.getTime() - lastUpdatedTime) / (1000 * 60 * 60));
};

export const persistAegisUpdate = async (record, payload, updateOptions = {}, context = 'state') => {
  try {
    await record.update(payload, updateOptions);
  } catch (err) {
    if (updateOptions?.transaction) throw err;
    console.error(`[AegisHUD] Failed to persist ${context}:`, err.message);
  }
};
