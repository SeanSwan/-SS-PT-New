/**
 * ┌─── SUB-COMPONENT: ClassPreviewPanel ────────────────────────┐
 * │ PARENT: BootcampBuilderPage                                  │
 * │ PURPOSE: Center panel — three-board station/exercise preview │
 * │ CLICK-OUTCOMES:                                              │
 * │ [Board Toggle] → Switches between Board 1 / Board 2 / Board 3│
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
import { Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import type { GeneratedBootcamp, BootcampExercise } from '../../hooks/useBootcampAPI';
import { getLowImpactSwap } from './BootcampExerciseAlternatives';

type BoardView = 'main' | 'jointFriendly' | 'lowImpact';

// ── Board Toggle Styled Components ────────────────────────────────────

const BoardToggleBar = styled.div`
  display: flex;
  gap: 0;
  margin-bottom: 12px;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid var(--border-soft, rgba(96, 192, 240, 0.2));
`;

const BoardTab = styled.button<{ $active: boolean; $board: BoardView }>`
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
    if ($active && $board === 'jointFriendly') {
      return css`
        background: var(--accent-gold, #C6A84B);
        color: var(--bg-base, #0A0A0F);
      `;
    }
    if ($active && $board === 'lowImpact') {
      return css`
        background: var(--success, #10B981);
        color: var(--bg-base, #0A0A0F);
      `;
    }
    return css`
      background: transparent;
      color: var(--text-secondary, rgba(224, 236, 244, 0.65));
      &:hover { background: rgba(255, 255, 255, 0.05); }
    `;
  }}
`;

const BoardLabel = styled.span<{ $board: BoardView }>`
  display: inline-block;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 700;
  margin-left: 6px;
  ${({ $board }) => {
    if ($board === 'jointFriendly') {
      return css`
        background: color-mix(in srgb, var(--accent-gold, #C6A84B) 16%, transparent);
        color: var(--accent-gold, #C6A84B);
      `;
    }
    if ($board === 'lowImpact') {
      return css`
        background: color-mix(in srgb, var(--success, #10B981) 16%, transparent);
        color: var(--success, #10B981);
      `;
    }
    return css`
      background: color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent);
      color: var(--text-primary, #E0ECF4);
    `;
  }}
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
  color: var(--text-secondary, rgba(224, 236, 244, 0.85));
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

// ── Board 2 Modification Table Styles ──

const ModAccordionHeader = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 14px;
  min-height: 48px;
  border: none;
  border-bottom: 1px solid rgba(96, 192, 240, 0.06);
  background: var(--bg-elevated, #141419);
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s;
  &:hover { background: var(--bg-surface, #1A1A24); }
`;

const ModTable = styled.div`
  padding: 0 8px 8px;
`;

const ModRow = styled.div<{ $even: boolean; $type?: 'easy' | 'hard' | 'joint' }>`
  display: flex;
  align-items: center;
  min-height: 40px;
  padding: 6px 12px;
  border-radius: 6px;
  margin-bottom: 2px;
  background: ${({ $even, $type }) => {
    if ($type === 'easy') return 'rgba(16, 185, 129, 0.06)';
    if ($type === 'hard') return 'rgba(201, 42, 84, 0.06)';
    return $even ? 'rgba(96, 192, 240, 0.03)' : 'transparent';
  }};
  border-left: 3px solid ${({ $type }) => {
    if ($type === 'easy') return '#10B981';
    if ($type === 'hard') return '#C92A54';
    return 'transparent';
  }};
`;

const ModLabel = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted, rgba(224, 236, 244, 0.45));
  min-width: 100px;
  flex-shrink: 0;
`;

const ModValue = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-primary, #E0ECF4);
`;

const ModCount = styled.span`
  font-size: 10px;
  margin-left: auto;
  opacity: 0.5;
`;

const EmptyModState = styled.div`
  font-size: 11px;
  font-style: italic;
  opacity: 0.4;
  padding: 8px 14px;
`;

const TimingBadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
`;

const FlowSummary = styled.span`
  margin-left: auto;
  opacity: 0.6;
`;

const MutedDuration = styled.span`
  opacity: 0.6;
`;

const AlternativeHint = styled.div`
  color: var(--text-muted, rgba(224, 236, 244, 0.45));
  font-size: 11px;
  font-style: italic;
  padding: 8px 0 4px;
`;

const LowImpactSwapRow = styled.button`
  width: 100%;
  min-height: 52px;
  border: 1px solid color-mix(in srgb, var(--success, #10B981) 22%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--success, #10B981) 7%, transparent);
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  display: grid;
  gap: 4px;
  margin-bottom: 6px;
  padding: 9px 12px;
  text-align: left;

  &:hover {
    border-color: color-mix(in srgb, var(--success, #10B981) 40%, transparent);
    background: color-mix(in srgb, var(--success, #10B981) 10%, transparent);
  }
`;

const LowImpactName = styled.span`
  font-size: 13px;
  font-weight: 700;
`;

const LowImpactValue = styled.span`
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));
  font-size: 12px;
  line-height: 1.35;
`;

const StationMetaRow = styled.div`
  align-items: center;
  display: flex;
  gap: 6px;
`;

const StationEmptyState = styled.div`
  font-size: 12px;
  font-style: italic;
  opacity: 0.4;
  padding: 12px 14px;
`;

const ExerciseRowFill = styled(ExerciseRow)`
  flex: 1;
`;

const ExerciseMeta = styled.span`
  align-items: center;
  display: flex;
  gap: 6px;
`;

const SetupTime = styled.span`
  font-size: 10px;
  opacity: 0.5;
`;

const OverflowItems = styled.div`
  margin-top: 6px;
`;

const OverflowLap = styled.span`
  margin-right: 8px;
`;

const SaveAction = styled.div`
  margin-top: 12px;
`;

const EmptyPanelState = styled.div`
  opacity: 0.5;
  padding: 40px;
  text-align: center;
`;

type ModificationKey =
  | 'easyVariation'
  | 'hardVariation'
  | 'kneeMod'
  | 'shoulderMod'
  | 'backMod'
  | 'ankleMod'
  | 'wristMod'
  | 'elbowMod'
  | 'footMod'
  | 'hipMod';

const MOD_FIELDS: Array<{ key: ModificationKey; label: string; icon: string; type: 'easy' | 'hard' | 'joint' }> = [
  { key: 'easyVariation', label: 'Easier Version', icon: '🟢', type: 'easy' },
  { key: 'hardVariation', label: 'Harder Version', icon: '🔴', type: 'hard' },
  { key: 'kneeMod', label: 'Knee-Friendly', icon: '🦵', type: 'joint' },
  { key: 'shoulderMod', label: 'Shoulder-Friendly', icon: '💪', type: 'joint' },
  { key: 'backMod', label: 'Lower Back-Friendly', icon: '🔙', type: 'joint' },
  { key: 'ankleMod', label: 'Ankle-Friendly', icon: '🦶', type: 'joint' },
  { key: 'wristMod', label: 'Wrist-Friendly', icon: '✋', type: 'joint' },
  { key: 'elbowMod', label: 'Elbow-Friendly', icon: '💪', type: 'joint' },
  { key: 'footMod', label: 'Foot-Friendly', icon: '👟', type: 'joint' },
  { key: 'hipMod', label: 'Hip-Friendly', icon: '🦴', type: 'joint' },
];

/** Render the modification accordion for a single exercise on Board 2 */
const ExerciseModAccordion: React.FC<{ ex: BootcampExercise; exIdx: number }> = ({ ex, exIdx }) => {
  const [open, setOpen] = useState(false);
  const mods = MOD_FIELDS.filter(m => {
    const val = ex[m.key];
    return typeof val === 'string' && val.length > 0 && val !== 'N/A' && val !== 'n/a' && val.trim().length > 0;
  });

  return (
    <div>
      <ModAccordionHeader onClick={() => setOpen(!open)}>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span>{exIdx + 1}. {ex.exerciseName}</span>
        <ModCount>
          {mods.length} alternatives
        </ModCount>
      </ModAccordionHeader>
      {open && mods.length > 0 && (
        <ModTable>
          {mods.map((mod, i) => (
            <ModRow key={mod.key} $even={i % 2 === 0} $type={mod.type}>
              <ModLabel>{mod.icon} {mod.label}</ModLabel>
              <ModValue>{ex[mod.key]}</ModValue>
            </ModRow>
          ))}
        </ModTable>
      )}
      {open && mods.length === 0 && (
        <EmptyModState>
          No modifications available yet — data is being populated
        </EmptyModState>
      )}
    </div>
  );
};

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
  const [activeBoard, setActiveBoard] = useState<BoardView>('main');

  const { board1Exercises, stationExercises } = useMemo(() => {
    if (!bootcamp) return { board1Exercises: [], stationExercises: {} };

    const b1 = bootcamp.exercises.filter(ex => ex.board !== 'alternative' && ex.board !== 'lowImpact');

    // For Board 1 (main), group by station
    const grouped = b1.reduce<Record<number, BootcampExercise[]>>((acc, ex) => {
      const key = ex.stationIndex ?? -1;
      if (!acc[key]) acc[key] = [];
      acc[key].push(ex);
      return acc;
    }, {});

    return { board1Exercises: b1, stationExercises: grouped };
  }, [bootcamp]);

  // Boards 2 and 3 are available when Board 1 has exercises.
  const hasBoards = board1Exercises.length > 0;

  const stretches = bootcamp?.stretches ?? [];
  const flowData: NonNullable<GeneratedBootcamp['flowData']> = bootcamp?.flowData ?? [];
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
            <TimingBadgeRow>
              <TimingBadge>{bootcamp.totalClassMin} min total</TimingBadge>
              <TimingBadge>{bootcamp.demoDuration} min demo</TimingBadge>
              {stretches.length > 0 && <TimingBadge>{bootcamp.stretchDurationMin ?? 3} min stretch</TimingBadge>}
              <TimingBadge>{bootcamp.totalWorkoutMin} min workout</TimingBadge>
              <TimingBadge>{bootcamp.clearDuration} min clear</TimingBadge>
              <TimingBadge>{bootcamp.stationCount || 'No'} stations</TimingBadge>
              {bootcamp.classStyle && bootcamp.classStyle !== 'standard' && (
                <TimingBadge>{bootcamp.classStyle}</TimingBadge>
              )}
            </TimingBadgeRow>

            {/* Flow Optimization Insight */}
            {flowData.length > 0 && activeBoard === 'main' && (
              <FlowInsightBar>
                <span>Flow</span>
                <FlowMeter $score={avgFlowScore} />
                <FlowBadge $score={avgFlowScore}>{avgFlowScore}/100</FlowBadge>
                <FlowSummary>
                  {flowData.filter(f => f.bottleneck).length === 0
                    ? 'All stations optimized'
                    : `${flowData.filter(f => f.bottleneck).length} bottleneck${flowData.filter(f => f.bottleneck).length > 1 ? 's' : ''}`
                  }
                </FlowSummary>
              </FlowInsightBar>
            )}

            {/* Board Toggle */}
            {hasBoards && (
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
                  $active={activeBoard === 'jointFriendly'}
                  $board="jointFriendly"
                  onClick={() => setActiveBoard('jointFriendly')}
                  type="button"
                >
                  Board 2 — Joint-Friendly Alternatives
                </BoardTab>
                <BoardTab
                  $active={activeBoard === 'lowImpact'}
                  $board="lowImpact"
                  onClick={() => setActiveBoard('lowImpact')}
                  type="button"
                >
                  Board 3 — Low-Impact Swaps
                </BoardTab>
              </BoardToggleBar>
            )}

            {/* Warm-Up Stretches */}
            {stretches.length > 0 && activeBoard === 'main' && (
              <>
                <SectionDivider>Warm-Up Stretch</SectionDivider>
                <StretchSection>
                  {stretches.map((s, i) => (
                    <StretchItem key={i}>
                      <span>{s.sortOrder ?? i + 1}. {s.exerciseName}</span>
                      <MutedDuration>{s.durationSec}s</MutedDuration>
                    </StretchItem>
                  ))}
                </StretchSection>
              </>
            )}

            {/* ── Board 2: Joint-Friendly Alternatives (Modification Accordions) ── */}
            {activeBoard === 'jointFriendly' && (
              <>
                <AlternativeHint>
                  Tap any exercise to see joint-friendly alternatives. Same exercises as Board 1 with modification options.
                </AlternativeHint>
                {bootcamp.stations.length > 0 ? (
                  bootcamp.stations.map((station, si) => {
                    const exercises = stationExercises[si] ?? [];
                    if (exercises.length === 0) return null;
                    return (
                      <StationCard key={`b2-${si}`}>
                        <StationHeader>
                          <StationName>{station.stationName}</StationName>
                          <TimingBadge>{exercises.length} exercises</TimingBadge>
                        </StationHeader>
                        {exercises.map((ex, exIdx) => (
                          <ExerciseModAccordion key={`b2-${si}-${exIdx}`} ex={ex} exIdx={exIdx} />
                        ))}
                      </StationCard>
                    );
                  })
                ) : board1Exercises.length > 0 ? (
                  <StationCard>
                    <StationHeader>
                      <StationName>All Exercises</StationName>
                      <TimingBadge>{board1Exercises.length} exercises</TimingBadge>
                    </StationHeader>
                    {board1Exercises.map((ex, exIdx) => (
                      <ExerciseModAccordion key={`b2-flat-${exIdx}`} ex={ex} exIdx={exIdx} />
                    ))}
                  </StationCard>
                ) : null}
              </>
            )}

            {/* ── Board 3: Low-Impact Swaps ── */}
            {activeBoard === 'lowImpact' && (
              <>
                <AlternativeHint>
                  Low-impact swaps prioritize no-jump patterns, shorter ranges, and supported positions while keeping the same training intent.
                </AlternativeHint>
                {bootcamp.stations.length > 0 ? (
                  bootcamp.stations.map((station, si) => {
                    const exercises = stationExercises[si] ?? [];
                    if (exercises.length === 0) return null;
                    return (
                      <StationCard key={`b3-${si}`}>
                        <StationHeader>
                          <StationName>{station.stationName}</StationName>
                          <TimingBadge>{exercises.length} swaps</TimingBadge>
                        </StationHeader>
                        {exercises.map((ex, exIdx) => (
                          <LowImpactSwapRow
                            key={`b3-${si}-${exIdx}`}
                            type="button"
                            onClick={() => onSelectExercise(ex)}
                          >
                            <LowImpactName>{exIdx + 1}. {ex.exerciseName}</LowImpactName>
                            <LowImpactValue>{getLowImpactSwap(ex)}</LowImpactValue>
                          </LowImpactSwapRow>
                        ))}
                      </StationCard>
                    );
                  })
                ) : board1Exercises.length > 0 ? (
                  <StationCard>
                    <StationHeader>
                      <StationName>All Low-Impact Swaps</StationName>
                      <TimingBadge>{board1Exercises.length} swaps</TimingBadge>
                    </StationHeader>
                    {board1Exercises.map((ex, exIdx) => (
                      <LowImpactSwapRow
                        key={`b3-flat-${exIdx}`}
                        type="button"
                        onClick={() => onSelectExercise(ex)}
                      >
                        <LowImpactName>{exIdx + 1}. {ex.exerciseName}</LowImpactName>
                        <LowImpactValue>{getLowImpactSwap(ex)}</LowImpactValue>
                      </LowImpactSwapRow>
                    ))}
                  </StationCard>
                ) : null}
              </>
            )}

            {/* ── Board 1: Main Intensity (Normal Exercise Rows) ── */}
            {activeBoard === 'main' && bootcamp.stations.length > 0 ? (
              bootcamp.stations.map((station, si) => {
                const exercises = stationExercises[si] ?? [];
                return (
                  <ClickableStationCard
                    key={station.stationNumber}
                    $active={activeStation === si}
                    onClick={() => onSelectStation?.(si)}
                  >
                    <StationHeader>
                      <StationName>
                        {station.stationName}
                        {activeStation === si && (
                          <BoardLabel $board="main">ADDING HERE</BoardLabel>
                        )}
                      </StationName>
                      <StationMetaRow>
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
                      </StationMetaRow>
                    </StationHeader>
                    {exercises.length === 0 && (
                      <StationEmptyState>
                        {activeStation === si ? 'Click "+" on exercises to add here' : 'Click to select this station, then add exercises'}
                      </StationEmptyState>
                    )}
                    {exercises.map((ex, exIdx) => {
                      // Use sortOrder + stationIndex for a unique match instead of indexOf
                      // indexOf fails with duplicate exercises (always returns first match)
                      const globalIdx = bootcamp.exercises.findIndex(
                        (e) => e.sortOrder === ex.sortOrder && e.stationIndex === ex.stationIndex
                      );
                      return (
                        <React.Fragment key={`${si}-${ex.sortOrder}-${exIdx}-${activeBoard}`}>
                          <ExRowWithDelete>
                            <ExerciseRowFill
                              $isCardio={ex.isCardioFinisher}
                              onClick={(e) => { e.stopPropagation(); onSelectExercise(ex); }}
                              type="button"
                            >
                              <span>
                                {exIdx + 1}. {ex.exerciseName}
                                {ex.isCardioFinisher && ' (cardio finisher)'}
                              </span>
                              <ExerciseMeta>
                                {(ex.setupTimeSec ?? 0) > 5 && (
                                  <SetupTime>{ex.setupTimeSec}s setup</SetupTime>
                                )}
                                {ex.durationSec}s
                              </ExerciseMeta>
                            </ExerciseRowFill>
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
                          {activeBoard === 'main' && (ex.easyVariation || ex.kneeMod || ex.backMod) && (
                            <RegressionLine>
                              <span className="label">{ex.easyVariation ? 'Easier:' : ex.kneeMod ? 'Knee:' : ex.backMod ? 'Back:' : 'Mod:'}</span>
                              {ex.easyVariation || ex.kneeMod || ex.backMod || ex.shoulderMod}
                            </RegressionLine>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </ClickableStationCard>
                );
              })
            ) : activeBoard === 'main' && board1Exercises.length > 0 ? (
              <StationCard>
                <StationHeader>
                  <StationName>
                    {bootcamp.classFormat === 'full_group' ? 'Full Group Workout' : 'Class Exercises'}
                  </StationName>
                  <TimingBadge>{board1Exercises.length} exercises</TimingBadge>
                </StationHeader>
                {board1Exercises.map((ex, idx) => (
                    <React.Fragment key={`${ex.sortOrder}-${idx}-${activeBoard}`}>
                      <ExerciseRow
                        $isCardio={ex.isCardioFinisher}
                        onClick={() => onSelectExercise(ex)}
                        type="button"
                      >
                        <span>{idx + 1}. {ex.exerciseName}</span>
                        <ExerciseMeta>
                          {(ex.setupTimeSec ?? 0) > 5 && (
                            <SetupTime>{ex.setupTimeSec}s setup</SetupTime>
                          )}
                          {ex.durationSec}s
                        </ExerciseMeta>
                      </ExerciseRow>
                      {activeBoard === 'main' && (ex.easyVariation || ex.kneeMod || ex.backMod) && (
                        <RegressionLine>
                          <span className="label">Easier:</span>
                          {ex.easyVariation || ex.kneeMod || ex.backMod || ex.shoulderMod}
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
                  <OverflowItems>
                    {bootcamp.overflowPlan.lapExercises.map((lap, i) => (
                      <OverflowLap key={i}>
                        {lap.name} ({lap.durationMin}min)
                      </OverflowLap>
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

      {!bootcamp && !loading && (
        <EmptyPanelState>
          Configure your class and click Generate
        </EmptyPanelState>
      )}
    </Panel>
  );
};

export default React.memo(ClassPreviewPanel);
