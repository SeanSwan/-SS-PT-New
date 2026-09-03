/**
 * The destructive scope law must accept every registered destructive command's
 * own shape — and refuse an empty one. Fable 5.1 hostile pass (2026-09-02): the
 * 5.0 law hardcoded five key names and would have refused delete_workout_plan
 * (planId), delete_post (postId) and revoke_trainer_permission (permissionId)
 * at mint — two of those were ALREADY latent under the old DELETE-only law.
 * A law that is not derived from the registry drifts the day a command is added.
 */
import { describe, it, expect } from 'vitest';
import { initializeRegistry, getAllCommands } from '../../services/ai/commandRegistry/index.mjs';
import { hasExplicitScope } from '../../services/ai/destructiveOperations.mjs';

/** Unwrap ZodEffects/optional wrappers to reach the object shape. */
function shapeKeys(schema) {
  let s = schema;
  for (let i = 0; i < 6 && s; i += 1) {
    if (typeof s._def?.shape === 'function') return Object.keys(s._def.shape());
    if (s.shape) return Object.keys(s.shape);
    s = s._def?.schema ?? s._def?.innerType ?? null;
  }
  return [];
}

describe('destructive scope law is locked to the registry', () => {
  initializeRegistry();
  const destructive = getAllCommands().filter((c) => c.destructive);

  it('the registry has destructive commands to lock (sanity)', () => {
    expect(destructive.length).toBeGreaterThan(0);
  });

  for (const cmd of destructive) {
    it(`${cmd.type}: a params object built from its own schema keys passes the scope law`, () => {
      const keys = shapeKeys(cmd.inputSchema);
      // requiresClientRef commands get clientId injected by the executor before mint.
      const sample = Object.fromEntries(keys.map((k) => [k, 1]));
      if (cmd.requiresClientRef) sample.clientId = 1;
      expect(hasExplicitScope(sample), `${cmd.type} keys=${JSON.stringify(keys)}`).toBe(true);
    });
  }

  it('an empty or non-entity params object is refused', () => {
    expect(hasExplicitScope({})).toBe(false);
    expect(hasExplicitScope({ reason: 'cleanup', notifyUser: true })).toBe(false);
    expect(hasExplicitScope({ planId: '' })).toBe(false);
    /**
     * R2-5 (GLM 5.3 round 2) — this line USED to assert `true`, and it was
     * asserting the defect. The scope law's own wording is "names ONE entity ...
     * or a BOUNDED dateRange", and nothing enforced bounded: presence was the
     * whole check, so a range whose endpoints do not even parse counted as
     * scope, and so did a range covering two centuries.
     *
     * A range is a scope only if both ends parse, run forwards, and span a
     * bounded window.
     */
    expect(hasExplicitScope({ dateRange: { from: 'a', to: 'b' } })).toBe(false);
    expect(hasExplicitScope({ dateRange: {} })).toBe(false);
    expect(hasExplicitScope({ dateRange: { from: '1900-01-01', to: '2100-01-01' } })).toBe(false);
    expect(hasExplicitScope({ dateRange: { from: '2026-02-01', to: '2026-01-01' } })).toBe(false);
    expect(hasExplicitScope({ dateRange: { from: '2026-01-01', to: '2026-01-31' } })).toBe(true);

    // One entity means ONE value. A list of ids wearing a single-entity key is
    // the mass-mutation shape the law exists to refuse.
    expect(hasExplicitScope({ clientId: [1, 2, 3] })).toBe(false);
    expect(hasExplicitScope({ planId: { in: [1, 2] } })).toBe(false);
    expect(hasExplicitScope({ planId: 184 })).toBe(true);
    expect(hasExplicitScope({ planId: 'abc-123' })).toBe(true);
  });
});
