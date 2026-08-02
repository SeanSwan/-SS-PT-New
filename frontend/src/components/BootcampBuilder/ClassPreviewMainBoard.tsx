import React from 'react';
import { Trash2 } from 'lucide-react';
import type { BootcampExercise, GeneratedBootcamp } from '../../hooks/useBootcampAPI';
import BootcampSlotActionBar from './BootcampSlotActionBar';
import { StationCard, StationHeader, StationName, TimingBadge } from './BootcampBuilderStyles';
import { getBootcampFloorStationCount } from './BootcampDemoMode.stationCount';
import { BoardLabel } from './ClassPreviewPanel.previewStyles';
import {
  ClickableStationCard,
  DeleteBtn,
  ExerciseMeta,
  ExerciseRowFill,
  ExRowWithDelete,
  FlowBadge,
  RegressionLine,
  SetupTime,
  StationEmptyState,
  StationMetaRow,
} from './ClassPreviewPanel.exerciseStyles';

interface ClassPreviewMainBoardProps {
  bootcamp: GeneratedBootcamp;
  board1Exercises: BootcampExercise[];
  stationExercises: Record<number, BootcampExercise[]>;
  flowData: NonNullable<GeneratedBootcamp['flowData']>;
  activeStation?: number | null;
  onSelectExercise: (ex: BootcampExercise) => void;
  onDeleteExercise?: (exerciseIndex: number) => void;
  onDuplicateExercise?: (exerciseIndex: number) => void;
  onMoveExercise?: (exerciseIndex: number, targetStationIndex: number) => void;
  onSelectStation?: (stationIndex: number) => void;
}

const bootcampMainBoardExerciseKey = (
  ex: BootcampExercise,
  fallbackStationIndex: number | string,
): string => [
  'main-board',
  ex.exerciseLibraryId ?? 'custom',
  ex.board ?? 'main',
  ex.stationIndex ?? fallbackStationIndex,
  ex.sortOrder,
  ex.exerciseName,
  ex.durationSec,
  ex.restSec,
  ex.sourceExerciseName ?? '',
].join('|');

const getRegressionText = (ex: BootcampExercise) =>
  ex.easyVariation || ex.kneeMod || ex.backMod || ex.shoulderMod;

const ExerciseRowContent: React.FC<{ ex: BootcampExercise; label: string }> = ({ ex, label }) => (
  <>
    <span>{label}</span>
    <ExerciseMeta>
      {(ex.setupTimeSec ?? 0) > 5 && <SetupTime>{ex.setupTimeSec}s setup</SetupTime>}
      {ex.durationSec}s
    </ExerciseMeta>
  </>
);

const ClassPreviewMainBoard: React.FC<ClassPreviewMainBoardProps> = ({
  bootcamp,
  board1Exercises,
  stationExercises,
  flowData,
  activeStation,
  onSelectExercise,
  onDeleteExercise,
  onDuplicateExercise,
  onMoveExercise,
  onSelectStation,
}) => {
  const inferredStationCount = getBootcampFloorStationCount(bootcamp, bootcamp.stations.length);
  const hasStationLayout = bootcamp.stations.length > 0 || (bootcamp.stationCount ?? 0) > 1 || inferredStationCount > 1;
  const stationSlots = hasStationLayout
    ? Array.from({ length: inferredStationCount }, (_, stationIndex) => ({
      station: bootcamp.stations[stationIndex],
      stationIndex,
    }))
    : [];

  if (stationSlots.length > 0) {
    return (
      <>
        {stationSlots.map(({ station, stationIndex }) => {
          const exercises = stationExercises[stationIndex] ?? [];
          const stationName = station?.stationName ?? `Station ${stationIndex + 1}`;
          return (
            <ClickableStationCard
              key={station?.stationNumber ?? `station-${stationIndex}`}
              $active={activeStation === stationIndex}
              onClick={() => onSelectStation?.(stationIndex)}
            >
              <StationHeader>
                <StationName>
                  {stationName}
                  {activeStation === stationIndex && <BoardLabel $board="main">ADDING HERE</BoardLabel>}
                </StationName>
                <StationMetaRow>
                  {exercises.length > 0 && (
                    <TimingBadge>
                      {exercises.length} ex - {Math.ceil(exercises.reduce((sum, ex) => sum + (ex.durationSec || 35) + (ex.restSec || 15), 0) / 60)}min
                    </TimingBadge>
                  )}
                  {station?.equipmentNeeded && <TimingBadge>{station.equipmentNeeded}</TimingBadge>}
                  {flowData[stationIndex] && (
                    <FlowBadge $score={flowData[stationIndex].flowScore}>
                      {flowData[stationIndex].flowScore}
                      {flowData[stationIndex].bottleneck && ' Alert'}
                    </FlowBadge>
                  )}
                </StationMetaRow>
              </StationHeader>
              {exercises.length === 0 && (
                <StationEmptyState>
                  {activeStation === stationIndex ? 'Click "+" on exercises to add here' : 'Click to select this station, then add exercises'}
                </StationEmptyState>
              )}
              {exercises.map((ex, exIdx) => {
                const globalIdx = bootcamp.exercises.findIndex(
                  (candidate) => candidate.sortOrder === ex.sortOrder && candidate.stationIndex === ex.stationIndex
                );
                const deleteIdx = globalIdx >= 0 ? globalIdx : exIdx;
                return (
                  <React.Fragment key={bootcampMainBoardExerciseKey(ex, stationIndex)}>
                    <ExRowWithDelete>
                      <ExerciseRowFill
                        $isCardio={ex.isCardioFinisher}
                        onClick={(event) => { event.stopPropagation(); onSelectExercise(ex); }}
                        type="button"
                      >
                        <ExerciseRowContent
                          ex={ex}
                          label={`${exIdx + 1}. ${ex.exerciseName}${ex.isCardioFinisher ? ' (cardio finisher)' : ''}`}
                        />
                      </ExerciseRowFill>
                      {onDeleteExercise && (
                        <DeleteBtn
                          onClick={(event) => { event.stopPropagation(); onDeleteExercise(deleteIdx); }}
                          title={`Remove ${ex.exerciseName}`}
                          aria-label={`Remove ${ex.exerciseName}`}
                        >
                          <Trash2 size={14} />
                        </DeleteBtn>
                      )}
                    </ExRowWithDelete>
                    {getRegressionText(ex) && (
                      <RegressionLine>
                        <span className="label">{ex.easyVariation ? 'Easier:' : ex.kneeMod ? 'Knee:' : ex.backMod ? 'Back:' : 'Mod:'}</span>
                        {getRegressionText(ex)}
                      </RegressionLine>
                    )}
                    {onDeleteExercise && onDuplicateExercise && onMoveExercise && (
                      <BootcampSlotActionBar
                        exerciseName={ex.exerciseName}
                        stationCount={inferredStationCount}
                        stationIndex={stationIndex}
                        onDuplicate={() => onDuplicateExercise(deleteIdx)}
                        onMove={(targetStationIndex) => onMoveExercise(deleteIdx, targetStationIndex)}
                        onRemove={() => onDeleteExercise(deleteIdx)}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </ClickableStationCard>
          );
        })}
      </>
    );
  }

  if (board1Exercises.length === 0) return null;

  return (
    <StationCard>
      <StationHeader>
        <StationName>{bootcamp.classFormat === 'full_group' ? 'Full Group Workout' : 'Class Exercises'}</StationName>
        <TimingBadge>{board1Exercises.length} exercises</TimingBadge>
      </StationHeader>
      {board1Exercises.map((ex, idx) => {
        const globalIdx = bootcamp.exercises.findIndex(
          (candidate) => candidate === ex || (
            candidate.sortOrder === ex.sortOrder
            && (candidate.stationIndex ?? 0) === (ex.stationIndex ?? 0)
            && (!candidate.board || candidate.board === 'main')
          )
        );
        const deleteIdx = globalIdx >= 0 ? globalIdx : idx;
        return (
          <React.Fragment key={bootcampMainBoardExerciseKey(ex, ex.stationIndex ?? 'flat')}>
            <ExRowWithDelete>
              <ExerciseRowFill $isCardio={ex.isCardioFinisher} onClick={() => onSelectExercise(ex)} type="button">
                <ExerciseRowContent ex={ex} label={`${idx + 1}. ${ex.exerciseName}`} />
              </ExerciseRowFill>
              {onDeleteExercise && (
                <DeleteBtn
                  onClick={(event) => { event.stopPropagation(); onDeleteExercise(deleteIdx); }}
                  title={`Remove ${ex.exerciseName}`}
                  aria-label={`Remove ${ex.exerciseName}`}
                >
                  <Trash2 size={14} />
                </DeleteBtn>
              )}
            </ExRowWithDelete>
            {getRegressionText(ex) && (
              <RegressionLine>
                <span className="label">Easier:</span>
                {getRegressionText(ex)}
              </RegressionLine>
            )}
          </React.Fragment>
        );
      })}
    </StationCard>
  );
};

export default ClassPreviewMainBoard;
