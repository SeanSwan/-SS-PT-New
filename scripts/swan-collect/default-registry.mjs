/**
 * default-registry.mjs — the batteries-included registry.
 * ============================================================================
 * Lives at the package ROOT, deliberately NOT in core/ (Kimi K3 packet-7 L5).
 * core/ is the universal, self-contained half of this folder; this file reaches
 * into adapters/, so keeping it in core/ would have quietly broken the claim
 * that core/ can be copied on its own.
 *
 * @module swan-collect/default-registry
 */

import { createRegistry } from './core/registry.mjs';

/**
 * Build a registry preloaded with every adapter that ships in this folder.
 * Import-on-demand keeps the core usable without pulling adapters a consumer
 * does not want — and keeps `core/` free of any dependency on `adapters/`.
 */
export async function createDefaultRegistry() {
  const registry = createRegistry();
  const [bluesky, youtube, rss, mastodon, vendor] = await Promise.all([
    import('./adapters/bluesky.mjs'),
    import('./adapters/youtube.mjs'),
    import('./adapters/rss.mjs'),
    import('./adapters/mastodon.mjs'),
    import('./adapters/vendor.mjs'),
  ]);
  registry.register(bluesky.adapter);
  registry.register(youtube.adapter);
  registry.register(rss.adapter);
  registry.register(mastodon.adapter);
  registry.registerAll(vendor.adapters);
  return registry;
}
