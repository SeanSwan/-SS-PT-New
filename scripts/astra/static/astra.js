/*
 * astra.js — the surface's client. Deliberately small.
 *
 * THE CLIENT DOES NOT RE-RENDER ANYTHING. It calls the API and then RELOADS, so the
 * direction cards, the slot table and the LAW rows are produced by exactly one
 * renderer (`panes.mjs`, server-side). The alternative — building the same markup
 * again in JS from the JSON — creates two renderers that must agree forever, and the
 * packet's whole premise is that a second copy of a fact is the failure mode.
 *
 * IT NEVER INTERCEPTS TAB. There is no `keydown` handler at all, so there is no path
 * by which this file can trap focus. Everything focusable is a native `<a>`,
 * `<button>`, `<select>`, `<input>` or `<textarea>`, which is what makes `T-A-03`'s
 * traversal meaningful rather than dependent on a script that happens to be correct.
 *
 * MOTION IS READ, NOT ASSUMED. The stylesheet's `prefers-reduced-motion` gate does
 * the work; this file only checks the same query before asking for a smooth scroll,
 * so the two cannot disagree about whether motion is allowed.
 */

(function () {
  'use strict';

  var status = document.getElementById('api-status');

  function show(kind, text) {
    if (!status) return;
    status.className = 'state state-' + kind;
    status.textContent = text;
    status.hidden = false;
  }

  function clear() {
    if (!status) return;
    status.hidden = true;
    status.textContent = '';
  }

  /** The mutation token, from the SameSite=Strict cookie the pane routes set. */
  function token() {
    var m = /(?:^|;\s*)astra_token=([^;]+)/.exec(document.cookie || '');
    return m ? decodeURIComponent(m[1]) : '';
  }

  function api(route, body) {
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

  function briefFrom() {
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
  function reportFailure(res) {
    var err = (res.body && res.body.error) || {};
    var code = err.code || ('HTTP ' + res.status);
    if (res.status === 401) {
      show('denied', 'DENIED — ' + (err.message || 'this is a write; the console needs the mutation token.'));
      return;
    }
    show('failure', code + (err.message ? ' — ' + err.message : ''));
  }

  document.addEventListener('click', function (ev) {
    var el = ev.target.closest ? ev.target.closest('[data-control]') : null;
    if (!el) return;
    var id = el.getAttribute('data-control');
    var card = el.closest ? el.closest('[data-direction-index]') : null;

    if (id === 'directions.request') {
      clear();
      show('partial', 'Loading directions…');
      api('directions', Object.assign(briefFrom(), { n: 3 })).then(function (res) {
        if (res.status !== 200) { reportFailure(res); return; }
        window.location.reload();
      }).catch(function (e) { show('failure', 'E_NETWORK — ' + e.message); });
      return;
    }

    if (id === 'direction.choose') {
      clear();
      var name = card ? (card.querySelector('h3') || {}).textContent : '';
      api('compile', { brief: Object.assign(briefFrom(), { chosenDirection: name }) })
        .then(function (res) {
          if (res.status !== 200) { reportFailure(res); return; }
          window.location.assign('/think/' + encodeURIComponent(res.body.compileId));
        }).catch(function (e) { show('failure', 'E_NETWORK — ' + e.message); });
      return;
    }

    if (id === 'direction.preview') {
      clear();
      // The ONLY billing endpoint. It is refused, and the refusal says so plainly —
      // fail-closed beats spending without generating.
      api('preview', { confirmSpend: true }).then(reportFailure);
      return;
    }

    if (id === 'think.markRejectedAll') {
      clear();
      var cid = (location.pathname.split('/think/')[1] || '').split('?')[0];
      api('reject', { compileId: decodeURIComponent(cid) }).then(function (res) {
        if (res.status !== 200) { reportFailure(res); return; }
        show('success', 'recorded: ' + res.body.outcome);
      }).catch(function (e) { show('failure', 'E_NETWORK — ' + e.message); });
      return;
    }

    if (id === 'think.copyPrompt') {
      clear();
      var pre = document.querySelector('.prompt');
      if (pre && navigator.clipboard) {
        navigator.clipboard.writeText(pre.textContent).then(function () {
          show('success', 'copied');
        }).catch(function (e) { show('failure', 'E_CLIPBOARD — ' + e.message); });
      }
      return;
    }

    if (id === 'slots.reset' || id === 'direction.noneFit') {
      clear();
      window.location.reload();
    }
  });

  // Motion is read from the same query the stylesheet uses, so the two agree.
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.setAttribute('data-reduced-motion', reduce ? 'reduce' : 'no-preference');
}());
