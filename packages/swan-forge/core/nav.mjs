/**
 * @swan/forge — headless Nav core. Structural variants (top bar · side rail) are
 * first-class catalog entries sharing THIS core (plan §1 variant layer): the
 * core owns the disclosure state for the collapsed/mobile menu, Escape-to-close,
 * focus return, `aria-current="page"` marking, and the toggle's aria contract.
 * Zero deps; pure attribute maps + reducers.
 */

/**
 * @typedef {Object} NavState
 * @property {string} id
 * @property {'top'|'side'} variant
 * @property {boolean} open        collapsed menu open (mobile / compact)
 * @property {string} current      href or key of the current page
 * @property {{key: string, label: string, href: string}[]} items
 */

/** @param {{id?: string, variant?: string, open?: boolean, current?: string, items?: any[]}} props @returns {NavState} */
export function getNavState(props = {}) {
  const rawId = props.id ?? 'sw-nav';
  const items = (Array.isArray(props.items) ? props.items : [])
    .filter((i) => i && typeof i.key === 'string' && typeof i.href === 'string')
    .map((i) => ({ key: i.key, label: String(i.label ?? i.key), href: i.href }));
  return {
    id: /^[A-Za-z][\w-]*$/.test(rawId) ? rawId : 'sw-nav',
    variant: props.variant === 'side' ? 'side' : 'top',
    open: Boolean(props.open),
    current: String(props.current ?? ''),
    items,
  };
}

/** Landmark attrs for the <nav>. Multiple navs on a page MUST carry distinct labels. */
export function getNavAttrs(state, label = 'Primary') {
  return { 'aria-label': label, class: `sw-nav sw-nav--${state.variant}${state.open ? ' is-open' : ''}`, 'data-variant': state.variant };
}

/** Toggle button (hamburger / rail collapse). */
export function getNavToggleAttrs(state) {
  return {
    type: 'button',
    'aria-expanded': state.open ? 'true' : 'false',
    'aria-controls': `${state.id}-menu`,
    class: 'sw-nav__toggle sw-btn sw-btn--ghost sw-btn--icon',
  };
}

/** The collapsible menu container. */
export function getNavMenuAttrs(state) {
  return { id: `${state.id}-menu`, class: `sw-nav__menu${state.open ? ' is-open' : ''}`, 'data-state': state.open ? 'open' : 'closed' };
}

/** One link. aria-current marks the current page — never a class alone. */
export function getNavLinkAttrs(state, item) {
  const current = item.href === state.current || item.key === state.current;
  return { href: item.href, class: `sw-nav__link${current ? ' is-current' : ''}`, 'aria-current': current ? 'page' : undefined };
}

/**
 * Keyboard/interaction reducer. Escape closes an open menu (binding restores focus
 * to the toggle); selecting a link closes it too.
 * @returns {{open: boolean, restoreFocus: boolean}}
 */
export function reduceNav(state, event) {
  if (event.type === 'toggle') return { open: !state.open, restoreFocus: false };
  if (event.type === 'select') return { open: false, restoreFocus: false };
  if (event.type === 'key' && event.key === 'Escape' && state.open) return { open: false, restoreFocus: true };
  return { open: state.open, restoreFocus: false };
}
