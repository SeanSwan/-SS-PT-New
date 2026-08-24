/**
 * @swan/forge — headless Modal core (tier: behavior — written once, never forked).
 * Owns: open/close state machine, Escape handling, focus-trap order, scrim semantics,
 * and the aria contract. DOM-agnostic — bindings supply element lookups.
 *
 * Core-invariant (plan §11.A1): focus order is core-owned. Variants (drawer vs dialog)
 * change geometry via CSS classes only; the trap and keyboard behavior never fork.
 */

/**
 * @typedef {Object} ModalState
 * @property {boolean} open
 * @property {string} labelId    id of the element titling the dialog
 * @property {string} variant    'dialog' | 'drawer'
 */

/**
 * @param {{open?: boolean, labelId?: string, variant?: string}} props
 * @returns {ModalState}
 */
export function getModalState(props = {}) {
  // labelId is sanitized to a plain identifier — attribute-map consumers are safe
  // either way, but string-concatenating renderers must never receive markup here.
  const rawId = props.labelId ?? 'sw-modal-title';
  return {
    open: Boolean(props.open),
    labelId: /^[A-Za-z][\w-]*$/.test(rawId) ? rawId : 'sw-modal-title',
    variant: props.variant === 'drawer' ? 'drawer' : 'dialog',
  };
}

/**
 * Attribute map for the dialog container. tabindex="-1" makes the dialog itself
 * the focus fallback when it contains zero focusable elements (the trap must
 * never leak Tab to the background).
 * @param {ModalState} state
 * @returns {Record<string, string|undefined>}
 */
export function getModalAttrs(state) {
  return {
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': state.labelId,
    tabindex: '-1',
    class: `sw-modal sw-modal--${state.variant}${state.open ? ' is-open' : ''}`,
    'data-state': state.open ? 'open' : 'closed',
  };
}

/** Attribute map for the scrim/overlay element. */
export function getScrimAttrs(state) {
  return {
    class: `sw-modal-scrim${state.open ? ' is-open' : ''}`,
    'aria-hidden': 'true',
    'data-state': state.open ? 'open' : 'closed',
  };
}

/** Selector for focusable elements inside the trap (single source of truth). */
export const FOCUSABLE_SELECTOR = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]', 'summary', 'iframe', 'audio[controls]', 'video[controls]',
].join(', ');

/**
 * Binding duties (core-owned CONTRACT — every binding implements these, per §11.A1):
 * on open: save document.activeElement, focus first FOCUSABLE_SELECTOR match or the
 * dialog itself (tabindex="-1"); on close: restore saved focus; while open: route
 * keydown through handleModalKey, and on 'trap' move focus via nextTrapIndex —
 * when the focusable list is empty, focus the dialog element (never let Tab leak).
 * The gallery is the reference implementation.
 */

/**
 * Focus destination on open / on empty-trap Tab.
 * @param {number} focusableCount
 * @returns {'first-item'|'dialog'}
 */
export function initialFocusTarget(focusableCount) {
  return focusableCount > 0 ? 'first-item' : 'dialog';
}

/**
 * Compute the focus destination for a Tab keypress inside the trap.
 * Pure function so the trap order is unit-testable without a DOM.
 * @param {number} currentIndex index of the focused element in the focusable list
 * @param {number} count        number of focusable elements
 * @param {boolean} shiftKey
 * @returns {number} next index (wraps at both ends)
 */
export function nextTrapIndex(currentIndex, count, shiftKey) {
  if (count <= 0) return -1;
  if (currentIndex < 0) return shiftKey ? count - 1 : 0;
  const delta = shiftKey ? -1 : 1;
  return (currentIndex + delta + count) % count;
}

/**
 * Keyboard reducer for the modal.
 * @param {ModalState} state
 * @param {{key: string, shiftKey?: boolean}} event
 * @returns {{action: 'close'|'trap'|'none'}}
 */
export function handleModalKey(state, event) {
  if (!state.open) return { action: 'none' };
  if (event.key === 'Escape') return { action: 'close' };
  if (event.key === 'Tab') return { action: 'trap' };
  return { action: 'none' };
}
