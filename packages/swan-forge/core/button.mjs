/**
 * @swan/forge — headless Button core (tier: behavior — written once, never forked).
 * Framework-agnostic: returns attribute maps + state transitions; bindings (React etc.)
 * spread the result onto their element. No DOM access, no styling, no dependencies.
 *
 * Core-invariant (plan §11.A1): keyboard behavior and focusability live HERE.
 * Variants/packs may change structure/looks, never these semantics.
 */

/** Canonical variants — mirrors the original GlowButton's Crystalline set. */
export const BUTTON_VARIANTS = /** @type {const} */ ([
  'primary', 'accent', 'gilded', 'success', 'danger', 'ghost',
]);

/** Legacy alias map preserved from GlowButton (84 consumers depend on these names). */
export const LEGACY_VARIANT_MAP = Object.freeze({
  neonBlue: 'accent',
  purple: 'primary',
  emerald: 'success',
  ruby: 'danger',
  cosmic: 'primary',
  cosmicGradient: 'primary',
  cyan: 'accent',
  red: 'danger',
});

export const BUTTON_SIZES = /** @type {const} */ (['small', 'medium', 'large']);

/**
 * Resolve any variant name (canonical or legacy) to a canonical variant.
 * Unknown names resolve to 'primary' (never throw in a render path).
 * @param {string|undefined} v
 * @returns {string}
 */
export function resolveVariant(v) {
  if (!v) return 'primary';
  if (BUTTON_VARIANTS.includes(/** @type {any} */ (v))) return v;
  return LEGACY_VARIANT_MAP[/** @type {keyof typeof LEGACY_VARIANT_MAP} */ (v)] ?? 'primary';
}

/**
 * @typedef {Object} ButtonState
 * @property {string} variant   canonical variant
 * @property {string} size      'small' | 'medium' | 'large'
 * @property {string} type      'button' | 'submit' | 'reset'
 * @property {boolean} disabled
 * @property {boolean} loading
 * @property {boolean} fullWidth
 */

/**
 * Build the button's state from raw props (framework-agnostic normalization).
 * @param {{variant?: string, theme?: string, colorScheme?: string, size?: string, type?: string,
 *          disabled?: boolean, isLoading?: boolean, loading?: boolean, fullWidth?: boolean}} props
 * @returns {ButtonState}
 */
export function getButtonState(props = {}) {
  const rawVariant = props.variant ?? props.theme ?? props.colorScheme;
  const size = BUTTON_SIZES.includes(/** @type {any} */ (props.size)) ? /** @type {string} */ (props.size) : 'medium';
  return {
    variant: resolveVariant(rawVariant),
    size,
    type: props.type === 'submit' || props.type === 'reset' ? props.type : 'button',
    disabled: Boolean(props.disabled),
    loading: Boolean(props.isLoading ?? props.loading),
    fullWidth: Boolean(props.fullWidth),
  };
}

/**
 * Attribute map for the root <button> element. Spread onto the element/JSX.
 * A loading button stays focusable (aria-disabled) so focus is not dropped mid-action;
 * a disabled button uses the native disabled attribute.
 * @param {ButtonState} state
 * @returns {Record<string, string|boolean|undefined>}
 */
export function getButtonAttrs(state) {
  const classes = [
    'sw-btn',
    `sw-btn--${state.variant}`,
    `sw-btn--${state.size}`,
    state.loading ? 'is-loading' : '',
    state.fullWidth ? 'is-full' : '',
  ].filter(Boolean).join(' ');
  return {
    type: state.type ?? 'button',
    class: classes,
    disabled: state.disabled && !state.loading ? true : undefined,
    'aria-disabled': state.loading ? 'true' : undefined,
    'aria-busy': state.loading ? 'true' : undefined,
    'data-variant': state.variant,
  };
}

/**
 * Guard a click/keyboard activation: returns true when the action may fire.
 * (Native <button> handles Enter/Space; this guards loading/disabled re-entry.)
 * @param {ButtonState} state
 * @returns {boolean}
 */
export function canActivate(state) {
  return !state.disabled && !state.loading;
}
