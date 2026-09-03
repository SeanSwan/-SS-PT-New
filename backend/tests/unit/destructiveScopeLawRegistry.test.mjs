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
    expect(hasExplicitScope({ dateRange: { from: 'a', to: 'b' } })).toBe(true);
  });
});
