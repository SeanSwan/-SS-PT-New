/**
 * Periodized plan controls and mesocycle styles for the active Workout Planner.
 * Re-exported by WorkoutPlannerStyles.ts for compatibility.
 */
import styled from 'styled-components';
import { PLANNER_GOLD, plannerGoldAlpha } from './plannerGold';

// SECTION: Plan Mode Controls
// PURPOSE: Duration, sessions/week selectors for multi-week plan generation
// ─────────────────────────────────────────────────────────────
export const PlanModeBar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bg-surface, #1A1A24);
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, transparent);
  border-radius: 10px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`;

export const PlanModeLabel = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--accent-secondary, #8B5CF6);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
`;

export const SmallSelect = styled.select`
  background: var(--bg-base, #030712);
  border: 1px solid rgba(96, 192, 240, 0.15);
  border-radius: 8px;
  padding: 6px 28px 6px 10px;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  min-height: 44px;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2360C0F0' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;

  &:focus {
    outline: none;
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 8px color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Mesocycle Display
// PURPOSE: Visual timeline of periodized training blocks
// ─────────────────────────────────────────────────────────────
export const MesocycleSection = styled.div`
  margin-top: 24px;
`;

export const MesocycleSectionTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin: 0 0 16px 0;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

export const MesocycleGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
`;

export const MesocycleCard = styled.div<{ $phase: number }>`
  background: var(--bg-surface, #1A1A24);
  border: 1px solid ${({ $phase }) =>
    $phase <= 2 ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent)' :
    $phase <= 3 ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent)' :
    $phase === 4 ? plannerGoldAlpha(0.2) :
    'color-mix(in srgb, var(--danger, #C92A54) 20%, transparent)'
  };
  border-radius: 12px;
  padding: 16px;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${({ $phase }) =>
      $phase <= 2 ? 'var(--accent-primary, #60C0F0)' :
      $phase <= 3 ? 'var(--accent-secondary, #8B5CF6)' :
      $phase === 4 ? PLANNER_GOLD :
      'var(--danger, #C92A54)'
    };
  }
`;

export const MesocycleHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`;

export const MesocycleTitle = styled.span`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
`;

export const MesocycleWeeks = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  color: var(--accent-primary, #60C0F0);
  padding: 2px 8px;
  background: rgba(96, 192, 240, 0.08);
  border-radius: 6px;
`;

export const MesocyclePhase = styled.div<{ $phase: number }>`
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  font-weight: 600;
  color: ${({ $phase }) =>
    $phase <= 2 ? 'var(--accent-primary, #60C0F0)' :
    $phase <= 3 ? 'var(--accent-secondary, #8B5CF6)' :
    $phase === 4 ? PLANNER_GOLD :
    'var(--danger, #C92A54)'
  };
  margin-bottom: 8px;
`;

export const MesocycleParams = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 12px;
  margin-bottom: 10px;
`;

export const MesocycleParam = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 0.65rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.6));

  span {
    color: var(--text-primary, #E0ECF4);
    font-weight: 500;
  }
`;

export const MesocycleOverload = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 0.65rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
  font-style: italic;
  padding-top: 8px;
  border-top: 1px solid var(--border-soft, rgba(96, 192, 240, 0.06));
`;

export const DeloadBadge = styled.span`
  display: inline-block;
  font-family: 'Sora', sans-serif;
  font-size: 0.6rem;
  font-weight: 600;
  color: ${PLANNER_GOLD};
  background: ${plannerGoldAlpha(0.1)};
  border: 1px solid ${plannerGoldAlpha(0.2)};
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 8px;
`;

// ─────────────────────────────────────────────────────────────
