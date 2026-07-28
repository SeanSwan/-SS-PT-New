import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Panel, PanelTitle, SectionDivider, InsightCard, PrimaryButton, TimingBadge } from './BootcampBuilderStyles';
import { buildBootcampBoardViews } from './BootcampBoardViews';
import BootcampCommandDeck from './BootcampCommandDeck';
import ClassPreviewAlternatives from './ClassPreviewAlternatives';
import ClassPreviewMainBoard from './ClassPreviewMainBoard';
import BootcampDemoMode from './BootcampDemoMode';
import type { BoardView, ClassPreviewPanelProps } from './ClassPreviewPanel.types';
import {
  BoardTab,
  BoardToggleBar,
  EmptyPanelState,
  FlowSummary,
  MutedDuration,
  OverflowItems,
  OverflowLap,
  SaveAction,
  StretchItem,
  StretchSection,
  TimingBadgeRow,
} from './ClassPreviewPanel.previewStyles';
import {
  FlowBadge,
  FlowInsightBar,
  FlowMeter,
} from './ClassPreviewPanel.exerciseStyles';
import type { GeneratedBootcamp } from '../../hooks/useBootcampAPI';

type BootcampStretchItem = NonNullable<GeneratedBootcamp['stretches']>[number];
type BootcampOverflowLap = NonNullable<GeneratedBootcamp['overflowPlan']>['lapExercises'][number];

export const bootcampStretchItemKey = (stretch: BootcampStretchItem): string => [
  'stretch',
  stretch.sortOrder,
  stretch.exerciseName,
  stretch.targetMuscles,
  stretch.durationSec,
].join('|');

export const bootcampOverflowLapKey = (lap: BootcampOverflowLap): string => [
  'overflow-lap',
  lap.name,
  lap.durationMin,
].join('|');

const ClassPreviewPanel: React.FC<ClassPreviewPanelProps> = ({
  bootcamp,
  buildMode,
  loading,
  floorMode,
  saving,
  onSave,
  onSelectExercise,
  onDeleteExercise,
  onSelectStation,
  activeStation,
}) => {
  const reduceMotion = useReducedMotion();
  const [activeBoard, setActiveBoard] = useState<BoardView>('main');
  const boardViews = useMemo(() => buildBootcampBoardViews(bootcamp?.exercises ?? []), [bootcamp]);
  const board1Exercises = boardViews.mainExercises;
  const stationExercises = boardViews.stationExercises;
  const hasBoards = board1Exercises.length > 0;
  const stretches = bootcamp?.stretches ?? [];
  const flowData: NonNullable<NonNullable<typeof bootcamp>['flowData']> = bootcamp?.flowData ?? [];
  const avgFlowScore = flowData.length > 0
    ? Math.round(flowData.reduce((sum, flow) => sum + flow.flowScore, 0) / flowData.length)
    : 100;
  const bottleneckCount = flowData.filter((flow) => flow.bottleneck).length;

  return (
    <Panel>
      <PanelTitle>Class Preview</PanelTitle>
      <AnimatePresence>
        {bootcamp && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.24 }}
          >
            <BootcampCommandDeck bootcamp={bootcamp} buildMode={buildMode} floorMode={floorMode} />
            <TimingBadgeRow>
              <TimingBadge>{bootcamp.totalClassMin} min total</TimingBadge>
              <TimingBadge>{bootcamp.demoDuration} min demo</TimingBadge>
              {stretches.length > 0 && <TimingBadge>{bootcamp.stretchDurationMin ?? 3} min stretch</TimingBadge>}
              <TimingBadge>{bootcamp.totalWorkoutMin} min workout</TimingBadge>
              <TimingBadge>{bootcamp.clearDuration} min clear</TimingBadge>
              <TimingBadge>{bootcamp.stationCount || 'No'} stations</TimingBadge>
              {bootcamp.classStyle && bootcamp.classStyle !== 'standard' && <TimingBadge>{bootcamp.classStyle}</TimingBadge>}
            </TimingBadgeRow>

            {flowData.length > 0 && activeBoard === 'main' && (
              <FlowInsightBar>
                <span>Flow</span>
                <FlowMeter $score={avgFlowScore} />
                <FlowBadge $score={avgFlowScore}>{avgFlowScore}/100</FlowBadge>
                <FlowSummary>
                  {bottleneckCount === 0
                    ? 'All stations optimized'
                    : `${bottleneckCount} bottleneck${bottleneckCount > 1 ? 's' : ''}`}
                </FlowSummary>
              </FlowInsightBar>
            )}

            {floorMode && activeBoard === 'main' && (
              <BootcampDemoMode bootcamp={bootcamp} onSelectExercise={onSelectExercise} />
            )}

            {hasBoards && (
              <BoardToggleBar>
                <BoardTab $active={activeBoard === 'main'} $board="main" onClick={() => setActiveBoard('main')} type="button">
                  Board 1 - Main Intensity
                </BoardTab>
                <BoardTab
                  $active={activeBoard === 'jointFriendly'}
                  $board="jointFriendly"
                  onClick={() => setActiveBoard('jointFriendly')}
                  type="button"
                >
                  Board 2 - Joint-Friendly Alternatives
                </BoardTab>
                <BoardTab
                  $active={activeBoard === 'lowImpact'}
                  $board="lowImpact"
                  onClick={() => setActiveBoard('lowImpact')}
                  type="button"
                >
                  Board 3 - Low-Impact Swaps
                </BoardTab>
              </BoardToggleBar>
            )}

            {stretches.length > 0 && activeBoard === 'main' && (
              <>
                <SectionDivider>Warm-Up Stretch</SectionDivider>
                <StretchSection>
                  {stretches.map((stretch, index) => (
                    <StretchItem key={bootcampStretchItemKey(stretch)}>
                      <span>{stretch.sortOrder ?? index + 1}. {stretch.exerciseName}</span>
                      <MutedDuration>{stretch.durationSec}s</MutedDuration>
                    </StretchItem>
                  ))}
                </StretchSection>
              </>
            )}

            {activeBoard === 'main' ? (
              <ClassPreviewMainBoard
                bootcamp={bootcamp}
                board1Exercises={board1Exercises}
                stationExercises={stationExercises}
                flowData={flowData}
                activeStation={activeStation}
                onSelectExercise={onSelectExercise}
                onDeleteExercise={onDeleteExercise}
                onSelectStation={onSelectStation}
              />
            ) : (
              <ClassPreviewAlternatives
                activeBoard={activeBoard}
                bootcamp={bootcamp}
                boardViews={boardViews}
                board1Exercises={board1Exercises}
                onSelectExercise={onSelectExercise}
              />
            )}

            {bootcamp.overflowPlan && (
              <>
                <SectionDivider>Overflow Plan</SectionDivider>
                <InsightCard $type="overflow">
                  <strong>Lap Rotation</strong> (triggers at {bootcamp.overflowPlan.triggerCount}+ participants)
                  <OverflowItems>
                    {bootcamp.overflowPlan.lapExercises.map((lap) => (
                      <OverflowLap key={bootcampOverflowLapKey(lap)}>{lap.name} ({lap.durationMin}min)</OverflowLap>
                    ))}
                  </OverflowItems>
                </InsightCard>
              </>
            )}

            <SaveAction>
              <PrimaryButton $floorMode={floorMode} onClick={onSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save as Template'}
              </PrimaryButton>
            </SaveAction>
          </motion.div>
        )}
      </AnimatePresence>

      {!bootcamp && !loading && <EmptyPanelState>Configure your class and click Generate</EmptyPanelState>}
    </Panel>
  );
};

export default React.memo(ClassPreviewPanel);
