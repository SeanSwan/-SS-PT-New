/**
 * CrystallizeOverlay — Swan Lens C4 sheen + live-region overlay (Slice 2 / §2.3).
 *
 * Portals to <body> (outside #root, so the desk/lap root-scale rule never re-contains the sheen).
 * Always mounts a visually-hidden aria-live region (announcements fire on the static path too);
 * the sheen div mounts only during an animated transition. Transform/opacity ONLY. Keyframe-based
 * (deterministic start on mount + on the charging→settling flip; `both` fill keeps the commit seam
 * visually continuous). Reduced-motion never reaches here (the controller resolves to `static`).
 *
 * z-index: --world-z-* are unratified Lane-A proposals (§3.C), so an INTERIM documented constant is
 * used — 300, below modal(400)/toast(500). One-line swap to var(--world-z-overlay) on ratification.
 */
import { createPortal } from 'react-dom';
import { createGlobalStyle } from 'styled-components';
import type { CrystallizeOverlayProps } from './useCrystallizeTransition';

export const CRYSTALLIZE_OVERLAY_Z = 300;

// Exported as a string for the test CSS-property gate (§2.6 test 2). The z value is interpolated
// from the single-source constant so no bare z-index literal is authored twice.
// Timing is read from the html-scoped `--lens-crystallize-*` vars the CONTROLLER sets during a
// transition (inherited down to the body-portaled sheen) — no inline style on the sheen div (repo
// bans inline style={{}}). The visually-hidden live region is a class, not inline style.
export const crystallizeOverlayCss = `
  .lens-crystallize-live {
    position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
    overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
  }
  .lens-crystallize-sheen {
    position: fixed; top: 0; bottom: 0; left: 0;
    z-index: ${CRYSTALLIZE_OVERLAY_Z};
    pointer-events: none; opacity: 0; will-change: opacity, transform;
    background: var(--lens-fx-crystallize-sheen, linear-gradient(105deg, transparent 40%, rgba(143,232,255,0.14) 50%, transparent 60%));
  }
  .lens-crystallize-sheen[data-variant='sweep'] { width: 160%; }
  .lens-crystallize-sheen[data-variant='fade'] { right: 0; }

  @keyframes crystallizeChargeSweep { from { opacity: 0; transform: translateX(-30%); } to { opacity: 1; transform: translateX(0); } }
  @keyframes crystallizeSettleSweep { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(30%); } }
  @keyframes crystallizeChargeFade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes crystallizeSettleFade { from { opacity: 1; } to { opacity: 0; } }

  .lens-crystallize-sheen[data-phase='charging'][data-variant='sweep'] {
    animation: crystallizeChargeSweep var(--lens-crystallize-charge-ms, 120ms) var(--lens-ease-crystallize, cubic-bezier(0.16,1,0.3,1)) both;
  }
  .lens-crystallize-sheen[data-phase='settling'][data-variant='sweep'] {
    animation: crystallizeSettleSweep var(--lens-crystallize-settle-ms, 360ms) var(--lens-ease-crystallize, cubic-bezier(0.16,1,0.3,1)) both;
  }
  .lens-crystallize-sheen[data-phase='charging'][data-variant='fade'] {
    animation: crystallizeChargeFade var(--lens-crystallize-charge-ms, 100ms) var(--lens-ease-crystallize, cubic-bezier(0.16,1,0.3,1)) both;
  }
  .lens-crystallize-sheen[data-phase='settling'][data-variant='fade'] {
    animation: crystallizeSettleFade var(--lens-crystallize-settle-ms, 220ms) var(--lens-ease-crystallize, cubic-bezier(0.16,1,0.3,1)) both;
  }
`;

const CrystallizeGlobalStyle = createGlobalStyle`${crystallizeOverlayCss}`;

export function CrystallizeOverlay({
  phase,
  variant,
  announcement,
}: CrystallizeOverlayProps): React.ReactPortal | null {
  if (typeof document === 'undefined') return null;
  const showSheen = phase !== 'idle' && variant !== 'static';
  return createPortal(
    <>
      <CrystallizeGlobalStyle />
      <div aria-live="polite" className="lens-crystallize-live">
        {announcement}
      </div>
      {showSheen && (
        <div className="lens-crystallize-sheen" aria-hidden="true" data-phase={phase} data-variant={variant} />
      )}
    </>,
    document.body,
  );
}
