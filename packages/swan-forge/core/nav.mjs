/**
 * @swan/forge — headless Nav core. Structural variants (top bar · side rail) are
 * first-class catalog entries sharing THIS core (plan §1 variant layer): the
 * core owns the disclosure state for the collapsed/mobile menu, Escape-to-close,
 * focus return, `aria-current="page"` marking, and the toggle's aria contract.
 * Zero deps; pure attribute maps + reducers.
 */

/**
 * @typedef {Object} NavItem
 * @property {string} key
 * @property {string} label
 * @property {string} href
 * @property {string} [icon]    optional icon slot key (rendered by the binding)
 * @property {string} [group]   optional group heading key (UDL-style grouped rails)
 *
 * @typedef {Object} NavState
 * @property {string} id
 * @property {'top'|'side'} variant
 * @property {boolean} open        collapsed menu open (mobile / compact)
 * @property {string} current      the CURRENT PATH (router-supplied), matched against item hrefs
 * @property {boolean} matchPrefix subroutes count as current ('/progress/week-2' → '/progress'); '/' is always exact
 * @property {NavItem[]} items
 */

/** @param {{id?: string, variant?: string, open?: boolean, current?: string, matchPrefix?: boolean, items?: any[]}} props @returns {NavState} */
export function getNavState(props = {}) {
  const rawId = props.id ?? 'sw-nav';
  const items = (Array.isArray(props.items) ? props.items : [])
    .filter((i) => i && typeof i.key === 'string' && typeof i.href === 'string')
    .map((i) => ({ key: i.key, label: String(i.label ?? i.key), href: i.href, ...(i.icon ? { icon: String(i.icon) } : {}), ...(i.group ? { group: String(i.group) } : {}) }));
  return {
    id: /^[A-Za-z][\w-]*$/.test(rawId) ? rawId : 'sw-nav',
    variant: props.variant === 'side' ? 'side' : 'top',
    open: Boolean(props.open),
    current: String(props.current ?? ''),
    matchPrefix: props.matchPrefix !== false,
    items,
  };
}

/**
 * The ONE current item (first match wins — two aria-current="page" is an AT lie, Ox §1).
 * Exact href match beats prefix match; '/' never prefix-matches.
 * @returns {NavItem|null}
 */
export function currentItem(state) {
  const exact = state.items.find((i) => i.href === state.current);
  if (exact) return exact;
  if (!state.matchPrefix) return null;
  const prefix = state.items
    .filter((i) => i.href !== '/' && state.current.startsWith(i.href.endsWith('/') ? i.href : i.href + '/'))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return prefix ?? null;
}

/**
 * Landmark attrs for the <nav>. Labels default PER VARIANT ('Primary' / 'Sidebar') so the
 * flagship shell (top + rail) never ships two identical landmarks (GLM N2 / Ox §1).
 */
export function getNavAttrs(state, label) {
  const resolved = label ?? (state.variant === 'side' ? 'Sidebar' : 'Primary');
  return { 'aria-label': resolved, class: `sw-nav sw-nav--${state.variant}${state.open ? ' is-open' : ''}`, 'data-variant': state.variant };
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

/** One link. aria-current marks the ONE current page — never a class alone, never two. */
export function getNavLinkAttrs(state, item) {
  const current = currentItem(state)?.key === item.key;
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
