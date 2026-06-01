import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import {
  EXERCISE_LIBRARY_URL,
  EXERCISE_TYPES,
  MUSCLE_GROUPS,
  getExerciseLevel,
  getFilteredExercises,
  getHiddenMuscleCount,
  getVisibleMuscles,
  normalizeExercises,
  type ExerciseSelectorExercise
} from './ExerciseSelector.logic';
import {
  AddButton,
  ErrorMessage,
  ExerciseCard,
  ExerciseDifficulty,
  ExerciseFooter,
  ExerciseHeader,
  ExerciseList,
  ExerciseName,
  ExerciseType,
  FilterRow,
  FilterSection,
  FilterSelect,
  MuscleGroups,
  MuscleTag,
  SearchInput,
  SelectorContainer,
  SelectorHeader,
  StateMessage
} from './ExerciseSelector.styles';

interface ExerciseSelectorProps {
  clientId: string | null;
  onAddExercise: (exercise: ExerciseSelectorExercise) => void;
  selectedExerciseIds: string[];
}

const ExerciseSelector: React.FC<ExerciseSelectorProps> = ({
  clientId,
  onAddExercise,
  selectedExerciseIds
}) => {
  const { authAxios } = useAuth();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [exercises, setExercises] = useState<ExerciseSelectorExercise[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterMuscle, setFilterMuscle] = useState<string>('all');

  useEffect(() => {
    let isMounted = true;
    const fetchExercises = async () => {
      if (!clientId) return;

      try {
        setIsLoading(true);
        setError(null);
        const response = await authAxios.get(EXERCISE_LIBRARY_URL);
        if (isMounted) setExercises(normalizeExercises(response.data?.exercises));
      } catch (err) {
        console.error('Error fetching exercises:', err);
        if (isMounted) {
          setExercises([]);
          setError('Failed to fetch exercises');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchExercises();
    return () => {
      isMounted = false;
    };
  }, [authAxios, clientId]);

  const availableExercises = useMemo(() => getFilteredExercises(exercises, {
    filterMuscle,
    filterType,
    searchQuery,
    selectedExerciseIds
  }), [exercises, filterMuscle, filterType, searchQuery, selectedExerciseIds]);

  return (
    <SelectorContainer>
      <SelectorHeader>
        <h3>Exercise Library</h3>
      </SelectorHeader>

      <FilterSection>
        <SearchInput
          type="text"
          placeholder="Search exercises..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <FilterRow>
          <FilterSelect value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            {EXERCISE_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </FilterSelect>
          <FilterSelect value={filterMuscle} onChange={(e) => setFilterMuscle(e.target.value)}>
            {MUSCLE_GROUPS.map(muscle => (
              <option key={muscle.value} value={muscle.value}>{muscle.label}</option>
            ))}
          </FilterSelect>
        </FilterRow>
      </FilterSection>

      {isLoading ? (
        <StateMessage>Loading exercises...</StateMessage>
      ) : error ? (
        <ErrorMessage>{error}</ErrorMessage>
      ) : availableExercises.length === 0 ? (
        <StateMessage>No exercises found. Try adjusting your filters.</StateMessage>
      ) : (
        <ExerciseList>
          {availableExercises.map(exercise => {
            const hiddenMuscles = getHiddenMuscleCount(exercise);

            return (
              <ExerciseCard key={exercise.id}>
                <ExerciseHeader>
                  <ExerciseType>{exercise.exerciseType}</ExerciseType>
                  <ExerciseDifficulty>Level {getExerciseLevel(exercise.difficulty)}</ExerciseDifficulty>
                </ExerciseHeader>
                <ExerciseName>{exercise.name}</ExerciseName>
                <MuscleGroups>
                  {getVisibleMuscles(exercise).map((muscle, index) => (
                    <MuscleTag key={`${exercise.id}-${muscle}-${index}`}>{muscle}</MuscleTag>
                  ))}
                  {hiddenMuscles > 0 && <MuscleTag>+{hiddenMuscles} more</MuscleTag>}
                </MuscleGroups>
                <ExerciseFooter>
                  <AddButton
                    onClick={() => onAddExercise(exercise)}
                    disabled={selectedExerciseIds.includes(exercise.id)}
                  >
                    Add to Workout
                  </AddButton>
                </ExerciseFooter>
              </ExerciseCard>
            );
          })}
        </ExerciseList>
      )}
    </SelectorContainer>
  );
};

export default ExerciseSelector;
