/**
 * CrystallizeRecord — the ownable signature: an executed action condenses into a
 * faceted crystalline record.
 *
 * LAW 5 says every execution (a logged set, a finished workout, a PR) records
 * through the Crystallize, and that nothing else celebrates. Until now the law
 * described something that did not exist: `useCrystallizeTransition` is the
 * settings/appearance theme-switch transition (CRYSTALLIZE_SURFACE_ID =
 * 'settings.appearance'), and the only execution feedback in the product was
 * CelebrationBurst — which fires on PR/first/streak and stays silent for every
 * ordinary save. So an ordinary save recorded nothing at all.
 *
 * This is the record artifact. The chip appears on EVERY save; the burst stays
 * the PR bloom on top of it. One celebration, one name.
 *
 * States: pending -> forming -> formed -> resting (LAW 5).
 * Motion: transform + opacity only, ~400ms, GPU-safe.
 * Numerals: tabular-nums, always — a settling number must not reflow.
 * PR: gold on the numeral and its delta. That is gold allowlist slot 1, and it
 * is the only gold this component can render (LAW 2).
 * Reduced motion: mounts at the settled frame with no transition — the JS half
 * of the guard, not only the CSS half (LAW 5 REFINEMENT 1).
 *
 * @module adapters/style-lens-swan/motion/CrystallizeRecord
 */
import React, { useState } from 'react';
import styled, { css } from 'styled-components';

export type CrystallizeRecordPhase = 'pending' | 'forming' | 'formed' | 'resting';

export interface CrystallizeRecordProps {
  phase: CrystallizeRecordPhase;
  /** What was recorded, in the member's language ("Set logged", "Saved locally"). */
  label: string;
  /** The numeral, if this record has one ("5 × 185 lb"). */
  value?: string;
  /** Personal record — earns the gold numeral + delta. */
  isPR?: boolean;
  /** The delta that made it a PR ("+10 lb"). Rendered only with isPR. */
  delta?: string;
  /** Test hook for the surface contract. */
  testId?: string;
}

/** Fail-closed reduced-motion read: matchMedia absent or throwing → reduce. */
const prefersReducedMotion = (): boolean => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return true;
  }
};

const FACETS = 'polygon(6% 0%, 94% 0%, 100% 26%, 100% 74%, 94% 100%, 6% 100%, 0% 74%, 0% 26%)';

const phaseStyles = {
  pending: css`
    opacity: 0.6;
    transform: scale(0.98);
    background: transparent;
  `,
  forming: css`
    opacity: 0.85;
    transform: scale(0.995);
  `,
  formed: css`
    opacity: 1;
    transform: scale(1);
  `,
  resting: css`
    opacity: 1;
    transform: scale(1);
  `,
} as const;

const Chip = styled.div<{ $phase: CrystallizeRecordPhase; $animate: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 8px 18px;
  clip-path: ${FACETS};
  /* No border property: clip-path cuts a border at every facet vertex, so the
     edge this component is named for would render broken at each cut. An inset
     ring draws the facet edge INSIDE the clip, where the clip cannot reach it. */
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent-primary, #60C0F0) 34%, transparent);
  background:
    linear-gradient(140deg,
      color-mix(in srgb, var(--bg-elevated, #141419) 78%, transparent),
      color-mix(in srgb, var(--bg-base, #0A0A0F) 92%, transparent)),
    var(--bg-elevated, #141419);
  color: var(--text-primary, #E0ECF4);
  font-family: var(--font-ui, 'Sora', sans-serif);
  font-size: 0.82rem;
  will-change: transform, opacity;
  ${({ $phase }) => phaseStyles[$phase]}
  ${({ $animate }) =>
    $animate
      ? css`
          transition: opacity 400ms ease-out, transform 400ms ease-out;
        `
      : css`
          transition: none;
        `}

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const Label = styled.span`
  opacity: 0.78;
  letter-spacing: 0.02em;
`;

const Value = styled.span<{ $pr: boolean }>`
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  color: ${({ $pr }) => ($pr ? 'var(--gilded-fern, #C6A84B)' : 'var(--text-primary, #E0ECF4)')};
`;

const Delta = styled.span`
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  color: var(--gilded-fern, #C6A84B);
`;

const CrystallizeRecord: React.FC<CrystallizeRecordProps> = ({
  phase,
  label,
  value,
  isPR = false,
  delta,
  testId,
}) => {
  // Lazy initialiser: the preference is read during the FIRST render, not in an
  // effect after it. Reading it after mount painted the settled frame and then
  // animated backward into pending/forming for every non-reduced-motion user —
  // a reverse animation on every save. Still fails closed: prefersReducedMotion
  // returns true when matchMedia is absent or throws.
  const [reduced] = useState<boolean>(prefersReducedMotion);

  const effectivePhase: CrystallizeRecordPhase = reduced ? 'resting' : phase;

  return (
    <Chip
      $phase={effectivePhase}
      $animate={!reduced}
      data-phase={effectivePhase}
      data-testid={testId}
      role="status"
      aria-live="polite"
    >
      <Label>{label}</Label>
      {value ? <Value $pr={isPR}>{value}</Value> : null}
      {isPR && delta ? <Delta>{delta}</Delta> : null}
    </Chip>
  );
};

export default CrystallizeRecord;
