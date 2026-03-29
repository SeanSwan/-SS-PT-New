/**
 * ============================================================================
 * FILE: TeachModeSidebar.tsx
 * PURPOSE: Educational sidebar showing exercise wisdom, NASM data, OPT phase info
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-28
 * AI VILLAGE VALIDATED: 2026-03-28
 * ============================================================================
 *
 * ┌─── SUB-COMPONENT: TeachModeSidebar ─────────────────────┐
 * │ PARENT: WorkoutPlannerPage                               │
 * │ PURPOSE: Educate trainer on exercise selection rationale  │
 * │ WIREFRAME:                                               │
 * │ ┌──────────────────────────────────┐                     │
 * │ │ "Why This Exercise?"             │                     │
 * │ │ [Cormorant Garamond wisdom text] │                     │
 * │ │ ───────────────────────────────  │                     │
 * │ │ Exercise Data Card (Fira Code)   │                     │
 * │ │ Primary: Chest, Triceps          │                     │
 * │ │ Equipment: Barbell, Bench        │                     │
 * │ │ ───────────────────────────────  │                     │
 * │ │ OPT Phase: Strength Endurance    │                     │
 * │ │ Sets: 2-4 | Reps: 8-12          │                     │
 * │ └──────────────────────────────────┘                     │
 * │ Props: { exercise, phase, isOpen }                       │
 * └──────────────────────────────────────────────────────────┘
 */

import React, { useMemo, lazy, Suspense } from 'react';
import { BookOpen, Dumbbell, Zap, Target } from 'lucide-react';

// Oracle widget — lazy-loaded since it's behind Teach Mode toggle
const OracleInsightsWidget = lazy(
  () => import('../admin-dashboard/components/OracleInsightsWidget')
);
import type { ExerciseSlim } from '../../../WorkoutLogger/exerciseSearchWorker';
import type { OPTPhaseParams } from './WorkoutPlannerTypes';
import { OPT_PHASES } from './WorkoutPlannerTypes';
import {
  Panel, PanelHeader, PanelTitle, PanelBody,
  WisdomText, DataRow, DataLabel, DataValue,
  PhaseBadge, PhaseLabel, PhaseParams, EmptyMessage,
} from './WorkoutPlannerStyles';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────
interface TeachModeSidebarProps {
  exercise: ExerciseSlim | null;
  phaseNumber: number;
  onPhaseChange?: (phase: number) => void;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Wisdom Generator
// ─────────────────────────────────────────────────────────────
const generateWisdom = (exercise: ExerciseSlim, phase: OPTPhaseParams): string => {
  const muscles = exercise.primaryMuscles.length > 0
    ? exercise.primaryMuscles.join(', ')
    : exercise.bodyPartCategory;

  const phaseContext: Record<number, string> = {
    1: `In Phase 1 (Stabilization Endurance), this exercise builds proprioceptive awareness and joint stability. The slow 4/2/1 tempo forces controlled eccentric loading, teaching proper motor patterns before adding heavy resistance.`,
    2: `In Phase 2 (Strength Endurance), we pair stabilization with progressive loading. This exercise develops the neuromuscular foundation needed for heavier phases, using moderate intensity (70-80% 1RM) with controlled tempo.`,
    3: `Phase 3 (Hypertrophy) maximizes time under tension for muscle growth. This exercise targets ${muscles} with the volume and intensity needed to stimulate muscular adaptation and cross-sectional fiber growth.`,
    4: `In Phase 4 (Maximal Strength), peak force production is the goal. Heavy loading at 85-100% 1RM with longer rest periods allows full neural recovery between sets, building absolute strength capacity.`,
    5: `Phase 5 (Power) combines strength with speed. This exercise develops rate of force production through explosive concentric contractions, often supersetted with a heavy strength movement for contrast training.`,
  };

  return `${exercise.name} targets ${muscles}. ${phaseContext[phase.phase] || phaseContext[2]}`;
};

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
const TeachModeSidebar: React.FC<TeachModeSidebarProps> = ({ exercise, phaseNumber, onPhaseChange }) => {
  const phase = useMemo(
    () => OPT_PHASES.find(p => p.phase === phaseNumber) || OPT_PHASES[1],
    [phaseNumber]
  );

  const wisdom = useMemo(
    () => exercise ? generateWisdom(exercise, phase) : '',
    [exercise, phase]
  );

  const difficultyLabel = useMemo(() => {
    if (!exercise) return '';
    const d = exercise.difficulty;
    if (d <= 200) return 'Beginner';
    if (d <= 400) return 'Intermediate';
    if (d <= 600) return 'Advanced';
    if (d <= 800) return 'Expert';
    return 'Elite';
  }, [exercise]);

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>
          <BookOpen size={18} />
          Teach Mode
        </PanelTitle>
      </PanelHeader>
      <PanelBody>
        {exercise ? (
          <>
            {/* Wisdom Section */}
            <WisdomText>{wisdom}</WisdomText>

            {/* Exercise Data Card */}
            <PanelTitle style={{ fontSize: '0.85rem', marginBottom: 12 }}>
              <Dumbbell size={16} />
              Exercise Data
            </PanelTitle>
            <DataRow>
              <DataLabel>Exercise</DataLabel>
              <DataValue>{exercise.name}</DataValue>
            </DataRow>
            <DataRow>
              <DataLabel>Type</DataLabel>
              <DataValue>{exercise.exerciseType}</DataValue>
            </DataRow>
            <DataRow>
              <DataLabel>Body Part</DataLabel>
              <DataValue>{exercise.bodyPartCategory}</DataValue>
            </DataRow>
            <DataRow>
              <DataLabel>Primary Muscles</DataLabel>
              <DataValue>{exercise.primaryMuscles.join(', ') || 'General'}</DataValue>
            </DataRow>
            <DataRow>
              <DataLabel>Difficulty</DataLabel>
              <DataValue>{exercise.difficulty}/900 ({difficultyLabel})</DataValue>
            </DataRow>
            <DataRow style={{ borderBottom: 'none' }}>
              <DataLabel>Exercise Key</DataLabel>
              <DataValue style={{ fontSize: '0.65rem' }}>{exercise.exerciseKey}</DataValue>
            </DataRow>

            {/* OPT Phase Section */}
            <div style={{ marginTop: 20 }}>
              <PanelTitle style={{ fontSize: '0.85rem', marginBottom: 12 }}>
                <Zap size={16} />
                OPT Phase {phase.phase}
              </PanelTitle>
              <PhaseBadge>
                <PhaseLabel>Phase {phase.phase}</PhaseLabel>
                <PhaseParams>{phase.name}</PhaseParams>
              </PhaseBadge>
              <div style={{
                fontFamily: "'Sora', sans-serif",
                fontSize: '0.8rem',
                color: 'var(--text-secondary, rgba(224, 236, 244, 0.7))',
                lineHeight: 1.5,
                marginBottom: 16,
              }}>
                {phase.focus}
              </div>
              <DataRow>
                <DataLabel>Sets</DataLabel>
                <DataValue>{phase.sets}</DataValue>
              </DataRow>
              <DataRow>
                <DataLabel>Reps</DataLabel>
                <DataValue>{phase.reps}</DataValue>
              </DataRow>
              <DataRow>
                <DataLabel>Tempo</DataLabel>
                <DataValue>{phase.tempo}</DataValue>
              </DataRow>
              <DataRow>
                <DataLabel>Rest</DataLabel>
                <DataValue>{phase.rest}</DataValue>
              </DataRow>
              <DataRow style={{ borderBottom: 'none' }}>
                <DataLabel>Intensity</DataLabel>
                <DataValue>{phase.intensity}</DataValue>
              </DataRow>
            </div>

            {/* Phase Progression */}
            <div style={{ marginTop: 20 }}>
              <PanelTitle style={{ fontSize: '0.85rem', marginBottom: 12 }}>
                <Target size={16} />
                Phase Progression
              </PanelTitle>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {OPT_PHASES.map(p => (
                  <button
                    key={p.phase}
                    type="button"
                    onClick={() => onPhaseChange?.(p.phase)}
                    title={`Switch to Phase ${p.phase}: ${p.name}`}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      fontSize: '0.7rem',
                      fontFamily: "'Fira Code', monospace",
                      cursor: onPhaseChange ? 'pointer' : 'default',
                      minHeight: 44,
                      minWidth: 44,
                      background: p.phase === phaseNumber
                        ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 20%, transparent)'
                        : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 5%, transparent)',
                      border: `1px solid ${p.phase === phaseNumber
                        ? 'var(--accent-secondary, #8B5CF6)'
                        : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent)'}`,
                      color: p.phase === phaseNumber
                        ? 'var(--text-primary, #E0ECF4)'
                        : 'var(--text-muted, rgba(224, 236, 244, 0.5))',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    Ph {p.phase}
                  </button>
                ))}
              </div>
            </div>

            {/* Swan Oracle — context-relevant videos and research */}
            <div style={{ marginTop: 20 }}>
              <Suspense fallback={
                <div style={{
                  padding: '16px',
                  textAlign: 'center',
                  color: 'rgba(224,236,244,0.4)',
                  fontFamily: "'Sora', sans-serif",
                  fontSize: '0.75rem',
                }}>
                  Loading Oracle...
                </div>
              }>
                <OracleInsightsWidget
                  defaultTab="youtube"
                  defaultQuery={`${exercise.name} exercise technique form`}
                  compact
                />
              </Suspense>
            </div>
          </>
        ) : (
          <EmptyMessage>
            Select an exercise to see NASM coaching insights, form cues, and phase-specific guidance.
          </EmptyMessage>
        )}
      </PanelBody>
    </Panel>
  );
};

export default React.memo(TeachModeSidebar);
