/**
 * ┌─── SUB-COMPONENT: ClassPreviewPanel ────────────────────────┐
 * │ PARENT: BootcampBuilderPage                                  │
 * │ PURPOSE: Center panel — two-board station/exercise preview   │
 * │ CLICK-OUTCOMES:                                              │
 * │ [Board Toggle] → Switches between Board 1 (main) / Board 2  │
 * │ [Exercise Row] → onSelectExercise → shows detail in right    │
 * │ [Save Button] → onSave → POST /api/bootcamp/save            │
 * └──────────────────────────────────────────────────────────────┘
 */
import React, { useMemo, useState } from 'react';
import styled, { css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Panel, PanelTitle, StationCard, StationHeader, StationName,
  ExerciseRow, TimingBadge, SectionDivider, InsightCard, PrimaryButton,
} from './BootcampBuilderStyles';
import { Trash2 } from 'lucide-react';
import type { GeneratedBootcamp, BootcampExercise } from '../../hooks/useBootcampAPI';

// ── Board Toggle Styled Components ────────────────────────────────────

const BoardToggleBar = styled.div`
  display: flex;
  gap: 0;
  margin-bottom: 12px;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid var(--border-soft, rgba(96, 192, 240, 0.2));
`;

const BoardTab = styled.button<{ $active: boolean; $board: 'main' | 'alternative' }>`
  flex: 1;
  min-height: 44px;
  padding: 8px 16px;
  border: none;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;

  ${({ $active, $board }) => {
    if ($active && $board === 'main') {
      return css`
        background: var(--accent-primary, #60c0f0);
        color: #000;
      `;
    }
    if ($active && $board === 'alternative') {
      return css`
        background: #FF6B35;
        color: #000;
      `;
    }
    return css`
      background: transparent;
      color: var(--text-secondary, rgba(224, 236, 244, 0.65));
      &:hover { background: rgba(255, 255, 255, 0.05); }
    `;
  }}
`;

const BoardLabel = styled.span<{ $board: 'main' | 'alternative' }>`
  display: inline-block;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 700;
  margin-left: 6px;
  ${({ $board }) => $board === 'alternative'
    ? css`background: rgba(255, 107, 53, 0.15); color: #FF6B35;`
    : css`background: rgba(96, 192, 240, 0.15); color: var(--accent-primary, #60c0f0);`
  }
`;

const RegressionLine = styled.div`
  padding: 2px 12px 6px 28px;
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  color: rgba(16, 185, 129, 0.7);
  display: flex;
  align-items: center;
  gap: 4px;

  &::before {
    content: '↳';
    color: rgba(16, 185, 129, 0.4);
    font-size: 13px;
  }

  span.label {
    color: rgba(224, 236, 244, 0.35);
    font-size: 10px;
  }
`;

const StretchSection = styled.div`
  background: rgba(0, 255, 136, 0.04);
  border: 1px solid rgba(0, 255, 136, 0.15);
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 12px;
`;

const StretchItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  font-size: 13px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.8));
`;

const FlowBadge = styled.span<{ $score: number }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  font-family: 'Fira Code', monospace;
  ${({ $score }) => {
    if ($score >= 80) return css`background: rgba(0,255,136,0.12); color: #00ff88;`;
    if ($score >= 50) return css`background: rgba(255,200,0,0.12); color: #ffc800;`;
    return css`background: rgba(255,60,60,0.12); color: #ff3c3c;`;
  }}
`;

const FlowInsightBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  margin-bottom: 12px;
  border-radius: 6px;
  background: rgba(96, 192, 240, 0.06);
  border: 1px solid rgba(96, 192, 240, 0.15);
  font-size: 12px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.65));
`;

const FlowMeter = styled.div<{ $score: number }>`
  width: 60px;
  height: 6px;
  border-radius: 3px;
  background: rgba(255,255,255,0.08);
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: ${({ $score }) => $score}%;
    border-radius: 3px;
    background: ${({ $score }) => {
      if ($score >= 80) return '#00ff88';
      if ($score >= 50) return '#ffc800';
      return '#ff3c3c';
    }};
    transition: width 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }
`;

const DeleteBtn = styled.button`
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid rgba(201, 42, 84, 0.3);
  background: rgba(201, 42, 84, 0.08);
  color: #C92A54;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  opacity: 0;
  transition: all 0.15s;
  &:hover { background: rgba(201, 42, 84, 0.2); opacity: 1; }
`;

const ClickableStationCard = styled(StationCard)<{ $active: boolean }>`
  border-color: ${({ $active }) => $active ? 'var(--accent-primary, #60C0F0)' : undefined};
  background: ${({ $active }) => $active ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, transparent)' : undefined};
  cursor: pointer;
  &:hover { border-color: var(--accent-primary, #60C0F0); }
`;

const ExRowWithDelete = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  &:hover ${DeleteBtn} { opacity: 0.7; }
`;

// ── Component ─────────────────────────────────────────────────────────

interface ClassPreviewPanelProps {
  bootcamp: GeneratedBootcamp | null;
  loading: boolean;
  floorMode: boolean;
  saving: boolean;
  onSave: () => void;
  onSelectExercise: (ex: BootcampExercise) => void;
  onDeleteExercise?: (exerciseIndex: number) => void;
  onSelectStation?: (stationIndex: number) => void;
  activeStation?: number | null;
}

const ClassPreviewPanel: React.FC<ClassPreviewPanelProps> = ({
  bootcamp, loading, floorMode, saving, onSave, onSelectExercise,
  onDeleteExercise, onSelectStation, activeStation,
}) => {
  const [activeBoard, setActiveBoard] = useState<'main' | 'alternative'>('main');

  const { board1Exercises, board2Exercises, stationExercises, hasBoard2 } = useMemo(() => {
    if (!bootcamp) return { board1Exercises: [], board2Exercises: [], stationExercises: {}, hasBoard2: false };

    const b1 = bootcamp.exercises.filter(ex => (ex as any).board !== 'alternative');
    const b2 = bootcamp.exercises.filter(ex => (ex as any).board === 'alternative');

    const currentBoard = activeBoard === 'main' ? b1 : b2;
    const grouped = currentBoard.reduce<Record<number, BootcampExercise[]>>((acc, ex) => {
      const key = ex.stationIndex ?? -1;
      if (!acc[key]) acc[key] = [];
      acc[key].push(ex);
      return acc;
    }, {});

    return {
      board1Exercises: b1,
      board2Exercises: b2,
      stationExercises: grouped,
      hasBoard2: b2.length > 0,
    };
  }, [bootcamp, activeBoard]);

  const stretches = (bootcamp as any)?.stretches ?? [];
  const flowData: Array<{ station: number; flowScore: number; maxSetupSec: number; bottleneck: boolean }> =
    (bootcamp as any)?.flowData ?? [];
  const avgFlowScore = flowData.length > 0
    ? Math.round(flowData.reduce((sum, f) => sum + f.flowScore, 0) / flowData.length)
    : 100;

  return (
    <Panel>
      <PanelTitle>Class Preview</PanelTitle>

      <AnimatePresence>
        {bootcamp && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {/* Timing Badges */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <TimingBadge>{bootcamp.totalClassMin} min total</TimingBadge>
              <TimingBadge>{bootcamp.demoDuration} min demo</TimingBadge>
              {stretches.length > 0 && <TimingBadge>{(bootcamp as any).stretchDurationMin ?? 3} min stretch</TimingBadge>}
              <TimingBadge>{bootcamp.totalWorkoutMin} min workout</TimingBadge>
              <TimingBadge>{bootcamp.clearDuration} min clear</TimingBadge>
              <TimingBadge>{bootcamp.stationCount || 'No'} stations</TimingBadge>
              {(bootcamp as any).classStyle && (bootcamp as any).classStyle !== 'standard' && (
                <TimingBadge>{(bootcamp as any).classStyle}</TimingBadge>
              )}
            </div>

            {/* Flow Optimization Insight */}
            {flowData.length > 0 && activeBoard === 'main' && (
              <FlowInsightBar>
                <span>Flow</span>
                <FlowMeter $score={avgFlowScore} />
                <FlowBadge $score={avgFlowScore}>{avgFlowScore}/100</FlowBadge>
                <span style={{ marginLeft: 'auto', opacity: 0.6 }}>
                  {flowData.filter(f => f.bottleneck).length === 0
                    ? 'All stations optimized'
                    : `${flowData.filter(f => f.bottleneck).length} bottleneck${flowData.filter(f => f.bottleneck).length > 1 ? 's' : ''}`
                  }
                </span>
              </FlowInsightBar>
            )}

            {/* Board Toggle */}
            {hasBoard2 && (
              <BoardToggleBar>
                <BoardTab
                  $active={activeBoard === 'main'}
                  $board="main"
                  onClick={() => setActiveBoard('main')}
                  type="button"
                >
                  Board 1 — Main Intensity
                </BoardTab>
                <BoardTab
                  $active={activeBoard === 'alternative'}
                  $board="alternative"
                  onClick={() => setActiveBoard('alternative')}
                  type="button"
                >
                  Board 2 — Modified
                </BoardTab>
              </BoardToggleBar>
            )}

            {/* Warm-Up Stretches */}
            {stretches.length > 0 && activeBoard === 'main' && (
              <>
                <SectionDivider>Warm-Up Stretch</SectionDivider>
                <StretchSection>
                  {stretches.map((s: any, i: number) => (
                    <StretchItem key={i}>
                      <span>{s.sortOrder ?? i + 1}. {s.exerciseName}</span>
                      <span style={{ opacity: 0.6 }}>{s.durationSec}s</span>
                    </StretchItem>
                  ))}
                </StretchSection>
              </>
            )}

            {/* Station Cards */}
            {bootcamp.stations.length > 0 ? (
              bootcamp.stations.map((station, si) => {
                const exercises = stationExercises[si] ?? [];
                if (exercises.length === 0 && activeBoard === 'alternative') return null;

                return (
                  <ClickableStationCard
                    key={station.stationNumber}
                    $active={activeStation === si}
                    onClick={() => onSelectStation?.(si)}
                    style={
                      activeBoard === 'alternative'
                        ? { borderColor: 'rgba(255, 107, 53, 0.3)', background: 'rgba(255, 107, 53, 0.04)' }
                        : undefined
                    }
                  >
                    <StationHeader>
                      <StationName>
                        {station.stationName}
                        {activeStation === si && (
                          <BoardLabel $board="main">ADDING HERE</BoardLabel>
                        )}
                        {activeBoard === 'alternative' && (
                          <BoardLabel $board="alternative">MODIFIED</BoardLabel>
                        )}
                      </StationName>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        {exercises.length > 0 && (
                          <TimingBadge>
                            {exercises.length} ex · {Math.ceil(exercises.reduce((s, e) => s + (e.durationSec || 35) + (e.restSec || 15), 0) / 60)}min
                          </TimingBadge>
                        )}
                        {station.equipmentNeeded && (
                          <TimingBadge>{station.equipmentNeeded}</TimingBadge>
                        )}
                        {activeBoard === 'main' && flowData[si] && (
                          <FlowBadge $score={flowData[si].flowScore}>
                            {flowData[si].flowScore}
                            {flowData[si].bottleneck && ' ⚠'}
                          </FlowBadge>
                        )}
                      </div>
                    </StationHeader>
                    {exercises.length === 0 && (
                      <div style={{ padding: '12px 14px', opacity: 0.4, fontSize: 12, fontStyle: 'italic' }}>
                        {activeStation === si ? 'Click "+" on exercises to add here' : 'Click to select this station, then add exercises'}
                      </div>
                    )}
                    {exercises.map((ex, exIdx) => {
                      // Find the global index of this exercise in bootcamp.exercises
                      const globalIdx = bootcamp.exercises.indexOf(ex);
                      return (
                        <React.Fragment key={`${si}-${ex.sortOrder}-${exIdx}-${activeBoard}`}>
                          <ExRowWithDelete>
                            <ExerciseRow
                              $isCardio={ex.isCardioFinisher}
                              onClick={(e) => { e.stopPropagation(); onSelectExercise(ex); }}
                              type="button"
                              style={{ flex: 1 }}
                            >
                              <span>
                                {exIdx + 1}. {ex.exerciseName}
                                {ex.isCardioFinisher && ' (cardio finisher)'}
                              </span>
                              <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                {(ex as any).setupTimeSec > 5 && (
                                  <span style={{ fontSize: 10, opacity: 0.5 }}>{(ex as any).setupTimeSec}s setup</span>
                                )}
                                {ex.durationSec}s
                              </span>
                            </ExerciseRow>
                            {onDeleteExercise && (
                              <DeleteBtn
                                onClick={(e) => { e.stopPropagation(); onDeleteExercise(globalIdx); }}
                                title={`Remove ${ex.exerciseName}`}
                                aria-label={`Remove ${ex.exerciseName}`}
                              >
                                <Trash2 size={12} />
                              </DeleteBtn>
                            )}
                          </ExRowWithDelete>
                          {activeBoard === 'main' && (ex.easyVariation || (ex as any).kneeMod || (ex as any).backMod) && (
                            <RegressionLine>
                              <span className="label">Easier:</span>
                              {ex.easyVariation || (ex as any).kneeMod || (ex as any).backMod || (ex as any).shoulderMod}
                            </RegressionLine>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </ClickableStationCard>
                );
              })
            ) : (activeBoard === 'main' ? board1Exercises : board2Exercises).length > 0 ? (
              <StationCard>
                <StationHeader>
                  <StationName>
                    {bootcamp.classFormat === 'full_group' ? 'Full Group Workout' : 'Class Exercises'}
                  </StationName>
                  <TimingBadge>{(activeBoard === 'main' ? board1Exercises : board2Exercises).length} exercises</TimingBadge>
                </StationHeader>
                {(activeBoard === 'main' ? board1Exercises : board2Exercises)
                  .map((ex, idx) => (
                    <React.Fragment key={`${ex.sortOrder}-${idx}-${activeBoard}`}>
                      <ExerciseRow
                        $isCardio={ex.isCardioFinisher}
                        onClick={() => onSelectExercise(ex)}
                        type="button"
                      >
                        <span>{idx + 1}. {ex.exerciseName}</span>
                        <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          {(ex as any).setupTimeSec > 5 && (
                            <span style={{ fontSize: 10, opacity: 0.5 }}>{(ex as any).setupTimeSec}s setup</span>
                          )}
                          {ex.durationSec}s
                        </span>
                      </ExerciseRow>
                      {activeBoard === 'main' && (ex.easyVariation || (ex as any).kneeMod || (ex as any).backMod) && (
                        <RegressionLine>
                          <span className="label">Easier:</span>
                          {ex.easyVariation || (ex as any).kneeMod || (ex as any).backMod || (ex as any).shoulderMod}
                        </RegressionLine>
                      )}
                    </React.Fragment>
                  ))}
              </StationCard>
            ) : null}

            {/* Overflow Plan */}
            {bootcamp.overflowPlan && (
              <>
                <SectionDivider>Overflow Plan</SectionDivider>
                <InsightCard $type="overflow">
                  <strong>Lap Rotation</strong> (triggers at {bootcamp.overflowPlan.triggerCount}+ participants)
                  <div style={{ marginTop: 6 }}>
                    {bootcamp.overflowPlan.lapExercises.map((lap, i) => (
                      <span key={i} style={{ marginRight: 8 }}>
                        {lap.name} ({lap.durationMin}min)
                      </span>
                    ))}
                  </div>
                </InsightCard>
              </>
            )}

            <div style={{ marginTop: 12 }}>
              <PrimaryButton $floorMode={floorMode} onClick={onSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save as Template'}
              </PrimaryButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!bootcamp && !loading && (
        <div style={{ textAlign: 'center', padding: 40, opacity: 0.5 }}>
          Configure your class and click Generate
        </div>
      )}
    </Panel>
  );
};

export default React.memo(ClassPreviewPanel);
