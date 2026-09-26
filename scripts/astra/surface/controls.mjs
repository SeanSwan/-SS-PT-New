/**
 * controls.mjs — THE control registry. Every control in the surface, in ONE list.
 *
 * WHY A REGISTRY AND NOT JUST HTML. `AC4.6` requires that every control in the
 * surface is labelled `DIAL` or `PROPOSAL`, and that a test can *walk the control
 * inventory* and fail on any control carrying neither. A test can only walk an
 * inventory if there is one — so the inventory is data, and the markup is generated
 * from it. The alternative (a test that scrapes rendered HTML for a class name)
 * would pass the moment someone rendered a control without the class, which is
 * exactly the failure the requirement exists to catch.
 *
 * THE DISTINCTION IS THE WHOLE DESIGN. `01-REQUIREMENTS.md` §4 splits the surface
 * into three legal dials applied instantly (tuning knobs, slot overrides, brief
 * fields) and ONE proposal channel routed to Sean and never applied (tokens, canon,
 * LAW, spec mode, taste). A control that is not obviously one of those two is a
 * control whose blast radius nobody has stated. `kind` is therefore REQUIRED — a
 * control with no `kind` fails `verifyControls()`, and `--check-controls` exits
 * non-zero on it.
 *
 * `writes` and `token` are separate from `kind` on purpose. A `dial` may or may not
 * persist (a brief field affects one compile; a tuning commit rewrites a config
 * file), and the token requirement follows from whether it persists, not from which
 * kind it is. Collapsing the two would make "this dial writes" unsayable.
 */

/** The only two labels a control may carry. */
export const CONTROL_KINDS = Object.freeze(['dial', 'proposal']);

/**
 * Every control, in rail order. `rendered: false` marks a control that is declared
 * but NOT yet in the surface — the five proposal-channel entries belong to A7, and
 * declaring them here keeps the dial/proposal split visible now rather than
 * arriving as five new controls with no stated relationship to the dials.
 *
 * A `rendered: true` control MUST appear in the rendered markup, and every
 * `data-control` in the markup MUST be registered. `verifyControls()` checks the
 * first; `a3-surface.test.mjs` checks both.
 */
export const CONTROLS = Object.freeze([
  // --- Compose: the brief fields. These are DIALS — they affect one compile. ----
  {
    id: 'brief.text', pane: 'compose', label: 'Brief text', kind: 'dial', element: 'textarea',
    effect: 'one compile', writes: false, token: false, rendered: true,
    note: 'Verbatim and immutable in storage; editing it is editing the next compile, not the last.',
  },
  {
    id: 'brief.intent', pane: 'compose', label: 'Intent', kind: 'dial', element: 'select',
    effect: 'one compile', writes: false, token: false, rendered: true, options: ['hero', 'section', 'proof'],
  },
  {
    id: 'brief.aspect', pane: 'compose', label: 'Aspect', kind: 'dial', element: 'select',
    effect: 'one compile', writes: false, token: false, rendered: true,
    options: ['16:9', '9:16', '1:1', '21:9', '4:5'],
  },
  {
    id: 'brief.surfaceClass', pane: 'compose', label: 'Surface class', kind: 'dial', element: 'select',
    effect: 'one compile', writes: false, token: false, rendered: true, options: ['public', 'internal', 'client'],
  },
  {
    id: 'brief.seed', pane: 'compose', label: 'Seed', kind: 'dial', element: 'input',
    effect: 'one compile', writes: false, token: false, rendered: true,
    note: '"auto" means the compiler picks one and records it — it is not a hidden default.',
  },
  {
    id: 'directions.request', pane: 'compose', label: 'Show directions', kind: 'dial', element: 'button',
    effect: 'Gate 0 — ZERO cost, nothing generated', writes: false, token: false, rendered: true,
  },
  {
    // THE EDITOR ITSELF. `repeated` is how the registry says "this id appears once
    // per overridable slot" without N registrations — the same shape as
    // `tuning.knob`, and for the same reason: 11 near-identical entries would be
    // 11 places to forget when the 12th slot is added.
    id: 'slots.override', pane: 'compose', label: 'A slot override', kind: 'dial', element: 'input',
    effect: 'one compile — the brief text is untouched', writes: false, token: false,
    rendered: true, repeated: 'per overridable slot',
    note: 'The one layer `resolveSlots` applies LAST, so it can overwrite a decided value. '
      + 'Slot 11 (`negative`) is deliberately NOT editable — it carries LAW 3\'s kill-list, '
      + 'and `core/overrides.mjs` refuses it at the API boundary too.',
  },
  {
    id: 'slots.stageOverrides', pane: 'compose', label: 'Stage overrides', kind: 'dial', element: 'button',
    effect: 'one compile', writes: false, token: false, rendered: true,
  },
  {
    id: 'slots.reset', pane: 'compose', label: 'Reset overrides', kind: 'dial', element: 'button',
    effect: 'one compile', writes: false, token: false, rendered: true,
  },

  // --- Choose: the direction cards. ------------------------------------------
  {
    id: 'direction.choose', pane: 'choose', label: 'Choose this direction', kind: 'dial', element: 'button',
    effect: 'one compile', writes: false, token: false, rendered: true, repeated: 'per direction',
  },
  {
    id: 'direction.preview', pane: 'choose', label: 'Preview', kind: 'dial', element: 'button',
    effect: 'THE ONLY BILLING ACTION in the surface', writes: false, token: true, rendered: true,
    repeated: 'per direction',
    note: 'Requires confirmSpend. Every other control on this surface is free, and the label says $ for that reason.',
  },
  {
    id: 'direction.noneFit', pane: 'choose', label: 'None of these fit', kind: 'dial', element: 'button',
    effect: 'back to Draft', writes: false, token: false, rendered: true,
  },

  // --- Think: the explanation. -----------------------------------------------
  {
    id: 'think.copyPrompt', pane: 'think', label: 'Copy', kind: 'dial', element: 'button',
    effect: 'clipboard only — no server call', writes: false, token: false, rendered: true,
  },
  {
    id: 'think.whyNot', pane: 'think', label: 'Why not?', kind: 'dial', element: 'button',
    effect: 'reads the LAW checks already shown', writes: false, token: false, rendered: true,
  },
  {
    id: 'think.markRejectedAll', pane: 'think', label: 'Mark rejected-all', kind: 'dial', element: 'button',
    effect: 'the Ledger’s rejected count', writes: true, token: true, rendered: true,
    note: 'Writes an outcome against this compile. Never deletes or edits the compile.',
  },

  // --- Tune (A4). Declared here so the registry is complete for the rail. -----
  {
    id: 'tuning.knob', pane: 'tune', label: 'A tuning knob', kind: 'dial', element: 'input',
    effect: 'novelty scoring / auto-merge gating — see the blast radius column', writes: false,
    token: false, rendered: true, repeated: 'per knob',
  },
  {
    id: 'tuning.stage', pane: 'tune', label: 'Stage', kind: 'dial', element: 'button',
    effect: 'the staged draft', writes: false, token: true, rendered: true,
  },
  {
    // `03-INTERFACE.md` §2.3 draws `[DISCARD STAGE]` as the third button, and §3's flow
    // diagram has `T5 -->|no| T6[DISCARD STAGE file untouched]` as the branch where Sean
    // changes his mind. It is NOT the same action as revert: discard throws away a draft
    // that was never written, revert restores bytes that were. A4 shipped only the second,
    // so the pane had no way to abandon a stage short of committing it or reloading.
    //
    // `token: true` because the route it calls (`tuning-stage`, empty patch) is a mutation
    // route — session state is server state. `writes: false` because the FILE is untouched.
    id: 'tuning.discard', pane: 'tune', label: 'Discard stage', kind: 'dial', element: 'button',
    effect: 'the staged draft — the file is not touched', writes: false, token: true,
    rendered: true,
  },
  {
    id: 'tuning.commit', pane: 'tune', label: 'Commit', kind: 'dial', element: 'button',
    effect: 'tuning.json — atomic, with the prior bytes kept', writes: true, token: true,
    rendered: true,
  },
  {
    id: 'tuning.revert', pane: 'tune', label: 'Revert', kind: 'dial', element: 'button',
    effect: 'tuning.json — restored by hash comparison', writes: true, token: true,
    rendered: true,
  },
  {
    // A FIELD IS A CONTROL. The note is focusable, it is edited, and it travels with the
    // commit — leaving it unregistered would mean the pane has an interactive element with
    // no DIAL/PROPOSAL label, which is the one thing `AC4.6` exists to prevent. It also
    // used to carry `tuning.stage`'s id, which made a click into it indistinguishable from
    // pressing PREVIEW once the client learned to handle that action.
    id: 'tuning.note', pane: 'tune', label: 'Commit note', kind: 'dial', element: 'textarea',
    effect: 'the reason recorded with the commit — it does not write the config',
    writes: false, token: false, rendered: true,
  },

  // --- Ledger (A6). The dial that FEEDS this pane's read. ---------------------
  {
    // `02-BLUEPRINT.md` §5 row 7 gives the Ledger pane one read (`rejected_all` trend, cost
    // drift) and one write (`rejected_all`) — and the write is a DIAL. This is that dial.
    //
    // IT IS A SECOND AFFORDANCE OF ONE OPERATION, NOT A SECOND OPERATION. `think.
    // markRejectedAll` rejects the compile you are READING; this one rejects the batch you
    // are looking at IN THE LIST. Both POST to the same `reject` route. Two ids for one
    // operation is a drift risk, so it is closed by construction rather than by comment:
    // `a6-ledger.test.mjs` asserts the two client handlers are the SAME FUNCTION OBJECT, not
    // two functions that currently agree.
    //
    // `repeated: 'per pending compile'` IS LOAD-BEARING. The pane emits this button only on a
    // row whose outcome is still `pending`; a decided row offers no button. That is what stops
    // the Ledger from presenting an action that would do nothing — the dead-control defect
    // `UNWIRED_CONTROLS` exists to catch, in its other form.
    id: 'ledger.markRejectedAll', pane: 'ledger', label: 'Mark rejected-all', kind: 'dial',
    element: 'button', effect: 'the Ledger’s rejected count — one action, no typed reason',
    writes: true, token: true, rendered: true, repeated: 'per pending compile',
    note: 'No typed reason is required (AC6.1). Writes an outcome against a compile; never '
      + 'deletes or edits one. Rendered only on a row that is still pending.',
  },

  // --- The proposal channel (A7). NEVER applied by Astra. ---------------------
  {
    id: 'proposal.newToken', pane: 'proposal', label: 'Propose a new token', kind: 'proposal',
    element: 'button', effect: 'drafts a proposal for Sean; changes nothing', writes: false,
    token: false, rendered: false, plannedIn: 'A7',
  },
  {
    id: 'proposal.canonChange', pane: 'proposal', label: 'Propose a canon change', kind: 'proposal',
    element: 'button', effect: 'drafts a proposal for Sean; changes nothing', writes: false,
    token: false, rendered: false, plannedIn: 'A7',
  },
  {
    id: 'proposal.lawChange', pane: 'proposal', label: 'Propose a LAW change', kind: 'proposal',
    element: 'button', effect: 'drafts a proposal for Sean; changes nothing', writes: false,
    token: false, rendered: false, plannedIn: 'A7',
  },
  {
    id: 'proposal.specModeActivation', pane: 'proposal', label: 'Propose enabling spec mode',
    kind: 'proposal', element: 'button', effect: 'drafts a proposal for Sean; changes nothing',
    writes: false, token: false, rendered: false, plannedIn: 'A7',
  },
  {
    id: 'proposal.tasteChange', pane: 'proposal', label: 'Propose a taste change', kind: 'proposal',
    element: 'button', effect: 'routes to the probe page at 127.0.0.1:7331 — taste has ONE writer',
    writes: false, token: false, rendered: false, plannedIn: 'A7',
  },
]);

/**
 * Panes that are read-only BY DESIGN, with the reason.
 *
 * This is not a list of panes that happen to lack controls. `02-BLUEPRINT.md` §5:
 * "A console with an 'ignore' button here would be the most expensive feature in
 * the product." Encoding the decision means a later author adding a control to the
 * Law pane has to delete an entry that says why they should not.
 */
export const READ_ONLY_PANES = Object.freeze([
  { pane: 'law', reason: 'A failed check blocks the compile and Astra offers no override. '
    + 'Silent stripping teaches the operator nothing and hides taste failures.' },
  { pane: 'state', reason: 'No control on this pane enables a REFUSED lane. '
    + 'That is a design decision, not a missing feature.' },
]);

/**
 * Rendered controls with NO handler in `static/astra.js`.
 *
 * A control that renders and does nothing is a DEAD CONTROL. It takes focus, it announces
 * a name, and it lies about what pressing it will do — which is worse than an absent
 * button, because the operator concludes the action failed rather than that it does not
 * exist.
 *
 * `AC4.6`'s cross-check CANNOT SEE THIS. That check proves the id is registered and that
 * the markup carries it; it says nothing about whether anything happens on use. A4 found
 * two such controls only because it wrote the wiring check below, and one of them was
 * `think.whyNot` — a button labelled "Why not?" on the pane whose entire job is answering
 * that question.
 *
 * EMPTY SINCE A4b, and it took the wiring check to empty it: `slots.stageOverrides` was
 * the last entry, and it was only there because the override editor did not exist. The
 * list is kept — and kept EMPTY rather than deleted — because it is the exclusion list
 * for a check that must fail loudly the moment a rendered control loses its handler. A
 * deleted list is a deleted check.
 */
export const UNWIRED_CONTROLS = Object.freeze([]);

/** The registry's own consistency check. Returns findings; never throws. */
export function verifyControls(controls = CONTROLS) {
  const badKind = controls.filter((c) => !CONTROL_KINDS.includes(c.kind)).map((c) => c.id);
  const ids = controls.map((c) => c.id);
  const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
  const missingFields = controls
    .filter((c) => !c.label || !c.pane || typeof c.writes !== 'boolean' || typeof c.token !== 'boolean')
    .map((c) => c.id);
  // A control that claims to write but needs no token would be a write path with no
  // CSRF protection. The reverse (a token on a non-write) is merely over-strict.
  const writeWithoutToken = controls.filter((c) => c.writes && !c.token).map((c) => c.id);
  // A proposal must never write. That is the definition of the channel.
  const proposalThatWrites = controls.filter((c) => c.kind === 'proposal' && c.writes).map((c) => c.id);

  return {
    ok: badKind.length === 0 && duplicates.length === 0 && missingFields.length === 0
      && writeWithoutToken.length === 0 && proposalThatWrites.length === 0,
    total: controls.length,
    dials: controls.filter((c) => c.kind === 'dial').length,
    proposals: controls.filter((c) => c.kind === 'proposal').length,
    rendered: controls.filter((c) => c.rendered).length,
    badKind, duplicates, missingFields, writeWithoutToken, proposalThatWrites,
  };
}

/** Controls for one pane, in registry order. */
export function controlsForPane(pane, controls = CONTROLS) {
  return controls.filter((c) => c.pane === pane);
}

/** The controls that are actually in the surface right now. */
export function renderedControls(controls = CONTROLS) {
  return controls.filter((c) => c.rendered);
}

/** The DIAL / PROPOSAL badge every control must carry. */
export function badgeFor(control) {
  return control.kind === 'dial' ? 'DIAL' : 'PROPOSAL';
}
