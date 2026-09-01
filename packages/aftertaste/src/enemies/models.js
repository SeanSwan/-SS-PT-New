/**
 * models.js — the roster's FILES, kept apart from the roster's FACTS on purpose.
 *
 * TEACHING NOTE — WHY THIS FILE EXISTS AT ALL:
 * `?url` imports are a Vite feature; node has no idea what `lod0.glb?url` means and crashes on
 * import. roster.js (the numbers) must stay importable by node unit tests, so the Vite-only URL
 * imports are quarantined here, and only browser-side components import this file. If a unit test
 * ever imports models.js, the crash is IMMEDIATE and points here — which is the good failure mode.
 *
 * Every URL points at the SINGLE validated asset directory the manifests describe — never copies.
 */
import frylingUrl from '../../../../assets/runtime/enemy/fryling/lod0.glb?url';
import dripCystUrl from '../../../../assets/runtime/enemy/drip-cyst/lod0.glb?url';
import greaseFlyUrl from '../../../../assets/runtime/enemy/grease-fly/lod0.glb?url';
import pattyLarvaUrl from '../../../../assets/runtime/enemy/patty-larva/lod0.glb?url';

export const MODEL_URLS = {
  fryling: frylingUrl,
  'drip-cyst': dripCystUrl,
  'grease-fly': greaseFlyUrl,
  'patty-larva': pattyLarvaUrl,
};
