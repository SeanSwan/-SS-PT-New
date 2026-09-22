/**
 * adapters.mjs — the transport registry. A new local backend or a hosted vendor is a
 * row here; nothing else in the agent changes.
 *
 * ── WHY THIS IS ITS OWN FILE ────────────────────────────────────────────────
 * `generateVideo.mjs` sat at exactly 300 lines — rule 4's cap — before the hosted
 * lane existed. Registering Higgsfield in place would have put it at 302, and the fix
 * for that is not to delete a comment from the licence gate. The registry is also the
 * one part of the handler that a new vendor touches, so separating it means adding a
 * provider does not mean editing the file that holds the spend gate.
 *
 * ── TWO LANES, TWO MEANINGS OF THE SAME FIELD ───────────────────────────────
 * `comfyuiLocal` and `higgsfield` expose the same three functions —
 * `capabilities()` / `generate()` / `verify()` — and the handler above them does not
 * branch on which one it has. That is deliberate and it is also exactly as far as the
 * similarity goes: the local lane's `duration` is unbound because ComfyUI's input is a
 * frame count, the hosted lane's is real seconds because that is what the vendor bills.
 * Registering them side by side does not make them interchangeable. See
 * `higgsfield.mjs` for the full statement of that, and `routes.mjs` for why the
 * PUBLIC api refuses to expose the vendor's shape to either lane.
 *
 * ── HOSTED ROWS ARE DERIVED, NOT LISTED ─────────────────────────────────────
 * The hosted ids come from the catalogue rather than being typed out again. A second
 * hand-maintained list is how a row gets added to the catalogue and silently has no
 * adapter — which fails at run time as `E_UNKNOWN_PROVIDER` on a provider the API
 * advertises in `/v1/models`. Deriving makes that class of drift impossible.
 */

import * as comfyuiLocal from '../../../shared/providers/video/comfyuiLocal.mjs';
import * as higgsfield from '../../../shared/providers/video/higgsfield.mjs';
import { ComfyError } from '../../../shared/providers/video/comfyuiLocal.mjs';
import { HOSTED_VIDEO_PROVIDERS } from '../../../shared/providers/video/catalogueHosted.mjs';

const ADAPTERS = Object.freeze({
  'comfyui/minimax-h3': comfyuiLocal,
  // One adapter, two models. The graph is an operator-supplied input, so nothing about
  // the transport differs — only the provider id and which workflow file it resolves.
  'comfyui/wan-2.2': comfyuiLocal,
  // The hosted lane. One adapter, every hosted model: the endpoint path is resolved
  // per provider from `SWAN_HIGGSFIELD_PATH_<SLUG>`, because the vendor's per-model
  // paths were not fully retrieved and are never guessed.
  ...Object.fromEntries(Object.keys(HOSTED_VIDEO_PROVIDERS).map(id => [id, higgsfield])),
});

export { ADAPTERS, ComfyError };
