/**
 * ============================================================================
 * FILE: ExerciseCardCircuit.styles.ts
 * PURPOSE: Visual chrome for the circuit / superset / drop-set structure on the
 *          workout logger — the grouping fields on the exercise card and the
 *          set-type controls on each set row.
 *
 * WHY SEPARATE: extracted from ExerciseCardComponent.styles.ts (SWA-225 slice 4),
 * which sat at 312 lines against the 300-line cap in CLAUDE.md rule 4. This is a
 * real seam, not line-shaving: these four are the chrome for one feature — the
 * circuit/drop-set structure behind migration
 * 20260828000001-add-workout-log-circuit-fields — and they had TWO consumers.
 * SetStructureFields in particular is rendered by ExerciseSetRowComponent, which
 * previously had to reach into the *card's* style module to get it. Giving the
 * feature its own module removes that cross-component coupling.
 *
 * Mirrors the sibling precedent ExerciseSetRowControls.styles.ts.
 * Tokens only — Crystalline Swan via CS + withAlpha, never raw rgba (rule 6).
 * ============================================================================
 */
import styled from 'styled-components';
import { CS, withAlpha } from './WorkoutLoggerCS';

export const CircuitFields = styled.div`
  display: grid;
  grid-template-columns: minmax(180px, 2fr) minmax(90px, 0.7fr) minmax(160px, 1fr);
  gap: 0.75rem;
  margin: -0.5rem 0 1rem;

  label {
    display: grid;
    gap: 0.35rem;
    color: ${CS.textSecondary};
    font: 600 0.75rem 'Sora', sans-serif;
  }

  input, select {
    box-sizing: border-box;
    min-height: 44px;
    width: 100%;
    border: 1px solid ${withAlpha(CS.glow, 0.28)};
    border-radius: 0.55rem;
    background: ${withAlpha(CS.bgDeep, 0.72)};
    color: ${CS.text};
    padding: 0.6rem 0.75rem;
  }

  @media (max-width: 700px) { grid-template-columns: 1fr; }
`;

export const SetStructureFields = styled.div`
  display: grid;
  grid-template-columns: minmax(150px, 1fr) minmax(160px, 1fr);
  gap: 0.75rem;
  padding: 0.45rem 0 0.8rem 50px;

  label { color: ${CS.textSecondary}; font: 600 0.72rem 'Sora', sans-serif; }
  select, input {
    min-height: 44px;
    width: 100%;
    margin-top: 0.3rem;
    border: 1px solid ${withAlpha(CS.gaming, 0.28)};
    border-radius: 0.5rem;
    background: ${withAlpha(CS.bgDeep, 0.72)};
    color: ${CS.text};
    padding: 0.55rem;
  }
  @media (max-width: 620px) { grid-template-columns: 1fr; padding-left: 0; }
`;

export const SupersetBadge = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: 'Fira Code', monospace;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  padding: 0.125rem 0.5rem;
  margin-left: 0.5rem;
  border-radius: 999px;
  background: ${withAlpha(CS.secondary, 0.15)};
  color: ${CS.gaming};
  border: 1px solid ${withAlpha(CS.secondary, 0.3)};
  text-transform: uppercase;
`;

/* Phase 3c.2: link/unlink-with-previous superset control (44px target). */

export const SupersetLinkButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-height: 44px;
  min-width: 44px;
  margin-top: 0.25rem;
  padding: 0 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 10px;
  cursor: pointer;
  background: transparent;
  color: ${CS.gaming};
  border: 1px solid ${withAlpha(CS.secondary, 0.35)};

  &[aria-pressed='true'] {
    background: ${withAlpha(CS.secondary, 0.18)};
  }

  &:focus-visible {
    outline: 2px solid ${CS.secondary};
    outline-offset: 2px;
  }
`;
