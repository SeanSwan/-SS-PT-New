import { useCallback, useMemo } from 'react';
import type { CSSProperties, KeyboardEvent, MouseEvent } from 'react';
import { List } from 'react-window';
import { Plus } from 'lucide-react';
import type { ExerciseSlim } from '../WorkoutLogger/useExerciseSearch';
import { getJointImpact, parseEquipment, ROLODEX_ROW_HEIGHT } from './ExerciseRolodexPanel.constants';
import {
  AddBtn,
  CardMeta,
  CardTop,
  EmptyMsg,
  ExName,
  ExerciseCard,
  ExerciseGrid,
  MediaImage,
  MediaPlaceholder,
  MediaPreview,
  MediaVideoBadge,
  MetaTag,
  SkeletonBlock,
  VirtualRow,
} from './ExerciseRolodexList.styles';

interface ExerciseRolodexListProps {
  exercises: ExerciseSlim[];
  isLoading: boolean;
  selectedId?: string | number | null;
  onAddExercise: (exercise: ExerciseSlim, event: MouseEvent) => void;
  onSelectExercise?: (exercise: ExerciseSlim) => void;
}

const ExerciseRolodexList: React.FC<ExerciseRolodexListProps> = ({
  exercises,
  isLoading,
  selectedId,
  onAddExercise,
  onSelectExercise,
}) => {
  const exercisePairs = useMemo(() => {
    const pairs: ExerciseSlim[][] = [];
    for (let index = 0; index < exercises.length; index += 2) {
      pairs.push(exercises.slice(index, index + 2));
    }
    return pairs;
  }, [exercises]);

  const handleCardKeyDown = useCallback((event: KeyboardEvent, exercise: ExerciseSlim) => {
    if (!onSelectExercise) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelectExercise(exercise);
    }
  }, [onSelectExercise]);

  const PairedRowRenderer = useCallback(({ index, style }: { index: number; style: CSSProperties }) => {
    const pair = exercisePairs[index];
    if (!pair) return null;

    return (
      <VirtualRow style={style}>
        {pair.map((exercise) => {
          const impact = getJointImpact(exercise);
          const eqArr = parseEquipment((exercise as any).equipment || (exercise as any).equipmentNeeded);
          const eqLabel = eqArr.length > 0 ? eqArr[0] : 'Bodyweight';
          const media = getExerciseMediaPreview(exercise);

          return (
            <ExerciseCard
              key={exercise.id}
              $selected={String(selectedId ?? '') === String(exercise.id)}
              onClick={() => onSelectExercise?.(exercise)}
              onKeyDown={(event) => handleCardKeyDown(event, exercise)}
              role="button"
              aria-label={`Select ${exercise.name}`}
              tabIndex={0}
            >
              {media.hasMedia && (
                <MediaPreview aria-label={`${exercise.name} media preview`}>
                  {media.poster ? (
                    <MediaImage src={media.poster} alt="" loading="lazy" />
                  ) : (
                    <MediaPlaceholder>Demo media</MediaPlaceholder>
                  )}
                  {media.videoUrl && <MediaVideoBadge>Video</MediaVideoBadge>}
                </MediaPreview>
              )}
              <CardTop>
                <ExName>{exercise.name}</ExName>
                <AddBtn
                  onClick={(event) => onAddExercise(exercise, event)}
                  title="Add to class"
                  aria-label={`Add ${exercise.name} to class`}
                >
                  <Plus size={12} />
                </AddBtn>
              </CardTop>
              <CardMeta>
                <MetaTag>{exercise.bodyPartCategory}</MetaTag>
                <MetaTag>{eqLabel}</MetaTag>
                <MetaTag $impact={impact}>{impact.replace(' Impact', '')}</MetaTag>
              </CardMeta>
            </ExerciseCard>
          );
        })}
      </VirtualRow>
    );
  }, [exercisePairs, selectedId, onSelectExercise, onAddExercise, handleCardKeyDown]);

  return (
    <ExerciseGrid>
      {isLoading ? (
        Array.from({ length: 8 }, (_, index) => <SkeletonBlock key={index} />)
      ) : exercises.length === 0 ? (
        <EmptyMsg>No exercises match your filters.</EmptyMsg>
      ) : (
        <List
          rowComponent={PairedRowRenderer as any}
          rowCount={exercisePairs.length}
          rowHeight={ROLODEX_ROW_HEIGHT}
          rowProps={{} as any}
          style={{ height: Math.min(exercisePairs.length, 7) * ROLODEX_ROW_HEIGHT, overflowX: 'hidden' }}
        />
      )}
    </ExerciseGrid>
  );
};

export default ExerciseRolodexList;

export function getExerciseMediaPreview(exercise: ExerciseSlim) {
  const poster = exercise.thumbnailUrl || exercise.imageUrl || null;
  const videoUrl = exercise.videoUrl || null;
  return {
    poster,
    videoUrl,
    hasMedia: Boolean(poster || videoUrl),
  };
}
