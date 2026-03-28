/**
 * ============================================================================
 * FILE: WorkoutPlannerPage.tsx
 * PURPOSE: NASM Workout Planner with exercise rolodex, builder, teach mode, and AI generation
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-28
 * AI VILLAGE VALIDATED: 2026-03-28
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Admin/Trainer workout planning page. Three-panel layout:
 *   Left: Exercise Rolodex (840+ exercises with search/filter)
 *   Center: Workout Builder (selected exercises with NASM parameters)
 *   Right: Teach Mode sidebar (educational content per selected exercise)
 * HOW IT FITS IN THE APP: Admin Dashboard → Workouts → Workout Planner
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: WorkoutPlannerPage                               ║
 * ║  PURPOSE: NASM OPT-based workout planning with Coach AI      ║
 * ║  OWNER: Claude Opus 4.6                                      ║
 * ║  LAST VALIDATED: 2026-03-28                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────────────────────────────┐
 * │ NASM Workout Planner  [Client▾] [Phase▾] [Category▾]     │
 * │                       [AI Generate] [Teach Mode]          │
 * ├──────────┬────────────────────────┬───────────────────────┤
 * │ Rolodex  │  Workout Builder       │  Teach Mode           │
 * │ [Search] │  Phase 2: Str. Endur.  │  "Why This Exercise?" │
 * │ [Chips]  │  1. Bench Press 4x8-12 │  [Wisdom text...]     │
 * │ ● Bench  │  2. DB Rows    4x8-12  │  ────────────────     │
 * │ ○ Squat  │  3. Squats     4x8-12  │  Exercise Data Card   │
 * │ ○ Rows   │  [+ Add Exercise]      │  OPT Phase Info       │
 * └──────────┴────────────────────────┴───────────────────────┘
 *
 * DATA FLOW:
 * Props In:  none (page-level)
 * State:     { clients, selectedClient, exercises, phase, planExercises, teachMode }
 * API Calls: GET /api/auth/clients, GET /api/exercises/all,
 *            POST /api/workout-builder/generate, POST /api/workout-builder/plan
 * Children:  TeachModeSidebar
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dumbbell, Search, Sparkles, BookOpen, Plus, X, Calendar,
  Loader2, Save, Download, Zap, AlertTriangle, ChevronDown, ChevronUp, Info,
} from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { useExerciseSearch } from '../../../WorkoutLogger/useExerciseSearch';
import type { ExerciseSlim } from '../../../WorkoutLogger/exerciseSearchWorker';
import TeachModeSidebar from './TeachModeSidebar';
import {
  type PlanExercise, type PlannerClient, type WorkoutCategory,
  type GeneratedWorkout, type GeneratedPlan, type PlanDuration,
  OPT_PHASES, WORKOUT_CATEGORIES, PLAN_GOALS, PLAN_DURATIONS,
  type PlanGoal,
} from './WorkoutPlannerTypes';
import {
  Page, Header, HeaderLeft, HeaderIcon, Title, Subtitle,
  ControlRow, Select, ActionBtn, ThreePanel,
  Panel, PanelHeader, PanelTitle, PanelBody,
  SearchWrapper, SearchInput, ChipRow, Chip,
  ExerciseItem, ExerciseName, ExerciseMeta,
  BuilderRow, BuilderRowNumber, BuilderRowInfo, MiniInput, RemoveBtn,
  PhaseBadge, PhaseLabel, PhaseParams,
  SkeletonBlock, EmptyMessage, TeachToggle, StatusBanner, DegradedBanner,
  GeneratingSkeletonWrap, GeneratingSkeletonRow, SkeletonCircle, SkeletonBar,
  GeneratingLabel, ExplanationsPanel, ExplanationsToggle, ExplanationItem, ExplanationBadge,
  PlanModeBar, PlanModeLabel, SmallSelect,
  MesocycleSection, MesocycleSectionTitle, MesocycleGrid, MesocycleCard,
  MesocycleHeader, MesocycleTitle, MesocycleWeeks, MesocyclePhase,
  MesocycleParams, MesocycleParam, MesocycleOverload, DeloadBadge,
  ScheduleRow, ScheduleDay, ScheduleDayNumber, ScheduleDayFocus,
  RecommendationList, RecommendationItem,
} from './WorkoutPlannerStyles';

// ─────────────────────────────────────────────────────────────
// SECTION: Body Part Filter Categories
// ─────────────────────────────────────────────────────────────
const BODY_PARTS = [
  'All', 'Chest', 'Back', 'Shoulders', 'Arms', 'Legs',
  'Core', 'Full Body', 'Cardio', 'Recovery',
];

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
const WorkoutPlannerPage: React.FC = () => {
  const { authAxios, user } = useAuth();

  // ── Client State ──
  const [clients, setClients] = useState<PlannerClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [clientsLoading, setClientsLoading] = useState(true);

  // ── Planner State ──
  const [phaseNumber, setPhaseNumber] = useState(2);
  const [category, setCategory] = useState<WorkoutCategory>('full_body');
  const [goal, setGoal] = useState<PlanGoal>('general_fitness');
  const [planDuration, setPlanDuration] = useState<PlanDuration>('single');
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);
  const [planExercises, setPlanExercises] = useState<PlanExercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseSlim | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlan | null>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);

  // ── UI State ──
  const [teachModeOpen, setTeachModeOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [degradedIntelligence, setDegradedIntelligence] = useState(false);
  const [explanations, setExplanations] = useState<{ type: string; message: string; details?: string | string[] }[]>([]);
  const [showExplanations, setShowExplanations] = useState(false);

  // ── Exercise Search ──
  const {
    results: exerciseResults,
    isLoading: exercisesLoading,
    setQuery: setSearchQuery,
    setCategory: setFilterCategory,
    query: searchQuery,
    category: filterCategory,
  } = useExerciseSearch();

  const phase = useMemo(
    () => OPT_PHASES.find(p => p.phase === phaseNumber) || OPT_PHASES[1],
    [phaseNumber]
  );

  // ── Fetch Clients ──
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await authAxios.get('/api/auth/clients');
        if (res.data?.success && Array.isArray(res.data.clients)) {
          setClients(res.data.clients);
          if (res.data.clients.length > 0) {
            setSelectedClientId(res.data.clients[0].id);
          }
        }
      } catch {
        setClients([]);
      } finally {
        setClientsLoading(false);
      }
    };
    fetchClients();
  }, [authAxios]);

  // ── Add Exercise to Plan ──
  const addExercise = useCallback((ex: ExerciseSlim) => {
    setPlanExercises(prev => {
      if (prev.some(p => p.exerciseSlim.id === ex.id)) return prev;
      const defaultSets = parseInt(phase.sets.split('-')[0]) || 3;
      return [...prev, {
        id: `${ex.id}-${Date.now()}`,
        exerciseSlim: ex,
        sets: defaultSets,
        reps: phase.reps,
        tempo: phase.tempo,
        restSeconds: parseInt(phase.rest.replace(/[^0-9]/g, '')) || 60,
        intensityPercent: parseInt(phase.intensity.split('-')[0]) || 70,
        notes: '',
      }];
    });
    setSelectedExercise(ex);
  }, [phase]);

  // ── Remove Exercise ──
  const removeExercise = useCallback((id: string) => {
    setPlanExercises(prev => prev.filter(p => p.id !== id));
  }, []);

  // ── Update Exercise Params ──
  const updateExercise = useCallback((id: string, field: keyof PlanExercise, value: unknown) => {
    setPlanExercises(prev =>
      prev.map(p => p.id === id ? { ...p, [field]: value } : p)
    );
  }, []);

  // ── Coach AI: Generate Workout ──
  const handleAIGenerate = useCallback(async () => {
    if (!selectedClientId) return;
    setGenerating(true);
    setDegradedIntelligence(false);
    setStatusMsg(null);
    setExplanations([]);
    setShowExplanations(false);
    try {
      const res = await authAxios.post('/api/workout-builder/generate', {
        clientId: selectedClientId,
        category,
        exerciseCount: 6,
        rotationPattern: 'standard',
      });
      if (res.data?.success && res.data.workout) {
        const workout: GeneratedWorkout = res.data.workout;
        // Check for degraded intelligence (pain data unavailable)
        const isDegraded = res.data.workout.context?.criticalDataUnavailable === true;
        setDegradedIntelligence(isDegraded);
        if (isDegraded) {
          const safetyWarning = workout.explanations?.find(
            (e: { type: string; message: string }) => e.type === 'safety_warning'
          );
          setStatusMsg({
            type: 'error',
            text: safetyWarning?.message || 'Pain/injury data unavailable — review this workout carefully before assigning.',
          });
        }
        // Set phase from generated workout
        if (workout.nasmPhase) setPhaseNumber(workout.nasmPhase);
        // Convert generated exercises to plan exercises
        const generated: PlanExercise[] = workout.exercises.map((ex, i) => ({
          id: `gen-${i}-${Date.now()}`,
          exerciseSlim: {
            id: ex.exerciseKey,
            name: ex.exerciseName,
            exerciseKey: ex.exerciseKey,
            exerciseType: ex.category || 'compound',
            bodyPartCategory: ex.muscles?.[0] || 'Full Body',
            primaryMuscles: ex.muscles || [],
            difficulty: 300,
          },
          sets: ex.sets,
          reps: String(ex.reps),
          tempo: ex.tempo,
          // H5 FIX: Backend returns strings like "0-90s" / "70-80%" — parse to display
          restSeconds: typeof ex.rest === 'string' ? ex.rest.replace(/s$/, '') : String(ex.rest || ''),
          intensityPercent: typeof ex.intensity === 'string' ? ex.intensity : String(ex.intensity || ''),
          notes: ex.recommendedWeightMin
            ? `Recommended: ${ex.recommendedWeightMin}-${ex.recommendedWeightMax} lbs (based on ${ex.basedOn1RM} lb 1RM)`
            : '',
        }));
        setPlanExercises(generated);

        // Store explanations from the AI reasoning pipeline
        if (workout.explanations && workout.explanations.length > 0) {
          setExplanations(workout.explanations);
          setShowExplanations(true);
        }
      }
    } catch (err: unknown) {
      console.error('AI generation failed:', err);
      // Surface specific failure reason from backend error response
      const errData = (err as { response?: { data?: { error?: string; details?: string } } })?.response?.data;
      const specificMsg = errData?.details || errData?.error;
      if (specificMsg?.includes('client context unavailable')) {
        setStatusMsg({ type: 'error', text: 'Unable to generate workout: Client data could not be loaded. Verify the client has an active profile with pain entries and equipment profile.' });
      } else if (specificMsg?.includes('equipment')) {
        setStatusMsg({ type: 'error', text: `Unable to generate workout: ${specificMsg}. Please verify the client's equipment profile.` });
      } else if (specificMsg) {
        setStatusMsg({ type: 'error', text: `Workout generation failed: ${specificMsg}` });
      } else {
        setStatusMsg({ type: 'error', text: 'AI generation failed. Check client data and try again.' });
      }
    } finally {
      setGenerating(false);
    }
  }, [authAxios, selectedClientId, category]);

  // ── Coach AI: Generate Multi-Week Plan ──
  const handleGeneratePlan = useCallback(async () => {
    if (!selectedClientId || planDuration === 'single') return;
    setGeneratingPlan(true);
    setStatusMsg(null);
    setGeneratedPlan(null);
    try {
      const res = await authAxios.post('/api/workout-builder/plan', {
        clientId: selectedClientId,
        durationWeeks: Number(planDuration),
        sessionsPerWeek,
        primaryGoal: goal,
      });
      if (res.data?.success && res.data.plan) {
        setGeneratedPlan(res.data.plan);
        setStatusMsg({ type: 'success', text: `${res.data.plan.planSummary.durationWeeks}-week periodized plan generated successfully!` });
      }
    } catch (err: unknown) {
      console.error('Plan generation failed:', err);
      const errData = (err as { response?: { data?: { error?: string; details?: string } } })?.response?.data;
      const specificMsg = errData?.details || errData?.error;
      setStatusMsg({ type: 'error', text: specificMsg ? `Plan generation failed: ${specificMsg}` : 'Failed to generate training plan. Check client data and try again.' });
    } finally {
      setGeneratingPlan(false);
    }
  }, [authAxios, selectedClientId, planDuration, sessionsPerWeek, goal]);

  // ── Save Plan ──
  const handleSave = useCallback(async () => {
    if (!selectedClientId || planExercises.length === 0) return;
    setSaving(true);
    try {
      const client = clients.find(c => c.id === selectedClientId);
      await authAxios.post('/api/workout/plans', {
        userId: selectedClientId,
        title: `${client?.firstName || 'Client'}'s ${phase.name} Plan`,
        description: `${WORKOUT_CATEGORIES.find(c => c.value === category)?.label} — ${goal}`,
        durationWeeks: planDuration === 'single' ? 1 : Number(planDuration),
        status: 'draft',
        exercises: planExercises.map((p, i) => ({
          exerciseKey: p.exerciseSlim.exerciseKey,
          exerciseName: p.exerciseSlim.name,
          orderInWorkout: i + 1,
          sets: p.sets,
          reps: p.reps,
          tempo: p.tempo,
          restSeconds: p.restSeconds,
          intensityPercent: p.intensityPercent,
          notes: p.notes,
        })),
      });
      setStatusMsg({ type: 'success', text: 'Workout plan saved successfully!' });
    } catch (err) {
      console.error('Save failed:', err);
      setStatusMsg({ type: 'error', text: 'Failed to save plan. Please try again.' });
    } finally {
      setSaving(false);
    }
  }, [authAxios, selectedClientId, planExercises, phase, category, goal, clients, planDuration]);

  // ── Filter chip handler ──
  const handleChipClick = useCallback((bodyPart: string) => {
    setFilterCategory(bodyPart === 'All' ? null : bodyPart);
  }, [setFilterCategory]);

  return (
    <Page>
      {/* Header */}
      <Header>
        <HeaderLeft>
          <HeaderIcon><Dumbbell size={22} /></HeaderIcon>
          <div>
            <Title>NASM Workout Planner</Title>
            <Subtitle>Build intelligent, periodized training programs with 840+ exercises</Subtitle>
          </div>
        </HeaderLeft>
        <TeachToggle $active={teachModeOpen} onClick={() => setTeachModeOpen(v => !v)}>
          <BookOpen size={16} />
          Teach Mode {teachModeOpen ? 'On' : 'Off'}
        </TeachToggle>
      </Header>

      {/* Controls */}
      <ControlRow>
        <Select
          value={selectedClientId ?? ''}
          onChange={e => setSelectedClientId(Number(e.target.value))}
          aria-label="Select client"
        >
          {clientsLoading ? (
            <option>Loading clients...</option>
          ) : clients.length === 0 ? (
            <option>No clients found</option>
          ) : (
            clients.map(c => (
              <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
            ))
          )}
        </Select>
        <Select
          value={phaseNumber}
          onChange={e => setPhaseNumber(Number(e.target.value))}
          aria-label="Select OPT phase"
        >
          {OPT_PHASES.map(p => (
            <option key={p.phase} value={p.phase}>Phase {p.phase}: {p.name}</option>
          ))}
        </Select>
        <Select
          value={category}
          onChange={e => setCategory(e.target.value as WorkoutCategory)}
          aria-label="Select workout category"
        >
          {WORKOUT_CATEGORIES.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </Select>
        <Select
          value={goal}
          onChange={e => setGoal(e.target.value as PlanGoal)}
          aria-label="Select training goal"
        >
          {PLAN_GOALS.map(g => (
            <option key={g.value} value={g.value}>{g.label}</option>
          ))}
        </Select>
        <ActionBtn
          $variant="cosmic"
          onClick={planDuration === 'single' ? handleAIGenerate : handleGeneratePlan}
          disabled={generating || generatingPlan || !selectedClientId}
        >
          {generating || generatingPlan ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {generating || generatingPlan ? 'Generating...' : planDuration === 'single' ? 'AI Generate' : 'Generate Plan'}
        </ActionBtn>
      </ControlRow>

      {/* Plan Duration Controls */}
      <PlanModeBar>
        <PlanModeLabel><Calendar size={14} /> Plan Duration</PlanModeLabel>
        <SmallSelect
          value={planDuration}
          onChange={e => {
            setPlanDuration(e.target.value as PlanDuration);
            setGeneratedPlan(null);
          }}
          aria-label="Select plan duration"
        >
          {PLAN_DURATIONS.map(d => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </SmallSelect>
        {planDuration !== 'single' && (
          <>
            <PlanModeLabel>Sessions/Week</PlanModeLabel>
            <SmallSelect
              value={sessionsPerWeek}
              onChange={e => setSessionsPerWeek(Number(e.target.value))}
              aria-label="Sessions per week"
            >
              {[1, 2, 3, 4, 5, 6].map(n => (
                <option key={n} value={n}>{n}×/week</option>
              ))}
            </SmallSelect>
          </>
        )}
      </PlanModeBar>

      {/* Status Message */}
      {statusMsg && (
        <StatusBanner $type={statusMsg.type} role="alert">
          {statusMsg.text}
          <button onClick={() => setStatusMsg(null)} aria-label="Dismiss">&times;</button>
        </StatusBanner>
      )}

      {/* Degraded Intelligence Warning */}
      {degradedIntelligence && planExercises.length > 0 && (
        <DegradedBanner role="alert">
          <AlertTriangle size={20} />
          <div>
            <strong>Limited Context Mode</strong> — Pain/injury data could not be loaded for this client.
            This workout was generated without injury exclusions. Review each exercise carefully before assigning.
          </div>
        </DegradedBanner>
      )}

      {/* Three-Panel Layout */}
      <ThreePanel $teachModeOpen={teachModeOpen}>
        {/* Left: Exercise Rolodex */}
        <Panel>
          <PanelHeader>
            <PanelTitle><Search size={16} /> Exercise Rolodex</PanelTitle>
            <span style={{
              fontFamily: "'Fira Code', monospace",
              fontSize: '0.7rem',
              color: 'rgba(224, 236, 244, 0.5)',
            }}>
              {exerciseResults.length} results
            </span>
          </PanelHeader>
          <PanelBody>
            <SearchWrapper>
              <Search size={14} />
              <SearchInput
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search 840+ exercises..."
                aria-label="Search exercises"
              />
            </SearchWrapper>
            <ChipRow>
              {BODY_PARTS.map(bp => (
                <Chip
                  key={bp}
                  $active={filterCategory === null ? bp === 'All' : filterCategory === bp}
                  onClick={() => handleChipClick(bp)}
                >
                  {bp}
                </Chip>
              ))}
            </ChipRow>
            {exercisesLoading ? (
              Array.from({ length: 6 }, (_, i) => <SkeletonBlock key={i} />)
            ) : exerciseResults.length === 0 ? (
              <EmptyMessage>No exercises match your search.</EmptyMessage>
            ) : (
              exerciseResults.slice(0, 50).map(ex => (
                <ExerciseItem
                  key={ex.id}
                  $selected={selectedExercise?.id === ex.id}
                  onClick={() => {
                    setSelectedExercise(ex);
                    if (teachModeOpen) return; // Just select for teach mode
                    addExercise(ex);
                  }}
                  onDoubleClick={() => addExercise(ex)}
                >
                  <ExerciseName>{ex.name}</ExerciseName>
                  <ExerciseMeta>
                    <span>{ex.bodyPartCategory}</span>
                    <span>|</span>
                    <span>{ex.primaryMuscles.slice(0, 2).join(', ') || ex.exerciseType}</span>
                    <span>|</span>
                    <span>Diff: {ex.difficulty}</span>
                  </ExerciseMeta>
                </ExerciseItem>
              ))
            )}
          </PanelBody>
        </Panel>

        {/* Center: Workout Builder */}
        <Panel style={degradedIntelligence ? { border: '1px solid #C6A84B' } : undefined}>
          <PanelHeader>
            <PanelTitle><Zap size={16} /> Workout Builder</PanelTitle>
            <div style={{ display: 'flex', gap: 8 }}>
              <ActionBtn onClick={handleSave} disabled={saving || planExercises.length === 0}>
                {saving ? <Loader2 size={14} /> : <Save size={14} />}
                Save Plan
              </ActionBtn>
            </div>
          </PanelHeader>
          <PanelBody>
            {/* OPT Phase Indicator */}
            <PhaseBadge>
              <PhaseLabel>Phase {phase.phase}</PhaseLabel>
              <PhaseParams>
                {phase.name} — {phase.sets} sets × {phase.reps} reps — {phase.tempo} — {phase.rest}
              </PhaseParams>
            </PhaseBadge>

            {generating ? (
              <GeneratingSkeletonWrap role="status" aria-live="polite" aria-label="Generating workout">
                <GeneratingLabel>Coach AI is analyzing client data and building your workout...</GeneratingLabel>
                {Array.from({ length: 6 }, (_, i) => (
                  <GeneratingSkeletonRow key={i} style={{ animationDelay: `${i * 100}ms` }}>
                    <SkeletonCircle />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <SkeletonBar $width={`${60 + Math.random() * 30}%`} />
                      <SkeletonBar $width={`${30 + Math.random() * 20}%`} />
                    </div>
                  </GeneratingSkeletonRow>
                ))}
              </GeneratingSkeletonWrap>
            ) : planExercises.length === 0 ? (
              <EmptyMessage>
                Click exercises in the Rolodex to add them, or use AI Generate for an intelligent program.
              </EmptyMessage>
            ) : (
              planExercises.map((pe, idx) => (
                <BuilderRow key={pe.id}>
                  <BuilderRowNumber>{idx + 1}</BuilderRowNumber>
                  <BuilderRowInfo>
                    <ExerciseName
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedExercise(pe.exerciseSlim)}
                    >
                      {pe.exerciseSlim.name}
                    </ExerciseName>
                    <ExerciseMeta>
                      {pe.exerciseSlim.primaryMuscles.slice(0, 2).join(', ') || pe.exerciseSlim.bodyPartCategory}
                    </ExerciseMeta>
                  </BuilderRowInfo>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.6rem', color: 'rgba(224,236,244,0.4)', marginBottom: 2 }}>Sets</div>
                      <MiniInput
                        type="number"
                        value={pe.sets}
                        onChange={e => updateExercise(pe.id, 'sets', parseInt(e.target.value) || 1)}
                        min={1}
                        max={10}
                      />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.6rem', color: 'rgba(224,236,244,0.4)', marginBottom: 2 }}>Reps</div>
                      <MiniInput
                        value={pe.reps}
                        onChange={e => updateExercise(pe.id, 'reps', e.target.value)}
                        style={{ width: 64 }}
                      />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.6rem', color: 'rgba(224,236,244,0.4)', marginBottom: 2 }}>Tempo</div>
                      <MiniInput
                        value={pe.tempo}
                        onChange={e => updateExercise(pe.id, 'tempo', e.target.value)}
                        style={{ width: 56 }}
                      />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.6rem', color: 'rgba(224,236,244,0.4)', marginBottom: 2 }}>Rest(s)</div>
                      <MiniInput
                        type="number"
                        value={pe.restSeconds}
                        onChange={e => updateExercise(pe.id, 'restSeconds', parseInt(e.target.value) || 0)}
                        min={0}
                        max={600}
                      />
                    </div>
                  </div>
                  <RemoveBtn onClick={() => removeExercise(pe.id)} aria-label={`Remove ${pe.exerciseSlim.name}`}>
                    <X size={14} />
                  </RemoveBtn>
                </BuilderRow>
              ))
            )}

            {planExercises.length > 0 && (
              <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                <ActionBtn
                  onClick={() => {
                    // Quick add prompt — clear search to browse
                    setSearchQuery('');
                    setFilterCategory(null);
                  }}
                >
                  <Plus size={14} />
                  Add Exercise
                </ActionBtn>
              </div>
            )}

            {/* AI Explanations Panel — shows reasoning, pain exclusions, safety warnings */}
            {explanations.length > 0 && (
              <ExplanationsPanel>
                <ExplanationsToggle onClick={() => setShowExplanations(v => !v)}>
                  <Info size={16} />
                  AI Reasoning ({explanations.length} insight{explanations.length !== 1 ? 's' : ''})
                  {showExplanations ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </ExplanationsToggle>
                {showExplanations && explanations.map((exp, i) => (
                  <ExplanationItem key={i} $type={exp.type}>
                    <ExplanationBadge $type={exp.type}>
                      {exp.type.replace(/_/g, ' ')}
                    </ExplanationBadge>
                    <div>
                      <div>{exp.message}</div>
                      {exp.details && (
                        <div style={{
                          marginTop: 4,
                          fontSize: '0.7rem',
                          color: 'var(--text-muted, rgba(224, 236, 244, 0.5))',
                          fontFamily: "'Fira Code', monospace",
                        }}>
                          {Array.isArray(exp.details)
                            ? exp.details.join(' · ')
                            : exp.details}
                        </div>
                      )}
                    </div>
                  </ExplanationItem>
                ))}
              </ExplanationsPanel>
            )}
          </PanelBody>
        </Panel>

        {/* Right: Teach Mode (conditional) */}
        {teachModeOpen && (
          <TeachModeSidebar
            exercise={selectedExercise}
            phaseNumber={phaseNumber}
          />
        )}
      </ThreePanel>

      {/* Mesocycle Plan Display — shown after multi-week plan generation */}
      {generatedPlan && (
        <MesocycleSection>
          <MesocycleSectionTitle>
            <Calendar size={18} />
            {generatedPlan.planSummary.durationWeeks}-Week Periodized Plan
            — {generatedPlan.planSummary.totalSessions} Total Sessions
          </MesocycleSectionTitle>

          {/* Weekly Schedule */}
          <PlanModeLabel style={{ marginBottom: 8, display: 'block' }}>Weekly Schedule</PlanModeLabel>
          <ScheduleRow>
            {generatedPlan.weeklySchedule.map(day => (
              <ScheduleDay key={day.dayNumber}>
                <ScheduleDayNumber>Day {day.dayNumber}</ScheduleDayNumber>
                <ScheduleDayFocus>{day.focus}</ScheduleDayFocus>
              </ScheduleDay>
            ))}
          </ScheduleRow>

          {/* Mesocycle Cards */}
          <PlanModeLabel style={{ marginBottom: 8, display: 'block' }}>Mesocycles (4-Week Blocks)</PlanModeLabel>
          <MesocycleGrid>
            {generatedPlan.mesocycles.map(mc => (
              <MesocycleCard key={mc.mesocycle} $phase={mc.nasmPhase}>
                <MesocycleHeader>
                  <MesocycleTitle>Block {mc.mesocycle}</MesocycleTitle>
                  <MesocycleWeeks>Wk {mc.weeks}</MesocycleWeeks>
                </MesocycleHeader>
                <MesocyclePhase $phase={mc.nasmPhase}>
                  Phase {mc.nasmPhase}: {mc.phaseName}
                </MesocyclePhase>
                <MesocycleParams>
                  <MesocycleParam>Sets: <span>{mc.params.sets}</span></MesocycleParam>
                  <MesocycleParam>Reps: <span>{mc.params.reps}</span></MesocycleParam>
                  <MesocycleParam>Tempo: <span>{mc.params.tempo}</span></MesocycleParam>
                  <MesocycleParam>Rest: <span>{mc.params.rest}</span></MesocycleParam>
                  <MesocycleParam>Intensity: <span>{mc.params.intensity}</span></MesocycleParam>
                </MesocycleParams>
                <MesocycleOverload>
                  {mc.overloadStrategy}
                  {mc.deloadWeek && <DeloadBadge>Deload Wk {mc.deloadWeek}</DeloadBadge>}
                </MesocycleOverload>
              </MesocycleCard>
            ))}
          </MesocycleGrid>

          {/* Recommendations */}
          {generatedPlan.recommendations.length > 0 && (
            <>
              <PlanModeLabel style={{ marginTop: 20, marginBottom: 8, display: 'block' }}>
                AI Recommendations
              </PlanModeLabel>
              <RecommendationList>
                {generatedPlan.recommendations.map((rec, i) => (
                  <RecommendationItem key={i}>{rec}</RecommendationItem>
                ))}
              </RecommendationList>
            </>
          )}
        </MesocycleSection>
      )}
    </Page>
  );
};

export default WorkoutPlannerPage;
