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
  GeneratedWorkout,
  GeneratedPlan,
} from '../../hooks/useWorkoutBuilderAPI';
import CorrectiveRecommendationsPanel, {
  type CompensationInput,
} from '../WorkoutLogger/CorrectiveRecommendationsPanel';
import WorkoutBuilderErrorBoundary from './WorkoutBuilderErrorBoundary';
import WorkoutBuilderInsightsPanel from './WorkoutBuilderInsightsPanel';
import { parsePositiveClientId } from './WorkoutBuilderPage.logic';
import { CATEGORIES } from './WorkoutBuilderPage.constants';
import { CompactConfigField, ConfigField, ConfigRow, ContextCard, ContextLabel, ContextMeta, ContextValue, CorrectivePanelWrap, ErrorBanner, FormGroup, Input, Label, ModeToggleButton, ModeToggleGroup, PageWrapper, Panel, PanelTitle, PrimaryButton, Select, Subtitle, ThreePane, Title, TopBar } from './WorkoutBuilderPage.styles';
import WorkoutBuilderResults from './WorkoutBuilderResults';

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
  const [mode, setMode] = useState<'workout' | 'plan'>('workout');

  const [planWeeks, setPlanWeeks] = useState('12');
  const [sessionsPerWeek, setSessionsPerWeek] = useState('3');
  const [primaryGoal, setPrimaryGoal] = useState('general_fitness');

  useEffect(() => {
    if (!parsedClientId) {
      setContext(null);
      return;
    }
    api.getClientContext(parsedClientId)
      .then(ctx => setContext(ctx))
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
      if (mode === 'workout') {
        const result = await api.generateWorkout({
          clientId: parsedClientId,
          category,
          exerciseCount: parseInt(exerciseCount, 10) || 6,
          rotationPattern,
          equipmentProfileId: equipmentProfileId ? parseInt(equipmentProfileId, 10) : undefined,
        });
        setWorkout(result);
      } else {
        const result = await api.generatePlan({
          clientId: parsedClientId,
          durationWeeks: parseInt(planWeeks, 10) || 12,
          sessionsPerWeek: parseInt(sessionsPerWeek, 10) || 3,
          primaryGoal,
          equipmentProfileId: equipmentProfileId ? parseInt(equipmentProfileId, 10) : undefined,
        });
        setPlan(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setLoading(false);
    }
  }, [api, parsedClientId, category, exerciseCount, rotationPattern, equipmentProfileId, mode, planWeeks, sessionsPerWeek, primaryGoal]);

  return (
    <PageWrapper>
      <TopBar>
        <Title>Intelligent Workout Builder</Title>
        <Subtitle>AI-powered, NASM-aligned workout generation with pain awareness and compensation correction</Subtitle>
      </TopBar>

      <ThreePane>
        <Panel>
          <PanelTitle>Client Context</PanelTitle>

          <FormGroup>
            <Label>Client ID</Label>
            <Input
              type="number"
              placeholder="Enter client ID"
              value={clientId}
              onChange={e => setClientId(e.target.value)}
            />
          </FormGroup>

          {context && (
            <>
              <ContextCard $severity="info">
                <ContextLabel>Client</ContextLabel>
                <ContextValue>{context.clientName}</ContextValue>
                <ContextMeta>
                  NASM Phase: {context.movement.nasmPhaseRecommendation || 'Not assessed'}
                </ContextMeta>
              </ContextCard>

              {context.pain.exclusions.length > 0 && (
                <ContextCard $severity="danger">
                  <ContextLabel>Pain Exclusions</ContextLabel>
                  <ContextValue>{context.pain.exclusions.length} muscle group(s) locked</ContextValue>
                  <ContextMeta>
                    {context.pain.exclusions.map(e => e.bodyRegion).join(', ')}
                  </ContextMeta>
                </ContextCard>
              )}

              {context.pain.warnings.length > 0 && (
                <ContextCard $severity="warn">
                  <ContextLabel>Pain Warnings</ContextLabel>
                  <ContextValue>{context.pain.warnings.length} area(s) need caution</ContextValue>
                  <ContextMeta>
                    {context.pain.warnings.map(e => `${e.bodyRegion} (${e.painLevel}/10)`).join(', ')}
                  </ContextMeta>
                </ContextCard>
              )}

              {context.movement.compensations.length > 0 && (
                <ContextCard $severity="info">
                  <ContextLabel>Compensations</ContextLabel>
                  <ContextValue>{context.movement.compensations.length} pattern(s)</ContextValue>
                  <ContextMeta>
                    {context.movement.compensations.map(c =>
                      `${c.type} (${c.trend})`
                    ).join(', ')}
                  </ContextMeta>
                </ContextCard>
              )}

              {/* V3c.6: full corrective recommendations panel — pulls
                  V3b.3 registry rows for the client's compensations.
                  Only renders meaningful content when comps exist; the
                  panel handles empty/loading/error states internally. */}
              {parsedClientId && context.movement.compensations.length > 0 && (
                <CorrectivePanelWrap>
                  <CorrectiveRecommendationsPanel
                    clientId={parsedClientId}
                    compensations={context.movement.compensations as CompensationInput[]}
                  />
                </CorrectivePanelWrap>
              )}

              <ContextCard $severity="info">
                <ContextLabel>Recent Activity</ContextLabel>
                <ContextValue>{context.workouts.sessionsLast2Weeks} sessions (2 wks)</ContextValue>
                <ContextMeta>
                  Avg form: {context.workouts.avgFormRating}/5 | Intensity: {context.workouts.avgIntensity}/10
                </ContextMeta>
              </ContextCard>

              {context.equipment.length > 0 && (
                <ContextCard $severity="info">
                  <ContextLabel>Equipment Locations</ContextLabel>
                  <ContextValue>{context.equipment.length} profile(s)</ContextValue>
                  <ContextMeta>
                    {context.equipment.map(e => `${e.name} (${e.equipmentCount})`).join(', ')}
                  </ContextMeta>
                </ContextCard>
              )}
            </>
          )}

          {!context && clientId && (
            <ContextMeta $center $pad={16}>
              Loading client data...
            </ContextMeta>
          )}
        </Panel>

        <Panel>
          <PanelTitle>
            <ModeToggleGroup>
              <ModeToggleButton type="button" $active={mode === 'workout'} onClick={() => setMode('workout')}>
                Single Workout
              </ModeToggleButton>
              <span>|</span>
              <ModeToggleButton type="button" $active={mode === 'plan'} onClick={() => setMode('plan')}>
                Training Plan
              </ModeToggleButton>
            </ModeToggleGroup>
          </PanelTitle>

          <ConfigRow>
            {mode === 'workout' ? (
              <>
                <ConfigField>
                  <Label>Category</Label>
                  <Select value={category} onChange={e => setCategory(e.target.value)}>
                    {CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </Select>
                </ConfigField>
                <CompactConfigField>
                  <Label>Exercises</Label>
                  <Input type="number" value={exerciseCount} onChange={e => setExerciseCount(e.target.value)} />
                </CompactConfigField>
                <ConfigField>
                  <Label>Rotation</Label>
                  <Select value={rotationPattern} onChange={e => setRotationPattern(e.target.value)}>
                    <option value="standard">Standard (2:1)</option>
                    <option value="aggressive">Aggressive (1:1)</option>
                    <option value="conservative">Conservative (3:1)</option>
                  </Select>
                </ConfigField>
              </>
            ) : (
              <>
                <CompactConfigField>
                  <Label>Weeks</Label>
                  <Input type="number" value={planWeeks} onChange={e => setPlanWeeks(e.target.value)} />
                </CompactConfigField>
                <CompactConfigField>
                  <Label>Sessions/Week</Label>
                  <Input type="number" value={sessionsPerWeek} onChange={e => setSessionsPerWeek(e.target.value)} />
                </CompactConfigField>
                <ConfigField>
                  <Label>Goal</Label>
                  <Select value={primaryGoal} onChange={e => setPrimaryGoal(e.target.value)}>
                    <option value="general_fitness">General Fitness</option>
                    <option value="hypertrophy">Hypertrophy</option>
                    <option value="strength">Strength</option>
                    <option value="fat_loss">Fat Loss</option>
                    <option value="athletic_performance">Athletic Performance</option>
                  </Select>
                </ConfigField>
              </>
            )}

            {context && context.equipment.length > 0 && (
              <ConfigField>
                <Label>Location</Label>
                <Select value={equipmentProfileId} onChange={e => setEquipmentProfileId(e.target.value)}>
                  <option value="">Any equipment</option>
                  {context.equipment.map(ep => (
                    <option key={ep.id} value={ep.id}>{ep.name}</option>
                  ))}
                </Select>
              </ConfigField>
            )}
          </ConfigRow>

          <PrimaryButton
            onClick={handleGenerate}
            disabled={loading || !parsedClientId}
          >
            {loading ? 'Generating...' : mode === 'workout' ? 'Generate Workout' : 'Generate Plan'}
          </PrimaryButton>

          {error && <ErrorBanner $top={12}>{error}</ErrorBanner>}

          <WorkoutBuilderResults workout={workout} plan={plan} />
        </Panel>

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
