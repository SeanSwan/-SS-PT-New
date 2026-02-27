/**
 * Stable JSON Stringify — Phase 5C-D
 * ====================================
 * Recursively sorts object keys before stringifying to ensure
 * semantically identical objects always produce the same string
 * (and thus the same hash) regardless of key insertion order.
 *
 * Used by 5C-C (persist validatedPlanHash) and 5C-D (compare at approval).
 *
 * Phase 5C — Long-Horizon Planning Engine
 */

/**
 * Recursively sort object keys and produce a deterministic JSON string.
 *
 * @param {unknown} value - Any JSON-serializable value
 * @returns {string} Deterministic JSON string
 */
export function stableStringify(value) {
  if (value === null || value === undefined) {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    const items = value.map(item => stableStringify(item));
    return `[${items.join(',')}]`;
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value).sort();
    const pairs = keys.map(key => {
      const val = stableStringify(value[key]);
      return `${JSON.stringify(key)}:${val}`;
    });
    return `{${pairs.join(',')}}`;
  }

  return JSON.stringify(value);
}
