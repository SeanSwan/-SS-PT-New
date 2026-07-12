/**
 * ============================================================================
 * SWAN DEVICE MATRIX — GRID ENGINE (styled-components adapter)
 * ============================================================================
 * The one file in device-matrix with a peer dependency (styled-components).
 * Container-query-first grid primitives that stay pixel-true across the
 * P1–P12 buckets and blend with the Style Lens runtime: gaps and radii
 * read the `--lens-*` custom properties (with Crystalline fallbacks) so a
 * committed Style Lens re-tunes every SwanGrid without a single re-render.
 *
 * DOCTRINE (from SWAN-CINEMATIC-DESIGN-SYSTEM.md):
 *  - Grid must break — presets are asymmetric; `repeat(N, 1fr)` is not
 *    offered as a preset on purpose.
 *  - Grids respond to their CONTAINER (container queries), not the
 *    viewport, so the same component is correct in a full page, a modal,
 *    or a Style Lens compare panel at half width.
 *  - Every preset collapses to a single readable column by the P12 floor.
 * ============================================================================
 */

import styled, { css } from 'styled-components';
import { media } from './media';

/** Modular spacing scale (design-system vertical rhythm, px). */
export const GRID_SPACE = [4, 8, 12, 16, 24, 32, 48, 72, 108, 160, 240] as const;

/**
 * Lens-aware gap: a committed Style Lens may widen/tighten shell rhythm
 * via --lens-shell-gap; the clamp keeps phone gaps honest.
 */
export const lensGap = css`
  gap: max(var(--lens-shell-gap, 0px), clamp(12px, 1.6vw, 24px));
`;

/** Lens-aware panel chrome for grid children that want the house surface. */
export const lensPanel = css`
  background: linear-gradient(
    135deg,
    rgba(20, 20, 25, 0.85),
    rgba(26, 26, 36, 0.75)
  );
  border: 1px solid rgba(96, 192, 240, 0.1);
  border-radius: var(--lens-panel-radius, 16px);
`;

export type SwanGridPreset = 'editorial' | 'console' | 'rail' | 'fluid';

/**
 * Asymmetric templates. Named areas keep call sites semantic:
 *  editorial → lede | body | margin   (reading surfaces, detail pages)
 *  console   → focus | flank + band   (operator dashboards, 2026 gate)
 *  rail      → rail | canvas          (pickers, catalogs, master-detail)
 *  fluid     → auto-fit cards with a real minimum, never equal-4-up
 */
const PRESETS: Record<SwanGridPreset, ReturnType<typeof css>> = {
  editorial: css`
    grid-template-columns: minmax(180px, 2fr) minmax(320px, 5fr) minmax(120px, 1fr);
    grid-template-areas: 'lede body margin';
  `,
  console: css`
    grid-template-columns: minmax(380px, 8fr) minmax(240px, 3fr);
    grid-template-areas:
      'focus flank'
      'band  band';
  `,
  rail: css`
    grid-template-columns: minmax(220px, 3fr) minmax(360px, 7fr);
    grid-template-areas: 'rail canvas';
  `,
  fluid: css`
    grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
  `,
};

/** Container-scoped collapse: below this container width, go single column. */
const COLLAPSE = css<{ $collapseAt?: number }>`
  @container swan-grid (max-width: ${({ $collapseAt = 720 }) => $collapseAt}px) {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: none;

    & > * {
      grid-area: auto;
    }
  }
`;

/**
 * SwanGridFrame — the outer boundary that names the containment context.
 * Wrap a page region once; every SwanGrid inside responds to it.
 */
export const SwanGridFrame = styled.div`
  container-type: inline-size;
  container-name: swan-grid;
  width: 100%;
`;

/**
 * SwanGrid — asymmetric, container-query responsive, lens-aware.
 *
 *   <SwanGridFrame>
 *     <SwanGrid $preset="console" $collapseAt={760}>
 *       <section style={{ gridArea: 'focus' }} />
 *       <aside style={{ gridArea: 'flank' }} />
 *       <footer style={{ gridArea: 'band' }} />
 *     </SwanGrid>
 *   </SwanGridFrame>
 */
export const SwanGrid = styled.div<{
  $preset?: SwanGridPreset;
  $collapseAt?: number;
}>`
  display: grid;
  ${lensGap};
  align-items: start;
  min-width: 0;

  & > * {
    min-width: 0;
  }

  ${({ $preset = 'fluid' }) => PRESETS[$preset]};
  ${COLLAPSE};

  /* Viewport backstop for browsers without container queries (very old):
     phone widths always collapse to one column. */
  ${media.max(452)} {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: none;

    & > * {
      grid-area: auto;
    }
  }
`;

/**
 * Bucket-scoped template areas for bespoke compositions:
 *
 *   ${bucketAreas({
 *     P1: `'hero hero' 'list detail'`,
 *     P12: `'hero' 'list' 'detail'`,
 *   })}
 */
export const bucketAreas = (
  areasByBucket: Partial<Record<string, string>>,
) => css`
  ${Object.entries(areasByBucket).map(
    ([bucketId, areas]) => css`
      ${media.bucket(bucketId)} {
        grid-template-areas: ${areas};
      }
    `,
  )}
`;
