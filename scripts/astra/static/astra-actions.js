/*
 * astra-actions.js — WHAT each control DOES. One entry per registered control id.
 *
 * SPLIT FROM `astra.js` WITH `astra-core.js` (Rule 4, plumbing vs actions). The
 * dispatch is a TABLE keyed by control id rather than an `if` chain, and that is not
 * cosmetic: `a4-surface.test.mjs` proves every RENDERED control has a handler by
 * looking for its id in this client. A table makes that lookup the same operation
 * the browser performs, so the check and the behaviour cannot drift.
 *
 * AN ABSENT ENTRY IS A DEAD CONTROL. It takes focus, announces a name, and does
 * nothing — which is worse than an absent button, because the operator concludes the
 * action failed rather than that it does not exist. Two controls shipped that way
 * already (`think.whyNot`, `slots.stageOverrides`); the wiring check is what caught
 * both, and this table is what makes it possible to run that check at all.
 *
 * NOT EVERY ENTRY IS AN ACTION. Inputs and textareas carry their own control id so
 * that a click INTO them is distinguishable from pressing the button beside them
 * (a collision that shipped once: the Tune note field carried `tuning.stage`). Those
 * entries are deliberate no-ops, written as such, rather than omissions.
 */

import {
  api, briefFrom, clear, knobPatchFrom, noteFrom, post, reduce, reportFailure,
  show, slotOverridesFrom,
} from './astra-core.js';

/** The affordance that answers "Why not?" without leaving the pane. */
function revealLawPanel() {
  // The registry says this control "reads the LAW checks already shown", and that is
  // literally what it does: it CALLS NOTHING. It is the affordance that answers the
  // operator's question without leaving the pane they are on.
  //
  // It shipped with no handler at all, so the button rendered, took focus, announced
  // "Why not?", and did nothing when pressed.
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
}

/**
 * THE ONE IMPLEMENTATION OF `rejected_all`. TWO AFFORDANCES, ONE OPERATION.
 *
 * `think.markRejectedAll` rejects the compile you are READING (its id is in the URL);
 * `ledger.markRejectedAll` rejects a batch you are looking at IN A LIST (its id is on the row).
 * They are two registrations of one action, so they are ONE FUNCTION. A second handler would
 * let the two drift — one gaining a confirmation, the other losing the token — with nothing to
 * notice. `a6-ledger.test.mjs` asserts the two entries are the SAME FUNCTION OBJECT, which is a
 * claim about identity rather than about agreement.
 *
 * THE ID COMES FROM THE DOM FIRST, THE URL SECOND. A row knows its own id; the URL only knows
 * about the compile being read. The URL fallback is the only reason `location.pathname` is
 * touched here at all.
 *
 * IT RELOADS ON SUCCESS, AND THAT IS A CHANGE (A6). The old handler deliberately did not:
 * *"the outcome is the whole answer, and reloading would wipe it"*. That reasoning held while
 * the pane could not show an outcome — it read `view.outcome`, a field that does not exist, so
 * it printed `pending` forever and the toast was the only evidence. The pane now reads the real
 * outcome off the registry entry, so a reload is STRICTLY BETTER evidence: the row flips to
 * `rejected_all` and the button goes away. A toast floating over a row that still says `pending`
 * is the worse outcome, and it is the one an operator reads as "it failed".
 */
function markRejectedAll(el) {
  clear();
  var row = el && el.closest ? el.closest('[data-compile-id]') : null;
  var cid = (row && row.getAttribute('data-compile-id'))
    || (location.pathname.split('/think/')[1] || '').split('?')[0];
  if (!cid) {
    show('failure', 'E_NO_COMPILE — this control is not attached to a compile, so there is '
      + 'nothing to mark. That is a rendering fault, not a failed action.');
    return;
  }
  api('reject', { compileId: decodeURIComponent(cid) }).then(function (res) {
    // A failure is shown IN PLACE, and the pane is left alone so it can be read.
    if (res.status !== 200) { reportFailure(res); return; }
    // Success re-renders the pane, because the pane is the thing that changed.
    window.location.reload();
  }).catch(function (e) { show('failure', 'E_NETWORK — ' + e.message); });
}

export const ACTIONS = {
  'directions.request': function () {
    clear();
    show('partial', 'Loading directions…');
    post('directions', Object.assign(briefFrom(), { n: 3 }));
  },

  'direction.choose': function (el) {
    // A different destination, not a reload — so this one is written out rather than
    // going through `post()`.
    clear();
    var card = el.closest ? el.closest('[data-direction-index]') : null;
    var name = card ? (card.querySelector('h3') || {}).textContent : '';
    api('compile', { brief: Object.assign(briefFrom(), { chosenDirection: name }) })
      .then(function (res) {
        if (res.status !== 200) { reportFailure(res); return; }
        window.location.assign('/think/' + encodeURIComponent(res.body.compileId));
      }).catch(function (e) { show('failure', 'E_NETWORK — ' + e.message); });
  },

  'direction.preview': function () {
    // The ONLY billing endpoint. It is refused, and the refusal says so plainly —
    // fail-closed beats spending without generating.
    clear();
    api('preview', { confirmSpend: true }).then(reportFailure);
  },

  'direction.noneFit': function () { clear(); window.location.reload(); },

  'think.copyPrompt': function () {
    clear();
    var pre = document.querySelector('.prompt');
    if (pre && navigator.clipboard) {
      navigator.clipboard.writeText(pre.textContent).then(function () {
        show('success', 'copied');
      }).catch(function (e) { show('failure', 'E_CLIPBOARD — ' + e.message); });
    }
  },

  'think.whyNot': revealLawPanel,

  'think.markRejectedAll': markRejectedAll,

  // The Ledger's dial (A6). DELIBERATELY THE SAME FUNCTION OBJECT as the line above: it is the
  // same operation, offered where the batches are listed. See `markRejectedAll`'s header.
  'ledger.markRejectedAll': markRejectedAll,

  // --- The override layer (A4b). One dial, eleven editable slots, no file. ---

  // A click INTO a slot input is not an action. Declared rather than omitted, so a
  // later author adding a handler cannot accidentally claim the click.
  'slots.override': function () {},

  'slots.stageOverrides': function () {
    var next = slotOverridesFrom();
    // AN EMPTY SET IS MEANINGFUL HERE, unlike the tuning patch. The server REPLACES the
    // stage with what is sent, so an empty set means the operator put every slot back to
    // its resolved value — a real action (clear the stage) that must be sent. It is only
    // a no-op when nothing was staged to begin with.
    var anyStaged = document.querySelector('[data-control="slots.override"][data-staged="true"]');
    if (Object.keys(next).length === 0 && !anyStaged) {
      clear();
      show('partial', 'no slot differs from its resolved value — nothing to stage');
      return;
    }
    post('overrides-stage', { overrides: next }, function (body) {
      show('success', body.changedKeys.length
        ? 'staged: ' + body.changedKeys.join(', ')
        : 'overrides cleared — the next compile uses the resolved values');
    });
  },

  'slots.reset': function () {
    post('overrides-stage', { overrides: {} }, function () {
      show('success', 'overrides cleared');
    });
  },

  // --- Tune (A4). Every handler reloads, so the pane is rendered by paneTune.mjs and
  // only by paneTune.mjs — this client never builds a knob row.

  'tuning.knob': function () {},
  'tuning.note': function () {},

  'tuning.stage': function () {
    var staged = knobPatchFrom();
    if (Object.keys(staged).length === 0) {
      // NOT calling the API here is the point. An empty patch means DISCARD on the
      // server, so pressing PREVIEW with no edits would silently throw away a stage the
      // operator already had — the draft would vanish on a button labelled "preview".
      clear();
      show('partial', 'no knob differs from the live value — nothing to stage');
      return;
    }
    post('tuning-stage', { staged: staged, note: noteFrom() });
  },

  // An empty patch is the server's documented discard, and it touches no file.
  'tuning.discard': function () { post('tuning-stage', { staged: {} }); },

  'tuning.commit': function () {
    post('tuning-commit', { note: noteFrom() }, function (body) {
      // The consequence is repeated back, so a successful commit cannot be reported
      // without also having been told what it moved.
      show('success', 'committed ' + body.changedKeys.join(', ')
        + ' · blast radius: ' + (body.blastRadius || []).join(', '));
    });
  },

  'tuning.revert': function () {
    post('tuning-revert', {}, function () { show('success', 'reverted to the prior bytes'); });
  },
};

/** Install the one delegated listener. Called by the entry module. */
export function bindActions() {
  document.addEventListener('click', function (ev) {
    var el = ev.target.closest ? ev.target.closest('[data-control]') : null;
    if (!el) return;
    var action = ACTIONS[el.getAttribute('data-control')];
    if (action) action(el);
  });
}
