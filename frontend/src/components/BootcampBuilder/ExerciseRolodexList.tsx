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
import { reactWindowStyleProps } from '@/components/ui/reactWindowStyleProps';
import { RetryButton } from '../WorkoutLogger/ExerciseSetRowControls.styles';
import {
  LIBRARY_COPY,
  type ExerciseLibraryState,
} from '../WorkoutLogger/exerciseSearchLibraryState';

interface ExerciseRolodexListProps {
  exercises: ExerciseSlim[];
  isLoading: boolean;
  selectedId?: string | number | null;
  onAddExercise: (exercise: ExerciseSlim, event: MouseEvent) => void;
  onSelectExercise?: (exercise: ExerciseSlim) => void;
  /** S04 recovery state. Optional so existing callers keep compiling. */
  libraryState?: ExerciseLibraryState;
  loadError?: string | null;
  refreshError?: string | null;
  isSearching?: boolean;
  hasActiveFilters?: boolean;
  onRetry?: () => void;
  onClearFilters?: () => void;
}

const ExerciseRolodexList: React.FC<ExerciseRolodexListProps> = ({
  exercises,
  isLoading,
  selectedId,
  onAddExercise,
  onSelectExercise,
  libraryState,
  loadError,
  refreshError,
  isSearching = false,
  hasActiveFilters = false,
  onRetry,
  onClearFilters,
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
      <VirtualRow {...reactWindowStyleProps(style)}>
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

  const state: ExerciseLibraryState = libraryState
    ?? (isLoading ? 'loading' : exercises.length === 0 ? 'empty-catalog' : 'ready');

  const retryButton = onRetry ? (
    <RetryButton
      type="button"
      onClick={onRetry}
      disabled={isLoading}
      aria-busy={isLoading}
      aria-label="Reload the exercise library"
      data-testid="bootcamp-rolodex-retry"
    >
      {isLoading ? LIBRARY_COPY.retryBusy : LIBRARY_COPY.retry}
    </RetryButton>
  ) : null;

  return (
    <ExerciseGrid aria-busy={isSearching}>
      {/* A failed refresh must stay visible even though cached rows render. */}
      {state === 'stale' && (
        <EmptyMsg role="status" aria-live="polite" data-testid="bootcamp-rolodex-stale">
          {LIBRARY_COPY.staleTitle}
          {refreshError ? ` ${refreshError}` : ''}
          {retryButton}
        </EmptyMsg>
      )}

      {state === 'loading' ? (
        Array.from({ length: 8 }, (_, index) => <SkeletonBlock key={index} />)
      ) : state === 'error' ? (
        <EmptyMsg role="alert" data-testid="bootcamp-rolodex-error">
          {LIBRARY_COPY.errorTitle}
          {loadError ? ` ${loadError}` : ''}
          {retryButton}
        </EmptyMsg>
      ) : state === 'empty-catalog' ? (
        <EmptyMsg data-testid="bootcamp-rolodex-empty-catalog">
          {LIBRARY_COPY.emptyCatalogTitle} {LIBRARY_COPY.emptyCatalogBody}
          {retryButton}
        </EmptyMsg>
      ) : state === 'filter-empty' ? (
        <EmptyMsg data-testid="bootcamp-rolodex-filter-empty">
          No exercises match your filters.
          {hasActiveFilters && onClearFilters && (
            <RetryButton
              type="button"
              onClick={onClearFilters}
              aria-label="Clear Exercise Rolodex filters"
              data-testid="bootcamp-rolodex-clear"
            >
              {LIBRARY_COPY.clearFilters}
            </RetryButton>
          )}
        </EmptyMsg>
      ) : (
        <List
          rowComponent={PairedRowRenderer as any}
          rowCount={exercisePairs.length}
          rowHeight={ROLODEX_ROW_HEIGHT}
          rowProps={{} as any}
          {...reactWindowStyleProps({ height: Math.min(exercisePairs.length, 7) * ROLODEX_ROW_HEIGHT, overflowX: 'hidden' })}
        />
      )}
    </ExerciseGrid>
  );
};

export default ExerciseRolodexList;

function getExerciseMediaPreview(exercise: ExerciseSlim) {
  const catalogVideoUrl = exercise.catalogVideoSample?.videoUrl || null;
  const poster = exercise.thumbnailUrl
    || exercise.imageUrl
    || exercise.catalogVideoSample?.thumbnailUrl
    || null;
  const videoUrl = exercise.videoUrl || catalogVideoUrl;
  return {
    poster,
    videoUrl,
    hasMedia: Boolean(poster || videoUrl),
  };
}
