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

  // Motion is read from the same query the stylesheet uses, so the two cannot disagree
  // about whether motion is allowed. Declared once, here, because more than one handler
  // needs it and a second declaration would be a second opinion.
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

    if (id === 'think.whyNot') {
      // The registry says this control "reads the LAW checks already shown", and that is
      // literally what it does: it CALLS NOTHING. It is the affordance that answers the
      // operator's question without leaving the pane they are on.
      //
      // It shipped with no handler at all, so the button rendered, took focus, announced
      // "Why not?", and did nothing when pressed — a dead control, which is the one thing
      // a console whose whole premise is "the app explains itself" cannot afford.
      clear();
      var heading = document.getElementById('law-h');
      var panel = heading && heading.closest ? heading.closest('section') : null;
      if (!panel) {
        show('failure', 'E_NO_LAW — this compile record carries no LAW section to read');
        return;
      }
      panel.classList.add('flash');
      panel.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      // The answer is the LAW table, but the reason no override is offered is the part the
      // operator actually needs, so it is stated rather than left to be inferred.
      show('partial', 'the LAW checks above ARE the explanation — a failed check blocks the '
        + 'compile and Astra offers no override');
      window.setTimeout(function () { panel.classList.remove('flash'); }, 2400);
      return;
    }

    if (id === 'slots.reset' || id === 'direction.noneFit') {
      clear();
      window.location.reload();
      return;
    }

    // --- Tune (A4). Every handler reloads, so the pane is rendered by paneTune.mjs and
    // only by paneTune.mjs — this file never builds a knob row.

    if (id === 'tuning.knob' || id === 'tuning.note') {
      // A click on a knob input or into the note field is not an action. Deliberately
      // no-op rather than falling through, so a later branch cannot accidentally claim it
      // — the note field used to carry `tuning.stage`'s id, and this guard is what makes
      // that class of collision impossible.
      return;
    }

    if (id === 'tuning.stage') {
      clear();
      var staged = {};
      var inputs = document.querySelectorAll('[data-control="tuning.knob"][data-key]');
      for (var i = 0; i < inputs.length; i++) {
        var el = inputs[i];
        var n = Number(el.value);
        if (el.value === '' || !isFinite(n)) continue;
        if (n !== Number(el.getAttribute('data-current'))) staged[el.getAttribute('data-key')] = n;
      }
      if (Object.keys(staged).length === 0) {
        // NOT calling the API here is the point. An empty patch means DISCARD on the
        // server, so pressing PREVIEW with no edits would silently throw away a stage the
        // operator already had — the draft would vanish on a button labelled "preview".
        show('partial', 'no knob differs from the live value — nothing to stage');
        return;
      }
      api('tuning-stage', { staged: staged, note: noteFrom() }).then(function (res) {
        if (res.status !== 200) { reportFailure(res); return; }
        window.location.reload();
      }).catch(function (e) { show('failure', 'E_NETWORK — ' + e.message); });
      return;
    }

    if (id === 'tuning.discard') {
      clear();
      // An empty patch is the server's documented discard, and it touches no file.
      api('tuning-stage', { staged: {} }).then(function (res) {
        if (res.status !== 200) { reportFailure(res); return; }
        window.location.reload();
      }).catch(function (e) { show('failure', 'E_NETWORK — ' + e.message); });
      return;
    }

    if (id === 'tuning.commit') {
      clear();
      api('tuning-commit', { note: noteFrom() }).then(function (res) {
        if (res.status !== 200) { reportFailure(res); return; }
        // The consequence is repeated back, so a successful commit cannot be reported
        // without also having been told what it moved.
        show('success', 'committed ' + res.body.changedKeys.join(', ')
          + ' · blast radius: ' + (res.body.blastRadius || []).join(', '));
        window.location.reload();
      }).catch(function (e) { show('failure', 'E_NETWORK — ' + e.message); });
      return;
    }

    if (id === 'tuning.revert') {
      clear();
      api('tuning-revert', {}).then(function (res) {
        if (res.status !== 200) { reportFailure(res); return; }
        show('success', 'reverted to the prior bytes');
        window.location.reload();
      }).catch(function (e) { show('failure', 'E_NETWORK — ' + e.message); });
      return;
    }
  });

  /** The Tune pane's note field, or '' when the pane is not on screen. */
  function noteFrom() {
    var el = document.getElementById('tuning-note');
    return el ? el.value : '';
  }

  // Motion is read from the same query the stylesheet uses, so the two agree.
  document.documentElement.setAttribute('data-reduced-motion', reduce ? 'reduce' : 'no-preference');
}());
