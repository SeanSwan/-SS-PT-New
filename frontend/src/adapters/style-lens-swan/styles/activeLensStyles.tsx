/**
 * Swan Lens — active-only style injection (S1-C / KIMI-SWAN-LENS-S1C §4 + §6).
 *
 * Renders always-present CORE + only the lens style component(s) for the `data-style-lens` ids
 * actually present in the document (committed on <html> + any live ScopedLensFrame previews —
 * the subtree UNION, §4). Replaces the ~28-lens monolith: at most `1 core + N present-lens`
 * styles are ever in the DOM (N=1 in the common case, ≤2 with a preview open).
 *
 * Cascade order (§3, load-bearing): lens component(s) render FIRST, core LAST, inside a fragment
 * keyed by the resolved id-set — so on any change the pair remounts and styled-components inserts
 * lens-before-core in the sheet, preserving the monolith's density-over-lens outcome at equal
 * specificity. `:where(:root)` core defaults are zero-specificity and lose to every lens block.
 *
 * Note: this file is `.tsx` (not the blueprint's `.ts`) because it renders JSX — the shell import
 * (`./styles/activeLensStyles`) resolves either extension, so no consumer changes.
 */
import { Fragment, type ComponentType, type ReactElement } from 'react';
import { useSyncExternalStore } from 'react';
import { LENS_STYLE_ALLOWLIST } from './lenses';
import { LensCoreGlobalStyles } from './lensCoreStyles';

const hasOwn = (obj: object, key: string): boolean => Object.prototype.hasOwnProperty.call(obj, key);

/**
 * Pure selection: from the ids present in the DOM, keep only those with a style component
 * (active-only; unknown ids dropped → they render core-only). Order preserved from input.
 * `hasOwn` (not `in`) so an id like "toString"/"constructor" can never resolve a prototype key.
 */
export function selectActiveLensIds(presentIds: readonly string[]): string[] {
  return presentIds.filter((id) => hasOwn(LENS_STYLE_ALLOWLIST, id));
}

/**
 * Cascade-order lock (§3): lens component(s) FIRST, core LAST. styled-components inserts in tree
 * order, so lens sheets precede core → the monolith's density-over-lens outcome is preserved at
 * equal specificity. The unit test asserts core is the final element; the pixel-level computed
 * cascade is verified by the deferred Playwright pass (Kimi §11.4).
 */
export function orderedLensStyleComponents(knownIds: readonly string[]): ComponentType[] {
  return [...knownIds.map((id) => LENS_STYLE_ALLOWLIST[id]), LensCoreGlobalStyles];
}

// Module-level cache so getSnapshot returns a referentially-stable string between mutations
// (a fresh string every call would loop useSyncExternalStore).
let cachedSnapshot = '';

function computeSnapshot(): string {
  if (typeof document === 'undefined') return '';
  const ids = Array.from(document.querySelectorAll('[data-style-lens]'))
    .map((el) => el.getAttribute('data-style-lens'))
    .filter((v): v is string => Boolean(v));
  const next = Array.from(new Set(ids)).sort().join('\n');
  if (next !== cachedSnapshot) cachedSnapshot = next;
  return cachedSnapshot;
}

// Only notify when a data-style-lens attribute changed OR a node carrying/containing one was
// added/removed — so the whole-document observer doesn't wake React on every unrelated DOM mutation.
function recordsAreRelevant(records: MutationRecord[]): boolean {
  return records.some((record) => {
    if (record.type === 'attributes') return true; // attributeFilter already scopes to data-style-lens
    const touchesLens = (nodes: NodeList): boolean =>
      Array.from(nodes).some(
        (node) =>
          node instanceof Element &&
          (node.matches('[data-style-lens]') || node.querySelector('[data-style-lens]') !== null),
      );
    return touchesLens(record.addedNodes) || touchesLens(record.removedNodes);
  });
}

function subscribe(onChange: () => void): () => void {
  if (typeof document === 'undefined') return () => undefined;
  const observer = new MutationObserver((records) => {
    if (recordsAreRelevant(records)) onChange();
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-style-lens'],
    childList: true,
    subtree: true,
  });
  return () => observer.disconnect();
}

/** Dedup'd, sorted list of every `data-style-lens` id present in the document. */
export function useStyleLensIds(): readonly string[] {
  const snapshot = useSyncExternalStore(subscribe, computeSnapshot, () => '');
  return snapshot ? snapshot.split('\n') : [];
}

const warnedIds = new Set<string>();
function warnOncePerUnknownId(ids: readonly string[], known: readonly string[]): void {
  if (typeof console === 'undefined') return;
  for (const id of ids) {
    if (!known.includes(id) && !warnedIds.has(id)) {
      warnedIds.add(id);
      // eslint-disable-next-line no-console
      console.warn(`[SwanLens] unknown style-lens id "${id}" — rendering core-only.`);
    }
  }
}

/** Test-only: reset the warn-once memo so per-test assertions are deterministic. */
export function __resetUnknownIdWarnings(): void {
  warnedIds.clear();
}

export function ActiveLensGlobalStyles(): ReactElement {
  const ids = useStyleLensIds();
  const known = selectActiveLensIds(ids);
  if (process.env.NODE_ENV !== 'production') warnOncePerUnknownId(ids, known);
  // CORE is inside the keyed fragment DELIBERATELY (lens-first, core-last): on a lens change the
  // pair remounts so styled-components re-inserts lens-then-core, keeping the monolith's
  // density-over-lens outcome at equal specificity (§3). Rendering core OUTSIDE the fragment
  // (always-mounted-first) would reverse that — lens rules would then win over the [data-density]
  // block, so a compact-density user would lose compact padding on any lens that sets it.
  // Triangle P1 (Gemini): the core remount is NOT a visible flicker — React applies all commit-phase
  // DOM mutations (styled-components injects via useInsertionEffect) BEFORE the browser paints and
  // before any layout effect reads getComputedStyle, so no frame or measurement ever observes the
  // --console-* skin absent. Empirical no-flicker + computed-cascade verification is the deferred
  // Playwright pass (Kimi §11.4); Codex's injection review found no blocker here.
  return (
    <Fragment key={known.length ? known.join('|') : 'core-only'}>
      {known.map((id) => {
        const LensStyles = LENS_STYLE_ALLOWLIST[id];
        return <LensStyles key={id} />;
      })}
      <LensCoreGlobalStyles />
    </Fragment>
  );
}
