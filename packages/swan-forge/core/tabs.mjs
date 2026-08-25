/**
 * @swan/forge — headless Tabs core (WAI-ARIA tabs pattern: roving tabindex,
 * arrow-key navigation, Home/End, automatic OR manual activation).
 * Framework-agnostic attribute maps + a pure keyboard reducer. Zero deps.
 * Core-invariant (§11.A1): keyboard/focus semantics live here; variants
 * (underline vs pill vs vertical) are CSS classes only.
 */

/**
 * @typedef {Object} TabsState
 * @property {string} id            base id (sanitized)
 * @property {string[]} tabs        tab keys, in order
 * @property {string} selected      selected tab key
 * @property {'horizontal'|'vertical'} orientation
 * @property {'automatic'|'manual'} activation
 */

/**
 * @param {{id?: string, tabs?: string[], selected?: string, orientation?: string, activation?: string}} props
 * @returns {TabsState}
 */
export function getTabsState(props = {}) {
  const rawId = props.id ?? 'sw-tabs';
  const tabs = Array.isArray(props.tabs) ? props.tabs.filter((t) => typeof t === 'string' && t) : [];
  return {
    id: /^[A-Za-z][\w-]*$/.test(rawId) ? rawId : 'sw-tabs',
    tabs,
    selected: tabs.includes(props.selected ?? '') ? /** @type {string} */ (props.selected) : (tabs[0] ?? ''),
    orientation: props.orientation === 'vertical' ? 'vertical' : 'horizontal',
    activation: props.activation === 'manual' ? 'manual' : 'automatic',
  };
}

const safe = (k) => String(k).replace(/[^\w-]/g, '_');

/** Attribute map for the tablist container. */
export function getTabListAttrs(state) {
  return { role: 'tablist', 'aria-orientation': state.orientation, class: `sw-tabs sw-tabs--${state.orientation}` };
}

/** Attribute map for one tab button. Roving tabindex: only the selected tab is in the tab order. */
export function getTabAttrs(state, key) {
  const selected = key === state.selected;
  return {
    role: 'tab',
    id: `${state.id}-tab-${safe(key)}`,
    'aria-selected': selected ? 'true' : 'false',
    'aria-controls': `${state.id}-panel-${safe(key)}`,
    tabindex: selected ? '0' : '-1',
    class: `sw-tab${selected ? ' is-selected' : ''}`,
    'data-key': String(key),
  };
}

/** Attribute map for one tab panel. Hidden panels are removed from the a11y tree. */
export function getTabPanelAttrs(state, key) {
  const selected = key === state.selected;
  return {
    role: 'tabpanel',
    id: `${state.id}-panel-${safe(key)}`,
    'aria-labelledby': `${state.id}-tab-${safe(key)}`,
    tabindex: '0',
    hidden: selected ? undefined : true,
    class: `sw-tabpanel${selected ? ' is-selected' : ''}`,
  };
}

/**
 * Keyboard reducer for a keydown on a tab. Returns the tab to FOCUS and whether
 * to also SELECT it (automatic activation selects on focus; manual selects on
 * Enter/Space only). Pure: no DOM.
 * @param {TabsState} state
 * @param {string} focusedKey   the tab that currently has focus
 * @param {{key: string}} event
 * @returns {{focus: string|null, select: string|null, preventDefault: boolean}}
 */
export function handleTabKey(state, focusedKey, event) {
  const { tabs, orientation, activation } = state;
  const n = tabs.length;
  if (!n) return { focus: null, select: null, preventDefault: false };
  const i = Math.max(0, tabs.indexOf(focusedKey));
  const prev = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft';
  const next = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight';
  let target = null;
  if (event.key === next) target = tabs[(i + 1) % n];
  else if (event.key === prev) target = tabs[(i - 1 + n) % n];
  else if (event.key === 'Home') target = tabs[0];
  else if (event.key === 'End') target = tabs[n - 1];
  else if (event.key === 'Enter' || event.key === ' ') return { focus: null, select: focusedKey, preventDefault: true };
  if (target === null) return { focus: null, select: null, preventDefault: false };
  return { focus: target, select: activation === 'automatic' ? target : null, preventDefault: true };
}
