/**
 * WorkoutBuilderPage - Intelligent Workout Builder.
 * Active /workout-builder surface for NASM-aligned workout and
 * plan generation with client context, pain awareness, and correctives.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWorkoutBuilderAPI } from '../../hooks/useWorkoutBuilderAPI';
import type {
  ClientContext,
  GeneratedPlan,
  GeneratedWorkout,
} from '../../hooks/useWorkoutBuilderAPI';
import WorkoutBuilderContextPanel from './WorkoutBuilderContextPanel';
import WorkoutBuilderControlsPanel from './WorkoutBuilderControlsPanel';
import WorkoutBuilderErrorBoundary from './WorkoutBuilderErrorBoundary';
import WorkoutBuilderInsightsPanel from './WorkoutBuilderInsightsPanel';
import {
  parsePositiveClientId,
  runWorkoutBuilderGeneration,
  type WorkoutBuilderMode,
} from './WorkoutBuilderPage.logic';
import { PageWrapper, Subtitle, ThreePane, Title, TopBar } from './WorkoutBuilderPage.styles';

const WorkoutBuilderPage: React.FC = () => {
  const api = useWorkoutBuilderAPI();
  const [searchParams] = useSearchParams();

  const [clientId, setClientId] = useState(() => {
    const queryClientId = parsePositiveClientId(searchParams.get('clientId'));
    return queryClientId ? String(queryClientId) : '';
  });
  const parsedClientId = useMemo(() => parsePositiveClientId(clientId), [clientId]);
  const [category, setCategory] = useState('full_body');
  const [exerciseCount, setExerciseCount] = useState('6');
  const [rotationPattern, setRotationPattern] = useState('standard');
  const [equipmentProfileId, setEquipmentProfileId] = useState('');

  const [context, setContext] = useState<ClientContext | null>(null);
  const [workout, setWorkout] = useState<GeneratedWorkout | null>(null);
  const [plan, setPlan] = useState<GeneratedPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<WorkoutBuilderMode>('workout');

  const [planWeeks, setPlanWeeks] = useState('12');
  const [sessionsPerWeek, setSessionsPerWeek] = useState('3');
  const [primaryGoal, setPrimaryGoal] = useState('general_fitness');

  useEffect(() => {
    if (!parsedClientId) {
      setContext(null);
      return;
    }

    api.getClientContext(parsedClientId)
      .then(nextContext => setContext(nextContext))
      .catch(() => setContext(null));
  }, [api, parsedClientId]);

  const handleGenerate = useCallback(async () => {
    if (!parsedClientId) {
      setError('Select a valid client before generating.');
      return;
    }

    setLoading(true);
    setError(null);
    setWorkout(null);
    setPlan(null);

    try {
      const result = await runWorkoutBuilderGeneration({
        api,
        mode,
        clientId: parsedClientId,
        category,
        exerciseCount,
        rotationPattern,
        equipmentProfileId,
        planWeeks,
        sessionsPerWeek,
        primaryGoal,
      });
      setWorkout(result.workout);
      setPlan(result.plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  }, [
    api,
    parsedClientId,
    mode,
    category,
    exerciseCount,
    rotationPattern,
    equipmentProfileId,
    planWeeks,
    sessionsPerWeek,
    primaryGoal,
  ]);

  return (
    <PageWrapper>
      <TopBar>
        <Title>Swan Coach Planning</Title>
        <Subtitle>NASM-aligned workout planning with pain awareness, equipment context, and progress history</Subtitle>
      </TopBar>

      <ThreePane>
        <WorkoutBuilderContextPanel
          clientId={clientId}
          context={context}
          parsedClientId={parsedClientId}
          onClientIdChange={setClientId}
        />

        <WorkoutBuilderControlsPanel
          mode={mode}
          setMode={setMode}
          category={category}
          setCategory={setCategory}
          exerciseCount={exerciseCount}
          setExerciseCount={setExerciseCount}
          rotationPattern={rotationPattern}
          setRotationPattern={setRotationPattern}
          planWeeks={planWeeks}
          setPlanWeeks={setPlanWeeks}
          sessionsPerWeek={sessionsPerWeek}
          setSessionsPerWeek={setSessionsPerWeek}
          primaryGoal={primaryGoal}
          setPrimaryGoal={setPrimaryGoal}
          equipmentProfileId={equipmentProfileId}
          setEquipmentProfileId={setEquipmentProfileId}
          context={context}
          loading={loading}
          parsedClientId={parsedClientId}
          error={error}
          workout={workout}
          plan={plan}
          onGenerate={handleGenerate}
        />

        <WorkoutBuilderInsightsPanel workout={workout} plan={plan} />
      </ThreePane>
    </PageWrapper>
  );
};

const WorkoutBuilderPageWithBoundary: React.FC = () => (
  <WorkoutBuilderErrorBoundary>
    <WorkoutBuilderPage />
  </WorkoutBuilderErrorBoundary>
);

export default WorkoutBuilderPageWithBoundary;
