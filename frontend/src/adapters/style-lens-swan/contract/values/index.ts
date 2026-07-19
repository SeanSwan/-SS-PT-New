/**
 * Swan Lens — world-values registry builder (S1-A / blueprint §2 F3).
 *
 * Maps EVERY manifest id to the Crystalline default world-role table. Per-lens world-role
 * differentiation is Slice-3 design work — Slice-1 gives every lens the same, contrast-clean
 * default so no surface renders inherited garbage while the design lane authors per-world values.
 *
 * `manifestIds` is INJECTED (from the adapter's existing manifest aggregation) — this builder
 * makes no import assumptions about the barrel's export names (blueprint §10.3).
 */
import type { LensWorldValuesRegistry } from '../lensValues.types';
import { CRYSTALLINE_DEFAULT_WORLD_VALUES } from './crystallineDefault';

export { CRYSTALLINE_DEFAULT_WORLD_VALUES } from './crystallineDefault';

/**
 * Build a values registry mapping each manifest id → the Crystalline default table.
 * Duplicate ids collapse to one entry (last wins, but they are identical). Empty input → {}.
 */
export function buildWorldValuesRegistry(manifestIds: readonly string[]): LensWorldValuesRegistry {
  const registry: Record<string, typeof CRYSTALLINE_DEFAULT_WORLD_VALUES> = {};
  for (const id of manifestIds) {
    if (typeof id === 'string' && id.length > 0) {
      registry[id] = CRYSTALLINE_DEFAULT_WORLD_VALUES;
    }
  }
  return Object.freeze(registry);
}
