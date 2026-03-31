/**
 * ============================================================================
 * FILE: LearnWatchTab.tsx
 * PURPOSE: Video demonstrations, scientific references, NASM wisdom
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * AI VILLAGE VALIDATED: 2026-03-31
 * ============================================================================
 *
 * ┌─── SUB-COMPONENT: LearnWatchTab ────────────────────────────┐
 * │ PARENT: TeachModeSidebar                                     │
 * │ PURPOSE: Videos, Oracle widget, scientific references,       │
 * │   and NASM wisdom text for the selected exercise             │
 * │ Props: { data, phaseNumber }                                 │
 * └──────────────────────────────────────────────────────────────┘
 */

import React, { useMemo, memo, lazy, Suspense } from 'react';
import type { ExerciseTeachData } from '../../types/TeachModeContracts';
import type { OPTPhaseParams } from '../../../../components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerTypes';
import { OPT_PHASES } from '../../../../components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerTypes';
import { EmptyDataMsg, SkeletonLine } from '../../styles/TeachModeStyles';

const OracleInsightsWidget = lazy(
  () => import('../../../../components/DashBoard/Pages/admin-dashboard/components/OracleInsightsWidget')
);

interface LearnWatchTabProps {
  data: ExerciseTeachData;
  phaseNumber: number;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Wisdom Generator (NASM context-specific prose)
// ─────────────────────────────────────────────────────────────
const generateWisdom = (exercise: ExerciseTeachData, phase: OPTPhaseParams): string => {
  const muscles = exercise.primaryMuscles.length > 0
    ? exercise.primaryMuscles.join(', ')
    : exercise.bodyPartCategory || 'target muscles';

  const phaseContext: Record<number, string> = {
    1: `In Phase 1 (Stabilization Endurance), ${exercise.name} builds proprioceptive awareness and joint stability. The slow 4/2/1 tempo forces controlled eccentric loading, teaching proper motor patterns before adding heavy resistance.`,
    2: `In Phase 2 (Strength Endurance), we pair stabilization with progressive loading. ${exercise.name} develops the neuromuscular foundation needed for heavier phases, using moderate intensity (70-80% 1RM) with controlled tempo.`,
    3: `Phase 3 (Hypertrophy) maximizes time under tension for muscle growth. ${exercise.name} targets ${muscles} with the volume and intensity needed to stimulate muscular adaptation and cross-sectional fiber growth.`,
    4: `In Phase 4 (Maximal Strength), peak force production is the goal. Heavy loading at 85-100% 1RM with longer rest periods allows full neural recovery between sets, building absolute strength capacity with ${exercise.name}.`,
    5: `Phase 5 (Power) combines strength with speed. ${exercise.name} develops rate of force production through explosive concentric contractions, often supersetted with a heavy strength movement for contrast training.`,
  };

  return phaseContext[phase.phase] || phaseContext[2];
};

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
const LearnWatchTab: React.FC<LearnWatchTabProps> = ({ data, phaseNumber }) => {
  const phase = useMemo(
    () => OPT_PHASES.find(p => p.phase === phaseNumber) || OPT_PHASES[1],
    [phaseNumber]
  );

  const wisdom = useMemo(() => generateWisdom(data, phase), [data, phase]);

  return (
    <div role="tabpanel" aria-label="Learn & Watch">
      {/* Video embed (if available) */}
      {data.videoUrl && (
        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: '0.8rem',
            fontWeight: 700,
            color: 'var(--text-primary, #E0ECF4)',
            marginBottom: 8,
          }}>
            Video Demonstration
          </div>
          <div style={{
            position: 'relative',
            paddingBottom: '56.25%',
            height: 0,
            borderRadius: 8,
            overflow: 'hidden',
            background: 'var(--bg-surface, #1A1A24)',
          }}>
            <iframe
              src={data.videoUrl}
              title={`${data.name} demonstration`}
              allowFullScreen
              loading="lazy"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                border: 'none',
              }}
            />
          </div>
        </div>
      )}

      {/* NASM Wisdom */}
      <div style={{ marginBottom: 16 }}>
        <div style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: '0.8rem',
          fontWeight: 700,
          color: 'var(--text-primary, #E0ECF4)',
          marginBottom: 8,
        }}>
          NASM Wisdom
        </div>
        <div style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontStyle: 'italic',
          fontSize: '0.88rem',
          lineHeight: 1.7,
          color: 'var(--text-secondary, rgba(224, 236, 244, 0.7))',
          padding: '12px 14px',
          borderRadius: 8,
          background: 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 5%, transparent)',
          borderLeft: '3px solid var(--accent-secondary, #8B5CF6)',
        }}>
          {wisdom}
        </div>
      </div>

      {/* Scientific References */}
      {data.scientificReferences && (
        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: '0.8rem',
            fontWeight: 700,
            color: 'var(--text-primary, #E0ECF4)',
            marginBottom: 8,
          }}>
            Scientific References
          </div>
          <div style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: '0.72rem',
            lineHeight: 1.6,
            color: 'var(--text-muted, rgba(224, 236, 244, 0.5))',
            whiteSpace: 'pre-wrap',
          }}>
            {data.scientificReferences}
          </div>
        </div>
      )}

      {/* Swan Oracle — YouTube/Research/Scholar */}
      <div style={{ marginTop: 16 }}>
        <div style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: '0.8rem',
          fontWeight: 700,
          color: 'var(--text-primary, #E0ECF4)',
          marginBottom: 8,
        }}>
          Swan Oracle
        </div>
        <Suspense fallback={
          <div style={{ padding: 12 }} role="status" aria-live="polite" aria-label="Loading Oracle">
            <SkeletonLine $width="80%" />
            <SkeletonLine $width="60%" />
            <SkeletonLine $width="90%" />
          </div>
        }>
          <OracleInsightsWidget
            defaultTab="youtube"
            defaultQuery={`${data.name} exercise technique form`}
            compact
          />
        </Suspense>
      </div>
    </div>
  );
};

export default memo(LearnWatchTab);
