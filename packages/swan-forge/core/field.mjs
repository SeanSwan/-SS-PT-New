/**
 * @swan/forge — headless Field core (input + label + hint/error/warning wiring).
 * Added per Ox code-review F26: a skin without a core meant every consumer
 * hand-wired aria-invalid/aria-describedby — the exact fork §11.A1 forbids.
 * Framework-agnostic attribute maps; zero deps.
 */

/**
 * @typedef {Object} FieldState
 * @property {string} id          base id (sanitized identifier)
 * @property {boolean} disabled
 * @property {boolean} required
 * @property {'none'|'error'|'warning'} validity
 * @property {boolean} hasHint
 */

/**
 * @param {{id?: string, disabled?: boolean, required?: boolean,
 *          error?: boolean|string, warning?: boolean|string, hint?: boolean|string}} props
 * @returns {FieldState}
 */
export function getFieldState(props = {}) {
  const rawId = props.id ?? 'sw-field';
  return {
    id: /^[A-Za-z][\w-]*$/.test(rawId) ? rawId : 'sw-field',
    disabled: Boolean(props.disabled),
    required: Boolean(props.required),
    validity: props.error ? 'error' : props.warning ? 'warning' : 'none',
    hasHint: Boolean(props.hint),
  };
}

/** ids for the description elements (single source of truth for wiring). */
export function fieldIds(state) {
  return {
    input: `${state.id}-input`,
    label: `${state.id}-label`,
    hint: `${state.id}-hint`,
    message: `${state.id}-msg`, // error OR warning text lives here
  };
}

/** Attribute map for the <input>. */
export function getInputAttrs(state) {
  const ids = fieldIds(state);
  const describedBy = [
    state.hasHint ? ids.hint : null,
    state.validity !== 'none' ? ids.message : null,
  ].filter(Boolean).join(' ');
  return {
    id: ids.input,
    class: 'sw-input',
    disabled: state.disabled ? true : undefined,
    required: state.required ? true : undefined,
    'aria-invalid': state.validity === 'error' ? 'true' : undefined,
    'aria-describedby': describedBy || undefined,
  };
}

/** Attribute map for the label element. */
export function getLabelAttrs(state) {
  const ids = fieldIds(state);
  return { id: ids.label, for: ids.input, class: 'sw-field__label' };
}

/** Attribute map for the hint/error/warning message element (renders one at a time). */
export function getMessageAttrs(state) {
  const ids = fieldIds(state);
  if (state.validity === 'error') return { id: ids.message, class: 'sw-field__error', role: 'alert' };
  if (state.validity === 'warning') return { id: ids.message, class: 'sw-field__warning' };
  return { id: ids.hint, class: 'sw-field__hint' };
}
