/**
 * Schedule, recommendation, self-generation, and export styles for the active Workout Planner.
 * Re-exported by WorkoutPlannerStyles.ts for compatibility.
 */
import styled from 'styled-components';

// SECTION: Weekly Schedule & Recommendations
// ─────────────────────────────────────────────────────────────
export const ScheduleRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
`;

export const ScheduleDay = styled.div`
  background: var(--bg-surface, #1A1A24);
  border: 1px solid rgba(96, 192, 240, 0.1);
  border-radius: 8px;
  padding: 10px 14px;
  text-align: center;
  min-width: 100px;
  flex: 1;
`;

export const ScheduleDayNumber = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  color: var(--accent-primary, #60C0F0);
  font-weight: 600;
  margin-bottom: 4px;
`;

export const ScheduleDayFocus = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 0.7rem;
  color: var(--text-primary, #E0ECF4);
  text-transform: capitalize;
`;

export const RecommendationList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 16px 0;
`;

export const RecommendationItem = styled.li`
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  padding: 6px 0 6px 16px;
  position: relative;
  border-bottom: 1px solid var(--border-soft, rgba(96, 192, 240, 0.04));

  &::before {
    content: '→';
    position: absolute;
    left: 0;
    color: var(--accent-primary, #60C0F0);
  }
`;

// ─────────────────────────────────────────────────────────────
// L5 (2026-05-02) — Client self-service status pill
// Renders a small read-only chip below the planner's ControlRow that
// surfaces the selected client's `canGenerateWorkoutPlans` flag. Three
// states: enabled (purple/secondary), disabled (muted), blocked
// (warning/red — fires only when the viewer IS the affected client).
// ─────────────────────────────────────────────────────────────
type SelfGenPillStatus = 'enabled' | 'disabled' | 'blocked' | 'unknown';

export const ClientSelfGenPill = styled.div<{ $status: SelfGenPillStatus }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 6px 10px;
  border-radius: 999px;
  font-family: 'Sora', sans-serif;
  font-size: 0.72rem;
  border: 1px solid ${({ $status }) =>
    $status === 'enabled'
      ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 35%, transparent)'
      : $status === 'blocked'
        ? 'color-mix(in srgb, var(--accent-error, #F87171) 45%, transparent)'
        : 'color-mix(in srgb, var(--text-muted, rgba(224,236,244,0.4)) 30%, transparent)'};
  background: ${({ $status }) =>
    $status === 'enabled'
      ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, var(--bg-elevated, #141419))'
      : $status === 'blocked'
        ? 'color-mix(in srgb, var(--accent-error, #F87171) 12%, var(--bg-elevated, #141419))'
        : 'var(--bg-elevated, #141419)'};
  color: ${({ $status }) =>
    $status === 'enabled'
      ? 'var(--accent-secondary, #8B5CF6)'
      : $status === 'blocked'
        ? 'var(--accent-error, #F87171)'
        : 'var(--text-muted, rgba(224, 236, 244, 0.55))'};
  & strong {
    color: var(--text-primary, #E0ECF4);
    font-weight: 700;
  }
`;

export const PillHint = styled.span`
  color: var(--text-muted, rgba(224, 236, 244, 0.45));
  font-weight: 400;
`;

// L3 (2026-05-02): Export PDF button rendered next to the
// MesocycleSectionTitle. Compact, non-cosmic styling so it does not
// compete with the primary "Swan Coach Plan" CTA in the control row.
export const ExportPdfBtn = styled.button`
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 35%, transparent);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, var(--bg-elevated, #141419));
  color: var(--accent-primary, #60C0F0);
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, var(--bg-elevated, #141419));
    color: var(--text-primary, #E0ECF4);
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 55%, transparent);
  }
  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
