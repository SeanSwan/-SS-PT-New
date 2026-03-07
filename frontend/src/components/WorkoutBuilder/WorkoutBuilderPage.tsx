/**
 * WorkoutBuilderPage -- Intelligent Workout Builder
 * ===================================================
 * Phase 9d: 3-pane layout with Context Sidebar, Workout Canvas, AI Insights.
 *
 * Galaxy-Swan theme: Midnight Sapphire (#002060), Swan Cyan (#60C0F0),
 * Cosmic Purple (#7851A9), glassmorphic panels.
 */
import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkoutBuilderAPI } from '../../hooks/useWorkoutBuilderAPI';
import type {
  ClientContext,
  GeneratedWorkout,
  GeneratedPlan,
  WorkoutExercise,
  Explanation,
} from '../../hooks/useWorkoutBuilderAPI';

// --- Styled Components ---

const PageWrapper = styled.div`
  min-height: 100vh;
  background: linear-gradient(180deg, #002060 0%, #001040 100%);
  color: #e0ecf4;
  padding: 20px;
`;

const TopBar = styled.div`
  max-width: 1400px;
  margin: 0 auto 20px;
`;

const Title = styled.h1`
  font-size: 22px;
  font-weight: 800;
  margin: 0;
`;

const Subtitle = styled.p`
  font-size: 13px;
  color: rgba(224, 236, 244, 0.7);
  margin: 4px 0 0;
`;

const ThreePane = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 280px 1fr 320px;
  gap: 16px;
  min-height: calc(100vh - 120px);

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const Panel = styled.div`
  background: rgba(0, 32, 96, 0.4);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(96, 192, 240, 0.12);
  border-radius: 12px;
  padding: 16px;
  overflow-y: auto;
  max-height: calc(100vh - 120px);

  @media (max-width: 1024px) {
    max-height: none;
  }
`;

const PanelTitle = styled.h2`
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #60c0f0;
  margin: 0 0 12px;
`;

const Label = styled.label`
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: rgba(224, 236, 244, 0.8);
  margin-bottom: 4px;
`;

const Input = styled.input`
  width: 100%;
  padding: 8px 12px;
  background: rgba(0, 16, 64, 0.5);
  border: 1px solid rgba(96, 192, 240, 0.2);
  border-radius: 8px;
  color: #e0ecf4;
  font-size: 14px;
  min-height: 44px;
  box-sizing: border-box;
  &:focus { outline: none; border-color: #60c0f0; }
  &::placeholder { color: rgba(224, 236, 244, 0.4); }
`;

const Select = styled.select`
  width: 100%;
  padding: 8px 12px;
  background: rgba(0, 16, 64, 0.5);
  border: 1px solid rgba(96, 192, 240, 0.2);
  border-radius: 8px;
  color: #e0ecf4;
  font-size: 14px;
  min-height: 44px;
  &:focus { outline: none; border-color: #60c0f0; }
`;

const FormGroup = styled.div`
  margin-bottom: 12px;
`;

const PrimaryButton = styled.button`
  width: 100%;
  padding: 10px;
  background: linear-gradient(135deg, #60c0f0 0%, #7851a9 100%);
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  transition: opacity 0.2s;
  &:hover { opacity: 0.85; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const SecondaryButton = styled(PrimaryButton)`
  background: transparent;
  border: 1px solid rgba(96, 192, 240, 0.25);
  color: #60c0f0;
  &:hover { background: rgba(96, 192, 240, 0.08); opacity: 1; }
`;

// --- Context Sidebar Widgets ---

const ContextCard = styled.div<{ $severity?: 'danger' | 'warn' | 'info' }>`
  padding: 10px;
  border-radius: 8px;
  margin-bottom: 8px;
  background: ${({ $severity }) =>
    $severity === 'danger' ? 'rgba(255, 71, 87, 0.1)'
    : $severity === 'warn' ? 'rgba(255, 184, 0, 0.1)'
    : 'rgba(96, 192, 240, 0.06)'};
  border: 1px solid ${({ $severity }) =>
    $severity === 'danger' ? 'rgba(255, 71, 87, 0.2)'
    : $severity === 'warn' ? 'rgba(255, 184, 0, 0.2)'
    : 'rgba(96, 192, 240, 0.1)'};
`;

const ContextLabel = styled.div`
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(224, 236, 244, 0.6);
  margin-bottom: 4px;
`;

const ContextValue = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #e0ecf4;
`;

const ContextMeta = styled.div`
  font-size: 11px;
  color: rgba(224, 236, 244, 0.5);
  margin-top: 2px;
`;

// --- Exercise Card ---

const ExerciseCard = styled(motion.div)<{ $aiOptimized?: boolean }>`
  padding: 14px;
  border-radius: 10px;
  margin-bottom: 10px;
  background: rgba(0, 16, 64, 0.4);
  border: 1px solid ${({ $aiOptimized }) =>
    $aiOptimized ? 'rgba(96, 192, 240, 0.3)' : 'rgba(96, 192, 240, 0.1)'};
  ${({ $aiOptimized }) => $aiOptimized && `
    box-shadow: 0 0 12px rgba(96, 192, 240, 0.1);
  `}
`;

const ExerciseHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
`;

const ExerciseName = styled.div`
  font-size: 14px;
  font-weight: 600;
`;

const AiBadge = styled.span`
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(96, 192, 240, 0.15);
  color: #60c0f0;
`;

const ExerciseParams = styled.div`
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: rgba(224, 236, 244, 0.7);
`;

const ParamChip = styled.span`
  background: rgba(0, 16, 64, 0.4);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
`;

const MuscleTags = styled.div`
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: 6px;
`;

const MuscleTag = styled.span`
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 3px;
  background: rgba(120, 81, 169, 0.15);
  color: rgba(224, 236, 244, 0.6);
`;

// --- Insight Card ---

const InsightCard = styled.div<{ $type?: string }>`
  padding: 10px;
  border-radius: 8px;
  margin-bottom: 8px;
  background: ${({ $type }) =>
    $type === 'pain_exclusion' ? 'rgba(255, 71, 87, 0.08)'
    : $type === 'pain_warning' ? 'rgba(255, 184, 0, 0.08)'
    : $type === 'compensation_awareness' ? 'rgba(120, 81, 169, 0.1)'
    : 'rgba(96, 192, 240, 0.06)'};
  border-left: 3px solid ${({ $type }) =>
    $type === 'pain_exclusion' ? '#FF4757'
    : $type === 'pain_warning' ? '#FFB800'
    : $type === 'compensation_awareness' ? '#7851A9'
    : '#60C0F0'};
`;

const InsightMessage = styled.div`
  font-size: 13px;
  color: #e0ecf4;
  margin-bottom: 4px;
`;

const InsightDetail = styled.div`
  font-size: 11px;
  color: rgba(224, 236, 244, 0.55);
`;

// --- Section Divider ---

const SectionDivider = styled.div`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: rgba(96, 192, 240, 0.5);
  margin: 16px 0 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(96, 192, 240, 0.1);
`;

const ErrorBanner = styled.div`
  padding: 12px;
  border-radius: 8px;
  background: rgba(255, 71, 87, 0.1);
  border: 1px solid rgba(255, 71, 87, 0.25);
  color: #FF4757;
  font-size: 13px;
  margin-bottom: 12px;
`;

const SuccessBanner = styled.div`
  padding: 12px;
  border-radius: 8px;
  background: rgba(0, 255, 136, 0.08);
  border: 1px solid rgba(0, 255, 136, 0.2);
  color: #00FF88;
  font-size: 13px;
  font-weight: 600;
`;

// --- Component ---

const CATEGORIES = [
  { value: 'full_body', label: 'Full Body' },
  { value: 'chest', label: 'Chest' },
  { value: 'back', label: 'Back' },
  { value: 'shoulders', label: 'Shoulders' },
  { value: 'arms', label: 'Arms' },
  { value: 'legs', label: 'Legs' },
  { value: 'core', label: 'Core' },
];

const WorkoutBuilderPage: React.FC = () => {
  const api = useWorkoutBuilderAPI();

  // Config
  const [clientId, setClientId] = useState('');
  const [category, setCategory] = useState('full_body');
  const [exerciseCount, setExerciseCount] = useState('6');
  const [rotationPattern, setRotationPattern] = useState('standard');
  const [equipmentProfileId, setEquipmentProfileId] = useState('');

  // State
  const [context, setContext] = useState<ClientContext | null>(null);
  const [workout, setWorkout] = useState<GeneratedWorkout | null>(null);
  const [plan, setPlan] = useState<GeneratedPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'workout' | 'plan'>('workout');

  // Plan config
  const [planWeeks, setPlanWeeks] = useState('12');
  const [sessionsPerWeek, setSessionsPerWeek] = useState('3');
  const [primaryGoal, setPrimaryGoal] = useState('general_fitness');

  // Load client context when clientId changes
  useEffect(() => {
    const cid = parseInt(clientId, 10);
    if (isNaN(cid) || cid < 1) {
      setContext(null);
      return;
    }
    api.getClientContext(cid)
      .then(ctx => setContext(ctx))
      .catch(() => setContext(null));
  }, [api, clientId]);

  const handleGenerate = useCallback(async () => {
    const cid = parseInt(clientId, 10);
    if (isNaN(cid)) return;

    setLoading(true);
    setError(null);
    setWorkout(null);
    setPlan(null);

    try {
      if (mode === 'workout') {
        const result = await api.generateWorkout({
          clientId: cid,
          category,
          exerciseCount: parseInt(exerciseCount, 10) || 6,
          rotationPattern,
          equipmentProfileId: equipmentProfileId ? parseInt(equipmentProfileId, 10) : undefined,
        });
        setWorkout(result);
      } else {
        const result = await api.generatePlan({
          clientId: cid,
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
  }, [api, clientId, category, exerciseCount, rotationPattern, equipmentProfileId, mode, planWeeks, sessionsPerWeek, primaryGoal]);

  return (
    <PageWrapper>
      <TopBar>
        <Title>Intelligent Workout Builder</Title>
        <Subtitle>AI-powered, NASM-aligned workout generation with pain awareness and compensation correction</Subtitle>
      </TopBar>

      <ThreePane>
        {/* Left: Context Sidebar */}
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
            <ContextMeta style={{ textAlign: 'center', padding: 16 }}>
              Loading client data...
            </ContextMeta>
          )}
        </Panel>

        {/* Center: Workout Canvas */}
        <Panel>
          <PanelTitle>
            <span
              style={{ cursor: 'pointer', opacity: mode === 'workout' ? 1 : 0.5 }}
              onClick={() => setMode('workout')}
            >
              Single Workout
            </span>
            {' | '}
            <span
              style={{ cursor: 'pointer', opacity: mode === 'plan' ? 1 : 0.5 }}
              onClick={() => setMode('plan')}
            >
              Training Plan
            </span>
          </PanelTitle>

          {/* Config Row */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {mode === 'workout' ? (
              <>
                <FormGroup style={{ flex: 1, minWidth: 120 }}>
                  <Label>Category</Label>
                  <Select value={category} onChange={e => setCategory(e.target.value)}>
                    {CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </Select>
                </FormGroup>
                <FormGroup style={{ flex: 1, minWidth: 100 }}>
                  <Label>Exercises</Label>
                  <Input type="number" value={exerciseCount} onChange={e => setExerciseCount(e.target.value)} />
                </FormGroup>
                <FormGroup style={{ flex: 1, minWidth: 120 }}>
                  <Label>Rotation</Label>
                  <Select value={rotationPattern} onChange={e => setRotationPattern(e.target.value)}>
                    <option value="standard">Standard (2:1)</option>
                    <option value="aggressive">Aggressive (1:1)</option>
                    <option value="conservative">Conservative (3:1)</option>
                  </Select>
                </FormGroup>
              </>
            ) : (
              <>
                <FormGroup style={{ flex: 1, minWidth: 100 }}>
                  <Label>Weeks</Label>
                  <Input type="number" value={planWeeks} onChange={e => setPlanWeeks(e.target.value)} />
                </FormGroup>
                <FormGroup style={{ flex: 1, minWidth: 100 }}>
                  <Label>Sessions/Week</Label>
                  <Input type="number" value={sessionsPerWeek} onChange={e => setSessionsPerWeek(e.target.value)} />
                </FormGroup>
                <FormGroup style={{ flex: 1, minWidth: 120 }}>
                  <Label>Goal</Label>
                  <Select value={primaryGoal} onChange={e => setPrimaryGoal(e.target.value)}>
                    <option value="general_fitness">General Fitness</option>
                    <option value="hypertrophy">Hypertrophy</option>
                    <option value="strength">Strength</option>
                    <option value="fat_loss">Fat Loss</option>
                    <option value="athletic_performance">Athletic Performance</option>
                  </Select>
                </FormGroup>
              </>
            )}

            {context && context.equipment.length > 0 && (
              <FormGroup style={{ flex: 1, minWidth: 120 }}>
                <Label>Location</Label>
                <Select value={equipmentProfileId} onChange={e => setEquipmentProfileId(e.target.value)}>
                  <option value="">Any equipment</option>
                  {context.equipment.map(ep => (
                    <option key={ep.id} value={ep.id}>{ep.name}</option>
                  ))}
                </Select>
              </FormGroup>
            )}
          </div>

          <PrimaryButton
            onClick={handleGenerate}
            disabled={loading || !clientId}
          >
            {loading ? 'Generating...' : mode === 'workout' ? 'Generate Workout' : 'Generate Plan'}
          </PrimaryButton>

          {error && <ErrorBanner style={{ marginTop: 12 }}>{error}</ErrorBanner>}

          {/* Workout Result */}
          <AnimatePresence>
            {workout && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <SectionDivider>
                  {workout.sessionType.toUpperCase()} Session | Phase {workout.nasmPhase}: {workout.phaseParams.name}
                </SectionDivider>

                {workout.warmup.length > 0 && (
                  <>
                    <SectionDivider>Warmup (CES Protocol)</SectionDivider>
                    {workout.warmup.map((w, i) => (
                      <ExerciseCard key={`warmup-${i}`}>
                        <ExerciseHeader>
                          <ExerciseName>{w.name}</ExerciseName>
                          <AiBadge>{w.type}</AiBadge>
                        </ExerciseHeader>
                        <ExerciseParams>
                          {w.duration && <ParamChip>{w.duration}</ParamChip>}
                          {w.sets && <ParamChip>{w.sets} x {w.reps}</ParamChip>}
                          {w.reason && <span style={{ fontSize: 11, color: 'rgba(224,236,244,0.5)' }}>{w.reason}</span>}
                        </ExerciseParams>
                      </ExerciseCard>
                    ))}
                  </>
                )}

                <SectionDivider>Main Exercises</SectionDivider>
                {workout.exercises.map((ex) => (
                  <ExerciseCard key={ex.exerciseKey} $aiOptimized>
                    <ExerciseHeader>
                      <ExerciseName>{ex.exerciseName}</ExerciseName>
                      <AiBadge>AI Optimized</AiBadge>
                    </ExerciseHeader>
                    <ExerciseParams>
                      <ParamChip>{ex.sets} sets</ParamChip>
                      <ParamChip>{ex.reps} reps</ParamChip>
                      <ParamChip>{ex.tempo} tempo</ParamChip>
                      <ParamChip>{ex.rest} rest</ParamChip>
                    </ExerciseParams>
                    <MuscleTags>
                      {ex.muscles.slice(0, 4).map(m => (
                        <MuscleTag key={m}>{m.replace(/_/g, ' ')}</MuscleTag>
                      ))}
                    </MuscleTags>
                  </ExerciseCard>
                ))}

                {workout.cooldown.length > 0 && (
                  <>
                    <SectionDivider>Cooldown</SectionDivider>
                    {workout.cooldown.map((c, i) => (
                      <ExerciseCard key={`cool-${i}`}>
                        <ExerciseName>{c.name}</ExerciseName>
                        <ExerciseParams>
                          {c.duration && <ParamChip>{c.duration}</ParamChip>}
                          {c.sets && <ParamChip>{c.sets} x {c.reps}</ParamChip>}
                        </ExerciseParams>
                      </ExerciseCard>
                    ))}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Plan Result */}
          <AnimatePresence>
            {plan && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <SectionDivider>
                  {plan.planSummary.durationWeeks}-Week Plan | {plan.planSummary.totalSessions} Sessions
                </SectionDivider>

                <SuccessBanner style={{ marginBottom: 12 }}>
                  {plan.recommendations.length} AI recommendations applied
                </SuccessBanner>

                {plan.mesocycles.map(mc => (
                  <ExerciseCard key={mc.mesocycle}>
                    <ExerciseHeader>
                      <ExerciseName>Mesocycle {mc.mesocycle}: Weeks {mc.weeks}</ExerciseName>
                      <AiBadge>Phase {mc.nasmPhase}</AiBadge>
                    </ExerciseHeader>
                    <div style={{ fontSize: 13, color: '#e0ecf4', marginBottom: 4 }}>
                      {mc.phaseName}
                    </div>
                    <ExerciseParams>
                      <ParamChip>{mc.params.sets} sets</ParamChip>
                      <ParamChip>{mc.params.reps} reps</ParamChip>
                      <ParamChip>{mc.params.intensity}</ParamChip>
                      <ParamChip>{mc.params.rest} rest</ParamChip>
                    </ExerciseParams>
                    <ContextMeta style={{ marginTop: 6 }}>{mc.overloadStrategy}</ContextMeta>
                    {mc.deloadWeek && (
                      <ContextMeta style={{ color: '#FFB800' }}>Deload: Week {mc.deloadWeek}</ContextMeta>
                    )}
                  </ExerciseCard>
                ))}

                <SectionDivider>Weekly Schedule</SectionDivider>
                {plan.weeklySchedule.map(day => (
                  <ContextCard key={day.dayNumber} $severity="info">
                    <ContextLabel>Day {day.dayNumber}</ContextLabel>
                    <ContextValue>{day.focus}</ContextValue>
                  </ContextCard>
                ))}

                <SectionDivider>Recommendations</SectionDivider>
                {plan.recommendations.map((rec, i) => (
                  <InsightCard key={i} $type="nasm_phase">
                    <InsightMessage>{rec}</InsightMessage>
                  </InsightCard>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </Panel>

        {/* Right: AI Insights */}
        <Panel>
          <PanelTitle>AI Insights</PanelTitle>

          {workout && workout.explanations.map((exp, i) => (
            <InsightCard key={i} $type={exp.type}>
              <InsightMessage>{exp.message}</InsightMessage>
              {exp.details && exp.details.map((d, j) => (
                <InsightDetail key={j}>{d}</InsightDetail>
              ))}
            </InsightCard>
          ))}

          {!workout && !plan && (
            <ContextMeta style={{ textAlign: 'center', padding: 24 }}>
              Generate a workout to see AI reasoning and insights
            </ContextMeta>
          )}

          {workout && (
            <>
              <SectionDivider>Workout Summary</SectionDivider>
              <ContextCard $severity="info">
                <ContextLabel>Session Type</ContextLabel>
                <ContextValue>{workout.sessionType.toUpperCase()}</ContextValue>
              </ContextCard>
              <ContextCard $severity="info">
                <ContextLabel>NASM Phase</ContextLabel>
                <ContextValue>Phase {workout.nasmPhase}: {workout.phaseParams.name}</ContextValue>
                <ContextMeta>{workout.phaseParams.focus}</ContextMeta>
              </ContextCard>
              <ContextCard $severity={workout.context.painExclusions > 0 ? 'danger' : 'info'}>
                <ContextLabel>Safety</ContextLabel>
                <ContextValue>
                  {workout.context.painExclusions} exclusion(s), {workout.context.painWarnings} warning(s)
                </ContextValue>
              </ContextCard>
              <ContextCard $severity="info">
                <ContextLabel>Compensations Addressed</ContextLabel>
                <ContextValue>{workout.context.compensations} pattern(s) in warmup</ContextValue>
              </ContextCard>
            </>
          )}
        </Panel>
      </ThreePane>
    </PageWrapper>
  );
};

// Error Boundary

class WorkoutBuilderErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }

  render() {
    if (this.state.hasError) {
      return (
        <PageWrapper>
          <div style={{ textAlign: 'center', paddingTop: 80 }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'rgba(224,236,244,0.7)', marginBottom: 8 }}>
              Something went wrong
            </div>
            <p style={{ color: 'rgba(224,236,244,0.5)', marginBottom: 16 }}>
              The Workout Builder encountered an error.
            </p>
            <PrimaryButton style={{ width: 'auto', padding: '10px 24px' }} onClick={() => this.setState({ hasError: false })}>
              Try Again
            </PrimaryButton>
          </div>
        </PageWrapper>
      );
    }
    return this.props.children;
  }
}

const WorkoutBuilderPageWithBoundary: React.FC = () => (
  <WorkoutBuilderErrorBoundary>
    <WorkoutBuilderPage />
  </WorkoutBuilderErrorBoundary>
);

export default WorkoutBuilderPageWithBoundary;
