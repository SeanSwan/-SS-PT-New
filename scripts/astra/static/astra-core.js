/*
 * astra-core.js — the client's PLUMBING: status reporting, the mutation token, the
 * API call, and the field readers. No action lives here.
 *
 * WHY THE CLIENT IS THREE FILES. `Rule 4` gives every module a 300-line budget, and
 * this client crossed it when the override editor landed (A4b): the action chain
 * plus the plumbing reached 320 lines. The split is PLUMBING vs ACTIONS vs ENTRY,
 * the same seam `smokeHarness.mjs` takes from `smoke.mjs` (plumbing vs checks).
 *
 * REAL MODULES, NOT A GLOBAL NAMESPACE. The page loads the entry as
 * `<script type="module">`, so these files use `import`/`export` rather than
 * attaching to `window`. A shared global would make load ORDER load-bearing and let
 * a missing file produce a page that loads, renders, and silently does nothing —
 * the dead-control failure this console has already been bitten by twice.
 *
 * THE CLIENT STILL DOES NOT RE-RENDER ANYTHING. It calls the API and then RELOADS,
 * so the direction cards, the slot table and the LAW rows are produced by exactly
 * one renderer (`panes.mjs`, server-side). The alternative — building the same
 * markup again in JS from the JSON — creates two renderers that must agree forever,
 * and the packet's whole premise is that a second copy of a fact is the failure mode.
 *
 * IT NEVER INTERCEPTS TAB. There is no `keydown` handler at all, so there is no path
 * by which this client can trap focus. Everything focusable is a native `<a>`,
 * `<button>`, `<select>`, `<input>` or `<textarea>`, which is what makes `T-A-03`'s
 * traversal meaningful rather than dependent on a script that happens to be correct.
 */

/** The status strip. `kind` is a state class: success / partial / failure / denied. */
const status = document.getElementById('api-status');

// Motion is read from the same query the stylesheet uses, so the two cannot disagree
// about whether motion is allowed. Declared once, here, because more than one handler
// needs it and a second declaration would be a second opinion.
export const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

export function show(kind, text) {
  if (!status) return;
  status.className = 'state state-' + kind;
  status.textContent = text;
  status.hidden = false;
}

export function clear() {
  if (!status) return;
  status.hidden = true;
  status.textContent = '';
}

/** The mutation token, from the SameSite=Strict cookie the pane routes set. */
function token() {
  var m = /(?:^|;\s*)astra_token=([^;]+)/.exec(document.cookie || '');
  return m ? decodeURIComponent(m[1]) : '';
}

export function api(route, body) {
  var headers = { 'content-type': 'application/json' };
  var t = token();
  if (t) headers['x-astra-token'] = t;
  return fetch('/api/' + route, {
    method: 'POST', headers: headers, credentials: 'same-origin',
    body: JSON.stringify(body || {}),
  }).then(function (r) {
    return r.json().then(function (j) { return { status: r.status, body: j }; });
  });
}

export function briefFrom() {
  var val = function (id, fallback) {
    var el = document.getElementById(id);
    return el && el.value !== '' ? el.value : fallback;
  };
  return {
    text: val('brief-text', ''),
    intent: val('brief-intent', undefined),
    aspect: val('brief-aspect', undefined),
    surfaceClass: val('brief-surfaceClass', undefined),
    seed: val('brief-seed', undefined),
  };
}

/**
 * Report a failure with its CODE, never a generic message.
 * The packet's copy rule: `E_LAW_VIOLATION` at slot 7 is actionable; "Something
 * went wrong" is not.
 */
export function reportFailure(res) {
  var err = (res.body && res.body.error) || {};
  var code = err.code || ('HTTP ' + res.status);
  if (res.status === 401) {
    show('denied', 'DENIED — ' + (err.message || 'this is a write; the console needs the mutation token.'));
    return;
  }
  show('failure', code + (err.message ? ' — ' + err.message : ''));
}

/**
 * POST a mutation, guard the status, report, and reload — ONCE.
 *
 * Every reloading handler needs the same four things: clear the strip, refuse to
 * proceed on a non-200 with the server's own CODE, report a network failure
 * distinctly from a domain refusal, and reload so the pane is re-rendered
 * server-side. Written out per handler that is seven near-identical lines, six
 * times — and six chances to omit the `status !== 200` guard, which is the one that
 * turns a refusal into a silent success.
 *
 * `onOk` runs on success, BEFORE the reload. It is where a handler repeats back what
 * changed, so a successful write cannot be reported without also saying what it moved.
 */
export function post(route, body, onOk) {
  clear();
  return api(route, body).then(function (res) {
    if (res.status !== 200) { reportFailure(res); return; }
    if (onOk) onOk(res.body);
    window.location.reload();
  }).catch(function (e) { show('failure', 'E_NETWORK — ' + e.message); });
}

/** The Tune pane's note field, or '' when the pane is not on screen. */
export function noteFrom() {
  var el = document.getElementById('tuning-note');
  return el ? el.value : '';
}

/**
 * The COMPLETE override set the editor currently describes.
 *
 * Diffed against each input's `data-baseline` — the value resolved WITHOUT any
 * override — and not against the value on screen. That is what lets an edit BACK to
 * the resolved value REMOVE an override: compared with what is displayed, that edit
 * looks like no change, and the override would survive a press of STAGE OVERRIDES
 * while the field appeared to ignore it.
 *
 * The server REPLACES its stage with this set, so sending the complete set is what
 * makes a single override removable without a RESET of the other ten.
 */
export function slotOverridesFrom() {
  var out = {};
  var inputs = document.querySelectorAll('[data-control="slots.override"][data-key]');
  for (var i = 0; i < inputs.length; i++) {
    var el = inputs[i];
    var key = el.getAttribute('data-key');
    if (el.value !== el.getAttribute('data-baseline')) out[key] = el.value;
  }
  return out;
}

/** The staged Tune patch the knob inputs currently describe. */
export function knobPatchFrom() {
  var staged = {};
  var inputs = document.querySelectorAll('[data-control="tuning.knob"][data-key]');
  for (var i = 0; i < inputs.length; i++) {
    var el = inputs[i];
    var n = Number(el.value);
    if (el.value === '' || !isFinite(n)) continue;
    if (n !== Number(el.getAttribute('data-current'))) staged[el.getAttribute('data-key')] = n;
  }
  return staged;
}
