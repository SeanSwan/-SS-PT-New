import styled from 'styled-components';
import { PLANNER_GOLD, plannerGoldAlpha } from './plannerGold';
import {
  EmptyMessage,
  ExerciseName,
  GeneratingSkeletonRow,
  MesocycleCard,
  MiniInput,
  Panel,
  PlanModeLabel,
  ScheduleDay,
  ScheduleDayNumber,
} from './WorkoutPlannerStyles';

export const ResultsCount = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.7rem;
  color: rgba(224, 236, 244, 0.5);
`;

export const FiltersPane = styled.div`
  flex-shrink: 0;
  padding: 12px 16px 4px;
  display: flex;
  flex-direction: column;
  gap: 0;
`;

export const ExerciseListPane = styled.div`
  flex: 1;
  min-height: 0;
  padding: 0 16px 8px;
`;

export const DegradedPanel = styled(Panel)<{ $degraded?: boolean }>`
  border: ${({ $degraded }) => ($degraded ? `1px solid ${PLANNER_GOLD}` : undefined)};
`;

export const ActionWrap = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

export const SkeletonDelayRow = styled(GeneratingSkeletonRow)<{ $delayMs: number }>`
  animation-delay: ${({ $delayMs }) => $delayMs}ms;
`;

export const SkeletonTextStack = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

export const ClickableExerciseName = styled(ExerciseName)`
  cursor: pointer;
`;

export const BuilderParamGroup = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
`;

export const ParamField = styled.div`
  text-align: center;
`;

export const ParamLabel = styled.div`
  font-size: 0.6rem;
  color: rgba(224, 236, 244, 0.4);
  margin-bottom: 2px;
`;

export const RepsInput = styled(MiniInput)`
  width: 64px;
`;

export const TempoInput = styled(MiniInput)`
  width: 56px;
`;

export const BuilderActionRow = styled.div`
  margin-top: 16px;
  display: flex;
  gap: 8px;
`;

export const ExplanationDetails = styled.div`
  margin-top: 4px;
  font-size: 0.7rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
  font-family: 'Fira Code', monospace;
`;

export const PlanLabelBlock = styled(PlanModeLabel)<{ $top?: boolean }>`
  display: block;
  margin-top: ${({ $top }) => ($top ? '20px' : 0)};
  margin-bottom: 8px;
`;

export const ActiveScheduleDay = styled(ScheduleDay)<{ $active?: boolean }>`
  cursor: pointer;
  outline: ${({ $active }) => ($active ? '2px solid var(--accent-secondary, #8B5CF6)' : 'none')};
  background: ${({ $active }) =>
    $active
      ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 15%, var(--bg-elevated, #1A1A24))'
      : undefined};
  transition: all 0.2s ease;
`;

export const ActiveScheduleDayNumber = styled(ScheduleDayNumber)<{ $active?: boolean }>`
  color: ${({ $active }) => ($active ? 'var(--accent-secondary, #8B5CF6)' : undefined)};
`;

export const ActiveDayDetail = styled.div`
  padding: 12px 16px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent-secondary, #8B5CF6) 8%, var(--bg-surface, #141419));
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent);
  margin-bottom: 16px;
  font-family: 'Fira Code', monospace;
  font-size: 0.8rem;
`;

export const ActiveDayTitle = styled.div`
  font-weight: 600;
  margin-bottom: 4px;
  color: var(--accent-secondary, #8B5CF6);
`;

export const ActiveDayMeta = styled.div`
  color: var(--text-muted, rgba(224,236,244,0.5));
  font-size: 0.7rem;
`;

export const ClickableMesocycleCard = styled(MesocycleCard)<{ $selected?: boolean }>`
  cursor: pointer;
  text-align: left;
  outline: ${({ $selected }) => ($selected ? '2px solid var(--accent-secondary, #8B5CF6)' : 'none')};
  transition: all 0.2s ease;
`;

export const RecommendationSource = styled.span`
  margin-left: 8px;
  font-family: 'Fira Code', monospace;
  font-size: 0.65rem;
  color: var(--text-muted, rgba(224,236,244,0.5));
`;

export const SavedPlansCount = styled.span`
  margin-left: 8px;
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  color: var(--text-muted, rgba(224,236,244,0.5));
`;

export const SavedPlansLoading = styled.div`
  padding: 16px;
`;

export const SavedPlansEmpty = styled(EmptyMessage)`
  padding: 16px;
`;

export const PlannerHandoffActions = styled.div`
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

export const PlannerHandoffLink = styled.a<{ $variant?: 'primary' }>`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid ${({ $variant }) =>
    $variant === 'primary'
      ? plannerGoldAlpha(0.42)
      : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 35%, transparent)'};
  background: ${({ $variant }) =>
    $variant === 'primary'
      ? `color-mix(in srgb, ${PLANNER_GOLD} 12%, var(--bg-elevated, #141419))`
      : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, var(--bg-elevated, #141419))'};
  color: ${({ $variant }) =>
    $variant === 'primary'
      ? PLANNER_GOLD
      : 'var(--accent-primary, #60C0F0)'};
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;

  &:hover {
    color: var(--text-primary, #E0ECF4);
    border-color: var(--accent-primary, #60C0F0);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;
