/**
 * ProofCardShell.styles.ts — C12 SheenCard chrome for the handoff proof zone (Convergence v1).
 * ---------------------------------------------------------------------------------------------
 * The 2026-07-21 completion-blueprint's P1 "branded shareable proof card" applied to the EXISTING
 * Post-Save Handoff surface (Sean's convergence ruling — one canonical terminal surface, one flag).
 * Sapphire glass over card-dark, Ice-Wing→Gilded chrome border, one reveal + one sheen sweep: the
 * screen's single narrative motion beat, fully reduced-motion-gated (static designed state otherwise).
 * Rule 6: every color is var(--token, fallback). Rule 43: keyframes referenced only inside css``.
 */
import styled, { keyframes, css } from 'styled-components';

const cardReveal = keyframes`
  from { opacity: 0; transform: translate3d(0, 8px, 0) scale(0.97); }
  to   { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
`;

/* One sweep, left→right, then done — runs once ~when the reveal settles. */
const sheenSweep = keyframes`
  from { transform: translateX(-140%) skewX(-18deg); }
  to   { transform: translateX(340%) skewX(-18deg); }
`;

const motionSafe = (rules: ReturnType<typeof css>) => css`
  @media (prefers-reduced-motion: no-preference) { ${rules} }
`;

export const ProofCardShell = styled.div`
  position: relative;
  overflow: hidden;
  border-radius: 20px;
  padding: 18px 20px 14px;
  background:
    linear-gradient(
      160deg,
      color-mix(in srgb, var(--surface-elevated, #003080) 92%, transparent),
      color-mix(in srgb, var(--midnight-sapphire, #002060) 92%, transparent)
    ),
    var(--surface-card, #141419);
  /* Inner glass highlight (top hairline) + ambient depth. */
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--text-primary, #E0ECF4) 12%, transparent),
    0 24px 64px color-mix(in srgb, var(--midnight-sapphire, #002060) 55%, transparent);
  ${motionSafe(css`animation: ${cardReveal} 480ms cubic-bezier(0.16, 1, 0.3, 1) 140ms both;`)}

  /* Chrome border: Ice Wing → transparent → Gilded Fern, drawn as a masked 1px ring so the
     gradient follows the radius (border-image ignores border-radius). */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1px;
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--accent-primary, #60C0F0) 40%, transparent),
      transparent 45%,
      color-mix(in srgb, var(--accent-gold, #C6A84B) 30%, transparent)
    );
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask-composite: exclude;
    pointer-events: none;
  }

  /* The single sheen sweep — a narrow frost stripe crossing once. Hidden entirely under RM. */
  &::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 34%;
    background: linear-gradient(
      100deg,
      transparent,
      color-mix(in srgb, var(--text-primary, #E0ECF4) 9%, transparent),
      transparent
    );
    transform: translateX(-140%) skewX(-18deg);
    pointer-events: none;
    ${motionSafe(css`animation: ${sheenSweep} 700ms ease-out 520ms 1 both;`)}
  }
`;

/* ── Card chrome row: brand wordmark left, owner handle right ── */
export const ChromeRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 12px;
`;

export const ChromeBrand = styled.span`
  font-family: 'Sora', system-ui, sans-serif;
  font-weight: 600;
  font-size: 0.625rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-primary-85, rgba(224, 236, 244, 0.85));
`;

export const ChromeHandle = styled.span`
  font-family: 'Sora', system-ui, sans-serif;
  font-size: 0.6875rem;
  letter-spacing: 0.04em;
  color: var(--text-primary-70, rgba(224, 236, 244, 0.7));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 55%;
`;

/* ── Card footer hairline: save date — brands screenshots without shouting ── */
export const CardDateLine = styled.p`
  font-family: 'Sora', system-ui, sans-serif;
  font-size: 0.625rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin: 12px 0 0;
  color: var(--text-primary-60, rgba(224, 236, 244, 0.6));
`;
