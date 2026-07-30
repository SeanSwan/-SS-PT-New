/**
 * Blueprint: WorkoutLoggerEmptyPlanState
 * Parent: ActivePlanContextStrip (renders when the plan loader came back empty)
 * Purpose: C4b — the no-plan dead-end becomes a real state. Before this, every
 * empty outcome of `?loadPlan=today` was a transient toast + a bare "Add Your
 * First Exercise" button, indistinguishable from a deliberately blank logger.
 * Now the reason persists in-page with role-aware next moves (Ask Coach /
 * plan vault), and freestyle logging stays one gesture away below.
 */
import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { CalendarX2, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { CS, withAlpha } from './WorkoutLoggerCS';
import { TRAIN } from '../../styles/train-tokens';
import type { ExerciseSlim } from './exerciseSearchWorker';

export type WorkoutLoggerPlanLoadOutcomeKind =
  | 'no_plan'
  | 'no_exercises_today'
  | 'assignment_changed'
  | 'not_loggable'
  | 'no_client';

export interface WorkoutLoggerPlanLoadOutcome {
  kind: WorkoutLoggerPlanLoadOutcomeKind;
  message: string;
}

const Panel = styled.section`
  display: flex;
  gap: 0.875rem;
  align-items: flex-start;
  padding: 1rem 1.25rem;
  margin-bottom: 1rem;
  background: ${withAlpha(CS.surfaceDark, 0.7)};
  border: 1px dashed ${withAlpha(CS.gaming, 0.3)};
  border-radius: 0.75rem;
  color: ${CS.text};
`;

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
`;

const Title = styled.h3`
  margin: 0;
  font: 600 0.95rem 'Plus Jakarta Sans', sans-serif;
  color: ${CS.text};
`;

const Detail = styled.p`
  margin: 0;
  font-size: 0.8rem;
  color: ${CS.textMuted};
`;

const CtaRow = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 0.4rem;
`;

const CtaButton = styled.button`
  min-height: 44px;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid ${withAlpha(CS.gaming, 0.35)};
  background: ${withAlpha(CS.gaming, 0.1)};
  color: ${CS.text};
  font: 600 0.8rem 'Sora', sans-serif;
  cursor: pointer;

  &:hover { background: ${withAlpha(CS.gaming, 0.18)}; }
  &:focus-visible { outline: 2px solid ${CS.gaming}; outline-offset: 2px; }
`;

const TITLES: Record<WorkoutLoggerPlanLoadOutcomeKind, string> = {
  no_plan: 'No active plan yet',
  no_exercises_today: 'Nothing scheduled today',
  assignment_changed: "Today's assignment changed",
  not_loggable: 'This assignment is not loggable',
  no_client: 'No client selected',
};

const SuggestionBox = styled.div`
  margin-top: 0.6rem;
  padding: 0.75rem 0.9rem;
  border: 1px solid ${withAlpha(TRAIN.active, 0.3)};
  border-radius: 0.6rem;
  background: ${withAlpha(TRAIN.active, 0.06)};
`;

const SuggestionTitle = styled.p`
  margin: 0 0 0.2rem;
  font: 600 0.85rem 'Plus Jakarta Sans', sans-serif;
  color: ${CS.text};
  display: flex;
  align-items: center;
  gap: 0.4rem;
`;

const SuggestionMeta = styled.p`
  margin: 0 0 0.5rem;
  font-size: 0.75rem;
  color: ${CS.textMuted};
`;

export interface SuggestedExerciseSlim {
  key: string;
  name: string;
  category?: string;
  muscles?: string[];
}

interface SuggestionPayload {
  title: string;
  whyRationale: string[];
  exercises: SuggestedExerciseSlim[];
}

/** Adapter into the logger's own addExercise entry-construction path. */
export const toLoggerExercise = (suggested: SuggestedExerciseSlim): ExerciseSlim => ({
  id: suggested.key,
  name: suggested.name,
  exerciseKey: suggested.key,
  exerciseType: 'strength',
  bodyPartCategory: suggested.category ?? 'general',
  primaryMuscles: suggested.muscles ?? [],
  difficulty: 0,
});

export type AddSuggestedExercise = (exercise: ExerciseSlim) => void;

interface WorkoutLoggerEmptyPlanStateProps {
  outcome: WorkoutLoggerPlanLoadOutcome;
  /** Client logging their own session → coach/vault CTAs make sense. */
  isClientSelfMode: boolean;
  /** C6d: enables the suggested-session offer on the no_plan outcome. */
  clientId?: number;
  onAddExercise?: AddSuggestedExercise;
}

const WorkoutLoggerEmptyPlanState: React.FC<WorkoutLoggerEmptyPlanStateProps> = ({
  outcome,
  isClientSelfMode,
  clientId,
  onAddExercise,
}) => {
  const navigate = useNavigate();
  const { authAxios } = useAuth();
  const [suggestion, setSuggestion] = useState<SuggestionPayload | null>(null);
  const fetchedRef = useRef(false);

  const suggestionEligible = outcome.kind === 'no_plan'
    && isClientSelfMode
    && typeof clientId === 'number'
    && Boolean(onAddExercise);

  useEffect(() => {
    // Crash-proof under partially-hydrated auth: a missing/non-callable get
    // (or any throw) leaves the base empty state standing alone.
    if (!suggestionEligible || typeof authAxios?.get !== 'function' || fetchedRef.current) return;
    fetchedRef.current = true;
    let alive = true;
    Promise.resolve()
      .then(() => authAxios.get(`/api/workout-builder/suggested/${clientId}`))
      .then((response: { data?: { data?: { suggestions?: SuggestionPayload[] } } }) => {
        if (!alive) return;
        const top = response?.data?.data?.suggestions?.[0];
        if (top && Array.isArray(top.exercises) && top.exercises.length > 0) setSuggestion(top);
      })
      .catch(() => { /* flag off / hold / offline — the base empty state stands alone */ });
    return () => { alive = false; };
  }, [suggestionEligible, authAxios, clientId]);

  return (
    <Panel role="status" aria-live="polite" data-testid="logger-empty-plan-state">
      <CalendarX2 size={22} aria-hidden="true" color={CS.textMuted} />
      <Body>
        <Title>{TITLES[outcome.kind]}</Title>
        <Detail>{outcome.message} You can still log freestyle — add exercises below and save as normal.</Detail>
        {suggestion && (
          <SuggestionBox data-testid="logger-suggested-session">
            <SuggestionTitle>
              <Sparkles size={14} aria-hidden="true" /> Suggested: {suggestion.title}
            </SuggestionTitle>
            <SuggestionMeta>
              {suggestion.exercises.map((exercise) => exercise.name).join(' · ')}
              {suggestion.whyRationale?.[0] ? ` — ${suggestion.whyRationale[0]}` : ''}
            </SuggestionMeta>
            <CtaButton
              type="button"
              onClick={() => suggestion.exercises.forEach((exercise) => onAddExercise?.(toLoggerExercise(exercise)))}
            >
              Load this session
            </CtaButton>
          </SuggestionBox>
        )}
        {isClientSelfMode && outcome.kind !== 'no_client' && (
          <CtaRow>
            <CtaButton type="button" onClick={() => navigate('/dashboard/client/coach-assistant')}>
              Ask Coach
            </CtaButton>
            <CtaButton type="button" onClick={() => navigate('/dashboard/client/workouts')}>
              My Workouts &amp; Plan Vault
            </CtaButton>
          </CtaRow>
        )}
      </Body>
    </Panel>
  );
};

export default WorkoutLoggerEmptyPlanState;
