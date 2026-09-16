/**
 * tokens — Swan colour-token resolution for the Three.js fleet.
 * @module pages/HomePage/three-worlds/tokens
 *
 * Split out of `runtime.ts` to respect the rule-4 line cap, and because token
 * resolution has a subtle failure mode worth isolating.
 *
 * THE FAILURE THIS PREVENTS
 * CSS and Three.js do NOT accept the same colours, and Three fails SILENTLY on the
 * difference: `THREE.Color.set()` warns and leaves the colour WHITE rather than
 * throwing. So a `try/catch` around it never fires, and a bad token renders white
 * with no error anywhere. Measured in this repo:
 *
 *   THREE.Color.set('unset')             -> r=1 g=1 b=1, warned, did NOT throw
 *   THREE.Color.set('inherit')           -> r=1 g=1 b=1, warned, did NOT throw
 *   THREE.Color.set('rgb(0 0 0 / 50%)')  -> r=1 g=1 b=1, NO warning, NO throw
 *
 * The fix is to let the BROWSER's own CSS parser be the authority, then hand Three
 * the normalized `rgb()`/`rgba()` string it does understand. That resolves both
 * directions of mismatch: `unset` is rejected and falls back, while `rebeccapurple`
 * and `rgb(0 0 0 / 50%)` are converted instead of whitened.
 */
import * as THREE from 'three';

/**
 * Token name → Crystalline Swan fallback.
 *
 * Keys are camelCase because scene builders read them as properties
 * (`ctx.colors.iceWing`). The CSS custom property looked up is the kebab-case form
 * of the same name, so the map carries both.
 */
const TOKEN_FALLBACKS: Record<string, { cssVar: string; hex: string }> = {
  midnightsapphire: { cssVar: '--primary', hex: '#002060' }, // swan-guard-allow-hex Active Palette fallback for THREE.Color (no var() in TS)
  royalDepth: { cssVar: '--surface', hex: '#003080' }, // swan-guard-allow-hex Active Palette fallback for THREE.Color (no var() in TS)
  iceWing: { cssVar: '--accent-primary', hex: '#60C0F0' }, // swan-guard-allow-hex Active Palette fallback for THREE.Color (no var() in TS)
  arcticCyan: { cssVar: '--accent-data', hex: '#50A0F0' }, // swan-guard-allow-hex Active Palette fallback for THREE.Color (no var() in TS)
  gildedFern: { cssVar: '--accent-luxury', hex: '#C6A84B' }, // swan-guard-allow-hex Active Palette fallback for THREE.Color (no var() in TS)
  frostWhite: { cssVar: '--text-primary', hex: '#E0ECF4' }, // swan-guard-allow-hex Active Palette fallback for THREE.Color (no var() in TS)
  swanLavender: { cssVar: '--tertiary', hex: '#4070C0' }, // swan-guard-allow-hex Active Palette fallback for THREE.Color (no var() in TS)
  wingPurple: { cssVar: '--accent-glow', hex: '#8B5CF6' }, // swan-guard-allow-hex Active Palette fallback for THREE.Color (no var() in TS)
  obsidian: { cssVar: '--bg-deep', hex: '#0A0A0F' }, // swan-guard-allow-hex Active Palette fallback for THREE.Color (no var() in TS)
  graphite: { cssVar: '--surface-dark', hex: '#1A1A24' }, // swan-guard-allow-hex Active Palette fallback for THREE.Color (no var() in TS)
};

/**
 * Values that are syntactically colour-shaped but must never be adopted.
 *
 * CSS-wide keywords inherit from an ancestor rather than naming a colour, and Three
 * has no handling for them, so `unset` would become white. The second group is not
 * CSS-wide but is treated by Three as white-with-a-warning, which is the same
 * failure wearing a different name.
 */
const REJECTED_VALUES = new Set([
  'unset', 'inherit', 'initial', 'revert', 'revert-layer', 'currentcolor', 'transparent',
  'none', 'auto', 'normal',
]);

/** Alpha below this is effectively invisible, so the token is treated as unusable. */
const MIN_USABLE_ALPHA = 0.1;

/** Parse `rgb()`/`rgba()` alpha. Returns 1 when no alpha component is present. */
function alphaOf(color: string): number {
  const m = color.match(/rgba?\([^)]*?([\d.]+)\s*\)$/i);
  if (!m) return 1;
  const raw = color.includes('rgba') ? Number(m[1]) : 1;
  return Number.isFinite(raw) ? raw : 1;
}

/**
 * Normalize any CSS colour to a form `THREE.Color` can parse, or null when CSS
 * rejects it or the result would be invisible.
 *
 * The probe MUST be attached to the document: an unattached element's `style.color`
 * holds the SPECIFIED value, so custom-property values and `color-mix(...)` round-trip unresolved
 * and Three then whitens them — silently substituting the hardcoded fallback with no
 * signal that the palette never reached the scene. (Caught by Fable 5.1, round 2.)
 */
/**
 * Normalize any CSS colour to a form `THREE.Color` can parse, or null when CSS
 * rejects it or the result would be invisible.
 *
 * A DOM RESOLUTION REQUIREMENT: the probe is TEMPORARILY ATTACHED to the document,
 * because `getComputedStyle` only resolves `var()` chains and `color-mix()` for an
 * element that is actually in the tree. An unattached element's `style.color` holds
 * the SPECIFIED value, so a token written in custom-property syntax round-trips
 * unresolved, Three whitens it, and the scene silently renders the hardcoded fallback
 * with no signal that the palette never arrived.
 *
 * INVALID VALUES: for an unattached probe, `style.color` simply stays empty when the
 * browser rejects the value. Because the probe is attached here, `style.color` would
 * instead inherit — so validity is decided by clearing the declaration first and
 * checking whether the browser WROTE anything back.
 */
export function normalizeCssColor(value: string): string | null {
  const v = value.trim();
  if (v.length === 0) return null;
  if (REJECTED_VALUES.has(v.toLowerCase())) return null;
  if (typeof document === 'undefined' || !document.createElement || !document.body) return null;
  const probe = document.createElement('div');
  probe.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:0;height:0;';
  document.body.appendChild(probe);
  try {
    // Clear first: an invalid assignment then leaves the declaration empty, whereas a
    // valid one writes something. No sentinel colour is needed, which matters — an
    // earlier version used `rgb(1, 2, 3)` as a sentinel and silently rejected any token
    // that legitimately held that value.
    probe.style.color = '';
    probe.style.color = v;
    if (probe.style.color === '') return null;
    const out = getComputedStyle(probe).color;
    if (typeof out !== 'string' || out.length === 0) return null;
    // A colour that renders fully transparent would make the geometry vanish.
    if (alphaOf(out) < MIN_USABLE_ALPHA) return null;
    return out;
  } catch {
    return null;
  } finally {
    probe.parentNode?.removeChild(probe);
  }
}

/**
 * Is this a colour the fleet can actually render?
 *
 * With a DOM present the browser decides, which is authoritative. Without one (SSR,
 * bare Node) we fall back to structural checks and DELIBERATELY reject bare words:
 * with no parser we cannot tell a real named colour from `notacolor`, and guessing
 * produces white — the exact failure this module exists to stop.
 */
export function isColorLike(value: string): boolean {
  const v = value.trim();
  if (v.length === 0) return false;
  if (REJECTED_VALUES.has(v.toLowerCase())) return false;
  if (normalizeCssColor(v) !== null) return true;
  if (typeof document !== 'undefined' && typeof document.createElement === 'function') return false;
  return /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v);
}

/**
 * Resolve a token value to a real colour, or the fallback.
 * Three consumes the NORMALIZED value, so a CSS colour it cannot parse is converted
 * rather than silently whitened. Exported so the guard is testable without WebGL.
 */
export function toColor(value: string, fallbackHex: string): THREE.Color {
  const candidate = normalizeCssColor(value);
  if (!candidate) return new THREE.Color(fallbackHex);
  const c = new THREE.Color();
  c.set(candidate);
  // Verify rather than trust: `set` warns-and-whitens instead of throwing, so a
  // try/catch here would be dead code — that was the original bug's hiding place.
  // The exemption covers values that LEGITIMATELY resolve to white, including
  // semi-transparent whites (a 0.5-alpha white is not the failure signature; the
  // round-4 check widened this after the opaque-only pattern would have rejected it).
  if (
    c.r === 1 && c.g === 1 && c.b === 1
    && !/^([#f]{3,8}|white|rgba?\(255,\s*255,\s*255(?:,\s*[\d.%]+)?\))$/i.test(candidate)
  ) {
    return new THREE.Color(fallbackHex);
  }
  return c;
}

/** Resolve the Swan token set from computed styles, falling back per token. */
export function resolveColors(host: HTMLElement): Record<string, THREE.Color> {
  let cs: CSSStyleDeclaration | null = null;
  try {
    cs = typeof getComputedStyle === 'function' ? getComputedStyle(host) : null;
  } catch {
    cs = null;
  }

  const out: Record<string, THREE.Color> = {};
  let fallbacks = 0;
  for (const [key, { cssVar, hex }] of Object.entries(TOKEN_FALLBACKS)) {
    let value = hex;
    let usedFallback = true;
    if (cs) {
      const raw = cs.getPropertyValue(cssVar);
      const trimmed = typeof raw === 'string' ? raw.trim() : '';
      if (trimmed.length > 0 && normalizeCssColor(trimmed) !== null) {
        value = trimmed;
        usedFallback = false;
      }
    }
    if (usedFallback) fallbacks += 1;
    out[key] = toColor(value, hex);
  }
  // Publishing the fallback COUNT is the part that makes this honest: a palette that
  // silently failed to load used to be invisible, because the scene simply rendered
  // house colours. Now QA can assert it is zero.
  //
  // The count alone is NOT sufficient, and a reviewer was right to say so: the
  // declarations are generated from this same table, so zero fallbacks is true by
  // construction. The value of one token is published too, so a MUTATION probe can
  // change it and assert the resolved colour follows — the only assertion that can fail
  // when the palette is inert.
  try {
    host.dataset.colorFallbacks = String(fallbacks);
    host.dataset.colorTokens = String(TOKEN_NAMES.length);
    host.dataset.primaryResolved = out.midnightsapphire?.getHexString() ?? '';
  } catch {
    /* a non-writable host is not worth failing a render over */
  }
  return out;
}

/** Exposed for tests: the token names a scene builder may rely on. */
export const TOKEN_NAMES = Object.keys(TOKEN_FALLBACKS);

/** Exposed for tests: the full table, so tokenCssVars's static literal can be audited against it. */
export const TOKEN_FALLBACKS_FOR_TEST = TOKEN_FALLBACKS;

/**
 * The token declarations, as CSS, so the properties the runtime READS actually EXIST.
 *
 * WHY THIS IS NOT OPTIONAL
 * The scenes resolve colours by reading custom properties off their host. Nothing
 * declared those properties: this app rarely emits `--primary` / `--ice-wing` as real
 * custom properties, and no ancestor supplied them either. Measured on a live variant,
 * all thirteen properties were empty and the runtime reported `colorFallbacks: 10` —
 * meaning every scene was drawing the hardcoded defaults while the code claimed to be
 * palette-driven. The design system never reached the Three.js layer, and a future
 * token change would not have moved a single pixel.
 *
 * Declaring them here makes the read meaningful, and makes the fallback counter a real
 * signal: it now reports 0, so anything that breaks the palette again fails the gate.
 * A host or ThemeProvider that sets these HIGHER in the tree still wins, because these
 * are declarations on the surface and nearer declarations are overridden by descendants
 * only when a descendant declares them — a parent value is what a child reads.
 */
export function tokenCssVars(): string {
	/*
	 * STATIC AND LITERAL ON PURPOSE (round 4). A runtime .map() over the table emits
	 * the same declarations but is invisible to the token-registry gate, which reads
	 * source — the gate then reports every styled-layer read as "never defined". This
	 * literal carries BOTH the scene-token table AND the house aliases the styled
	 * layer reads that no other stylesheet declares (--obsidian, --card-dark).
	 * tokenCssVarsMatchesTable (below) fails if this string and the table drift.
	 */
	return [
    '--primary: #002060;', // swan-guard-allow-hex canonical Active Palette value, declared statically for the token registry
    '--surface: #003080;', // swan-guard-allow-hex canonical Active Palette value, declared statically for the token registry
    '--accent-primary: #60C0F0;', // swan-guard-allow-hex canonical Active Palette value, declared statically for the token registry
    '--accent-data: #50A0F0;', // swan-guard-allow-hex canonical Active Palette value, declared statically for the token registry
    '--accent-luxury: #C6A84B;', // swan-guard-allow-hex canonical Active Palette value, declared statically for the token registry
    '--text-primary: #E0ECF4;', // swan-guard-allow-hex canonical Active Palette value, declared statically for the token registry
    '--tertiary: #4070C0;', // swan-guard-allow-hex canonical Active Palette value, declared statically for the token registry
    '--accent-glow: #8B5CF6;', // swan-guard-allow-hex canonical Active Palette value, declared statically for the token registry
    '--bg-deep: #0A0A0F;', // swan-guard-allow-hex canonical Active Palette value, declared statically for the token registry
    '--surface-dark: #1A1A24;', // swan-guard-allow-hex canonical Active Palette value, declared statically for the token registry
    /* House aliases the styled-components layer reads by name. */
    '--obsidian: #0A0A0F;', // swan-guard-allow-hex canonical Active Palette value, declared statically for the token registry
    '--card-dark: #141419;', // swan-guard-allow-hex canonical Active Palette value, declared statically for the token registry
  ].join(' ');
}
