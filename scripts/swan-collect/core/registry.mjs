/**
 * registry.mjs — the adapter registry. One place that knows what sources exist.
 * ============================================================================
 * Adapters are DATA here, not imports scattered through calling code. A consumer
 * asks the registry what exists, what needs a credential, and what each source's
 * terms posture is — without importing any adapter's internals.
 *
 * That indirection is what makes the folder portable in practice rather than in
 * principle: a different app can register its own adapters, or drop ones it does
 * not want, without editing a single call site.
 *
 * FAIL-CLOSED ORDERING. `listEnabled` returns only adapters that are both
 * registered AND satisfied (credential present when required). A source that
 * needs a key it does not have is reported as UNAVAILABLE with a reason, never
 * silently skipped — a silent skip is how a sync quietly stops covering a
 * platform and nobody notices for a month.
 *
 * @module swan-collect/core/registry
 */

import { CollectError } from './item.mjs';

/** Source tiers ranked by how much a reader should trust the acquisition path. */
const TIER_RANK = Object.freeze({ 'official-api': 0, 'public-no-auth': 1, 'public-web': 2, 'vendor-licensed': 3 });

export function createRegistry() {
  const adapters = new Map();

  const api = {
    /** Register one adapter descriptor. Rejects duplicates and malformed shapes. */
    register(adapter) {
      if (!adapter || typeof adapter !== 'object') throw new CollectError('registry: adapter must be an object');
      const { key, collect } = adapter;
      if (typeof key !== 'string' || !/^[a-z][a-z0-9_-]{0,63}$/.test(key)) {
        throw new CollectError(`registry: '${key}' is not a valid adapter key`);
      }
      if (typeof collect !== 'function') throw new CollectError(`registry: adapter '${key}' has no collect()`);
      if (adapters.has(key)) throw new CollectError(`registry: adapter '${key}' is already registered`);
      adapters.set(key, adapter);
      return api;
    },

    registerAll(list) {
      for (const a of list) api.register(a);
      return api;
    },

    get(key) {
      const a = adapters.get(key);
      if (!a) throw new CollectError(`registry: no adapter '${key}'. Registered: ${[...adapters.keys()].join(', ') || '(none)'}`);
      return a;
    },

    has: (key) => adapters.has(key),

    /** Every registered adapter, cleanest-tier first. */
    list() {
      return [...adapters.values()].sort((a, b) => (TIER_RANK[a.tier] ?? 9) - (TIER_RANK[b.tier] ?? 9));
    },

    /**
     * Split the registry into what can run now and what cannot, with reasons.
     * `credentials` is a plain map of adapterKey -> secret. Secrets are only ever
     * tested for PRESENCE here; their values are never copied into the result.
     */
    status(credentials = {}) {
      const available = [];
      const unavailable = [];
      for (const a of api.list()) {
        if (a.enabled === false) {
          unavailable.push({ key: a.key, label: a.label, reason: 'disabled by default — configure a provider to enable' });
          continue;
        }
        if (a.requiresCredential) {
          const secret = credentials[a.key];
          if (typeof secret !== 'string' || !secret.trim()) {
            unavailable.push({ key: a.key, label: a.label, reason: `missing credential — ${a.credentialHint || 'see adapter docs'}` });
            continue;
          }
        }
        available.push({ key: a.key, label: a.label, tier: a.tier, termsPosture: a.termsPosture });
      }
      return { available, unavailable };
    },

    listEnabled(credentials = {}) {
      return api.status(credentials).available.map((s) => adapters.get(s.key));
    },
  };

  return api;
}
