import type { BootcampExercise, BootcampStation, GeneratedBootcamp } from '../../hooks/useBootcampAPI';
import { StationCard, StationHeader, StationName, TimingBadge } from './BootcampBuilderStyles';
import { getLowImpactDisplay } from './BootcampBoardViews';
import { getBootcampFloorStationCount } from './BootcampDemoMode.stationCount';
import type { BoardView, BootcampBoardViews } from './ClassPreviewPanel.types';
import {
  AlternativeHint,
  LowImpactName,
  LowImpactSwapRow,
  LowImpactValue,
} from './ClassPreviewPanel.exerciseStyles';
import ExerciseModAccordion from './ExerciseModAccordion';

interface ClassPreviewAlternativesProps {
  activeBoard: BoardView;
  bootcamp: GeneratedBootcamp;
  boardViews: BootcampBoardViews;
  board1Exercises: BootcampExercise[];
  onSelectExercise: (ex: BootcampExercise) => void;
}

export const bootcampAlternativeStationKey = (
  board: BoardView,
  station: BootcampStation | undefined,
  stationIndex: number,
): string => [
  board,
  'station',
  station?.stationNumber ?? stationIndex,
  station?.stationName ?? `Station ${stationIndex + 1}`,
  station?.equipmentNeeded ?? '',
].join('|');

export const bootcampAlternativeExerciseKey = (
  board: BoardView,
  ex: BootcampExercise,
  fallbackStationIndex: number | string,
): string => [
  board,
  ex.exerciseLibraryId ?? 'custom',
  ex.board ?? board,
  ex.stationIndex ?? fallbackStationIndex,
  ex.sortOrder,
  ex.exerciseName,
  ex.durationSec,
  ex.restSec,
  ex.sourceExerciseName ?? '',
].join('|');

export const bootcampLowImpactSwapKey = (
  ex: BootcampExercise,
  fallbackStationIndex: number | string,
): string => bootcampAlternativeExerciseKey('lowImpact', ex, fallbackStationIndex);

const ClassPreviewAlternatives: React.FC<ClassPreviewAlternativesProps> = ({
  activeBoard,
  bootcamp,
  boardViews,
  board1Exercises,
  onSelectExercise,
}) => {
  const inferredStationCount = getBootcampFloorStationCount(bootcamp, bootcamp.stations.length);
  const hasStationLayout = bootcamp.stations.length > 0 || (bootcamp.stationCount ?? 0) > 1 || inferredStationCount > 1;
  const stationSlots = hasStationLayout
    ? Array.from({ length: inferredStationCount }, (_, stationIndex) => ({
      station: bootcamp.stations[stationIndex],
      stationIndex,
    }))
    : [];

  if (activeBoard === 'jointFriendly') {
    return (
      <>
        <AlternativeHint>
          Tap any exercise to see joint-friendly alternatives. Same exercises as Board 1 with modification options.
        </AlternativeHint>
        {stationSlots.length > 0 ? (
          stationSlots.map(({ station, stationIndex }) => {
            const exercises = boardViews.getJointFriendlyExercises(stationIndex);
            if (exercises.length === 0) return null;
            return (
              <StationCard key={bootcampAlternativeStationKey('jointFriendly', station, stationIndex)}>
                <StationHeader>
                  <StationName>{station?.stationName ?? `Station ${stationIndex + 1}`}</StationName>
                  <TimingBadge>{exercises.length} exercises</TimingBadge>
                </StationHeader>
                {exercises.map((ex, exIdx) => (
                  <ExerciseModAccordion
                    key={bootcampAlternativeExerciseKey('jointFriendly', ex, stationIndex)}
                    ex={ex}
                    exIdx={exIdx}
                  />
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
            {(boardViews.jointFriendlyExercises.length > 0 ? boardViews.jointFriendlyExercises : board1Exercises).map((ex, exIdx) => (
              <ExerciseModAccordion
                key={bootcampAlternativeExerciseKey('jointFriendly', ex, 'flat')}
                ex={ex}
                exIdx={exIdx}
              />
            ))}
          </StationCard>
        ) : null}
      </>
    );
  }

  if (activeBoard !== 'lowImpact') return null;

  const renderLowImpactSwap = (ex: BootcampExercise, exIdx: number, fallbackStationIndex: number | string) => {
    const display = getLowImpactDisplay(ex);
    return (
      <LowImpactSwapRow
        key={bootcampLowImpactSwapKey(ex, fallbackStationIndex)}
        type="button"
        onClick={() => onSelectExercise(ex)}
      >
        <LowImpactName>{exIdx + 1}. {display.sourceName}</LowImpactName>
        <LowImpactValue>{display.swapName}</LowImpactValue>
      </LowImpactSwapRow>
    );
  };

  return (
    <>
      <AlternativeHint>
        Low-impact swaps prioritize no-jump patterns, shorter ranges, and supported positions while keeping the same training intent.
      </AlternativeHint>
      {stationSlots.length > 0 ? (
        stationSlots.map(({ station, stationIndex }) => {
          const exercises = boardViews.getLowImpactExercises(stationIndex);
          if (exercises.length === 0) return null;
          return (
            <StationCard key={bootcampAlternativeStationKey('lowImpact', station, stationIndex)}>
              <StationHeader>
                <StationName>{station?.stationName ?? `Station ${stationIndex + 1}`}</StationName>
                <TimingBadge>{exercises.length} swaps</TimingBadge>
              </StationHeader>
              {exercises.map((ex, exIdx) => renderLowImpactSwap(ex, exIdx, stationIndex))}
            </StationCard>
          );
        })
      ) : board1Exercises.length > 0 ? (
        <StationCard>
          <StationHeader>
            <StationName>All Low-Impact Swaps</StationName>
            <TimingBadge>{board1Exercises.length} swaps</TimingBadge>
          </StationHeader>
          {(boardViews.lowImpactExercises.length > 0 ? boardViews.lowImpactExercises : board1Exercises).map((ex, exIdx) =>
            renderLowImpactSwap(ex, exIdx, 'flat')
          )}
        </StationCard>
      ) : null}
    </>
  );
};

export default ClassPreviewAlternatives;
