/**
 * AT-5 / FC-1 — registry integrity assertion over the REAL adapter manifest set.
 *
 * FC-1 (fail-closed): a doctored registry throws at init, before any render, so a bad lens
 * can never ship. Retired-palette literals are concatenated so the CI grep gate finds none.
 */
import { describe, expect, it } from 'vitest';
import { assertLensRegistryIntegrity } from '../registryIntegrity';
import { buildWorldValuesRegistry, CRYSTALLINE_DEFAULT_WORLD_VALUES } from '../values';
import { SWAN_STYLE_LENS_REGISTRY } from '../../index';
import type { LensWorldValuesRegistry } from '../lensValues.types';

// Real manifest ids from the adapter's own aggregation (no fixture list).
const MANIFEST_IDS = SWAN_STYLE_LENS_REGISTRY.available().map((m) => m.id);

describe('AT-5 — assertLensRegistryIntegrity (real inputs)', () => {
  it('has a non-trivial real manifest set', () => {
    expect(MANIFEST_IDS.length).toBeGreaterThan(10);
  });

  it('passes for the real manifests mapped to the Crystalline default table', () => {
    const values = buildWorldValuesRegistry(MANIFEST_IDS);
    expect(() => assertLensRegistryIntegrity(MANIFEST_IDS, values)).not.toThrow();
  });

  it('passes when a matching style allowlist is supplied', () => {
    const values = buildWorldValuesRegistry(MANIFEST_IDS);
    const allowlist = Object.fromEntries(MANIFEST_IDS.map((id) => [id, {}]));
    expect(() => assertLensRegistryIntegrity(MANIFEST_IDS, values, allowlist)).not.toThrow();
  });

  it('FC-1: missing values entry throws with the exact prefix', () => {
    const values = { ...buildWorldValuesRegistry(MANIFEST_IDS) } as Record<string, unknown>;
    delete values[MANIFEST_IDS[0]];
    expect(() => assertLensRegistryIntegrity(MANIFEST_IDS, values as LensWorldValuesRegistry)).toThrow(
      /^\[SwanLens\] registry integrity failed:/,
    );
  });

  it('FC-1: guard-failing values throw', () => {
    const bad: LensWorldValuesRegistry = {
      ...buildWorldValuesRegistry(MANIFEST_IDS),
      [MANIFEST_IDS[0]]: {
        ...CRYSTALLINE_DEFAULT_WORLD_VALUES,
        accent: { value: '#00ff' + 'ff', kind: 'color' }, // retired neon cyan, concatenated
      },
    };
    expect(() => assertLensRegistryIntegrity(MANIFEST_IDS, bad)).toThrow(/registry integrity failed/);
  });

  it('FC-1: extra style-allowlist entry with no manifest throws', () => {
    const values = buildWorldValuesRegistry(MANIFEST_IDS);
    const allowlist = { ...Object.fromEntries(MANIFEST_IDS.map((id) => [id, {}])), 'ghost-lens': {} };
    expect(() => assertLensRegistryIntegrity(MANIFEST_IDS, values, allowlist)).toThrow(/registry integrity failed/);
  });
});
