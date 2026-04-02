/**
 * ============================================================================
 * FILE: TeachModeSidebar.tsx
 * PURPOSE: 3-tab educational sidebar with deep exercise intelligence
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * AI VILLAGE VALIDATED: 2026-03-31
 * ============================================================================
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: TeachModeSidebar                                 ║
 * ║  PURPOSE: Deep exercise encyclopedia with 3 tabs             ║
 * ║  OWNER: Claude Opus 4.6 (CEO)                               ║
 * ║  LAST VALIDATED: 2026-03-31 (14-Brain AI Village)           ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌──────────────────────────────────────┐
 * │ BookOpen  Teach Mode            [X]  │
 * ├──────────────────────────────────────┤
 * │ [How To Perform][Phase][Learn&Watch] │
 * ├──────────────────────────────────────┤
 * │ ▼ Step-by-Step Instructions          │
 * │   1. Set up bench...                │
 * │   2. Grip bar...                    │
 * │ ▼ Coaching Cues                     │
 * │   "Drive feet into floor"           │
 * │ ▼ Muscles Worked                    │
 * │   Primary: Chest, Triceps           │
 * │ ▼ Biomechanics                      │
 * │   Pattern: Push | Force: Push       │
 * │ ▼ Safety                            │
 * │   Use spotter for heavy loads       │
 * │ ▼ Equipment                         │
 * │   Barbell, Bench, Plates            │
 * └──────────────────────────────────────┘
 *
 * DATA FLOW:
 * Props In: { exercise: ExerciseSlim, phaseNumber, onPhaseChange }
 * Hooks:    useExerciseTeachData(exerciseId) → deep data from API
 * API:      GET /api/exercises/:id/teach-mode
 * Children: HowToPerformTab, PhaseProgressionTab, LearnWatchTab
 *
 * CLICK-OUTCOME FLOWCHART:
 * [Tab: "How To Perform"] → Shows instructions/cues/muscles/safety
 * [Tab: "Phase & Progression"] → Shows OPT params + phase buttons
 * [Tab: "Learn & Watch"] → Shows videos + Oracle + NASM wisdom
 * [Accordion header] → Expand/collapse section
 * [Phase button] → onPhaseChange(phaseNum) → updates params
 */

import React, { useState, useMemo, memo } from 'react';
import { BookOpen, ClipboardList, TrendingUp, PlayCircle } from 'lucide-react';
import type { ExerciseSlim } from '../../../WorkoutLogger/exerciseSearchWorker';
import { useExerciseTeachData } from '../../../../features/teach-mode/hooks/useExerciseTeachData';
import { TabBar, TabButton, TabContent, SkeletonLine, EmptyDataMsg } from '../../../../features/teach-mode/styles/TeachModeStyles';
import { Panel, PanelHeader, PanelTitle, PanelBody, EmptyMessage } from './WorkoutPlannerStyles';
import HowToPerformTab from '../../../../features/teach-mode/components/tabs/HowToPerformTab';
import PhaseProgressionTab from '../../../../features/teach-mode/components/tabs/PhaseProgressionTab';
import LearnWatchTab from '../../../../features/teach-mode/components/tabs/LearnWatchTab';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────
interface TeachModeSidebarProps {
  exercise: ExerciseSlim | null;
  phaseNumber: number;
  onPhaseChange?: (phase: number) => void;
}

type TabId = 'how-to-perform' | 'phase-progression' | 'learn-watch';

const TAB_CONFIG: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'how-to-perform', label: 'How To', icon: <ClipboardList size={14} /> },
  { id: 'phase-progression', label: 'Phase', icon: <TrendingUp size={14} /> },
  { id: 'learn-watch', label: 'Learn', icon: <PlayCircle size={14} /> },
];

// ─────────────────────────────────────────────────────────────
// SECTION: Loading Skeleton
// ─────────────────────────────────────────────────────────────
const TeachModeSkeleton: React.FC = () => (
  <div role="status" aria-live="polite" aria-label="Loading teach mode data">
    <SkeletonLine $width="60%" />
    <SkeletonLine />
    <SkeletonLine $width="80%" />
    <SkeletonLine $width="45%" />
    <div style={{ height: 16 }} />
    <SkeletonLine $width="50%" />
    <SkeletonLine />
    <SkeletonLine $width="70%" />
  </div>
);

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────
const TeachModeSidebar: React.FC<TeachModeSidebarProps> = ({ exercise, phaseNumber, onPhaseChange }) => {
  // "how-to-perform" is default tab (AI Village CRITICAL requirement)
  const [activeTab, setActiveTab] = useState<TabId>('how-to-perform');

  // Fetch deep teach data when exercise is selected
  const { data: teachData, isLoading, error, refetch } = useExerciseTeachData(
    exercise?.id ?? null
  );

  // Exercise name for header
  const exerciseName = useMemo(
    () => teachData?.name || exercise?.name || '',
    [teachData, exercise]
  );

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
            {/* Exercise Name */}
            <div style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: '0.95rem',
              fontWeight: 700,
              color: 'var(--text-primary, #E0ECF4)',
              marginBottom: 12,
            }}>
              {exerciseName}
            </div>

            {/* 3-Tab Bar */}
            <TabBar role="tablist" aria-label="Teach Mode tabs">
              {TAB_CONFIG.map(tab => (
                <TabButton
                  key={tab.id}
                  $active={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  aria-controls={`panel-${tab.id}`}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                    {tab.icon}
                    {tab.label}
                  </span>
                </TabButton>
              ))}
            </TabBar>

            {/* Loading State */}
            {isLoading && <TeachModeSkeleton />}

            {/* Error State */}
            {error && (
              <div style={{
                padding: 16,
                borderRadius: 8,
                borderLeft: '3px solid #C92A54',
                background: 'color-mix(in srgb, #C92A54 6%, transparent)',
                marginBottom: 12,
              }} role="alert">
                <p style={{
                  margin: 0,
                  fontFamily: "'Sora', sans-serif",
                  fontSize: '0.78rem',
                  color: 'var(--text-primary, #E0ECF4)',
                  marginBottom: 8,
                }}>
                  {error}
                </p>
                <button
                  onClick={refetch}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 6,
                    border: '1px solid var(--accent-primary, #60C0F0)',
                    background: 'transparent',
                    color: 'var(--accent-primary, #60C0F0)',
                    fontFamily: "'Sora', sans-serif",
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    minHeight: 44,
                  }}
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Tab Content — all mounted, visibility toggled via CSS (preserves state) */}
            {teachData && (
              <>
                <TabContent $visible={activeTab === 'how-to-perform'} id="panel-how-to-perform">
                  <HowToPerformTab data={teachData} />
                </TabContent>

                <TabContent $visible={activeTab === 'phase-progression'} id="panel-phase-progression">
                  <PhaseProgressionTab
                    data={teachData}
                    phaseNumber={phaseNumber}
                    onPhaseChange={onPhaseChange}
                  />
                </TabContent>

                <TabContent $visible={activeTab === 'learn-watch'} id="panel-learn-watch">
                  <LearnWatchTab data={teachData} phaseNumber={phaseNumber} />
                </TabContent>
              </>
            )}

            {/* No data yet and not loading */}
            {!teachData && !isLoading && !error && (
              <EmptyDataMsg>
                Select an exercise to load deep instruction data.
              </EmptyDataMsg>
            )}
          </>
        ) : (
          <EmptyMessage>
            Select an exercise to see step-by-step instructions, coaching cues,
            safety tips, biomechanics, progression paths, and OPT phase guidance.
          </EmptyMessage>
        )}
      </PanelBody>
    </Panel>
  );
};

export default memo(TeachModeSidebar);
