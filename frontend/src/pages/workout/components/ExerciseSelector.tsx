import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styled from 'styled-components';

interface ExerciseSelectorProps {
  clientId: string | null;
  onAddExercise: (exercise: any) => void;
  selectedExerciseIds: string[];
}

const ExerciseSelector: React.FC<ExerciseSelectorProps> = ({
  clientId,
  onAddExercise,
  selectedExerciseIds
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [exercises, setExercises] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterMuscle, setFilterMuscle] = useState<string>('all');

  // Exercise types and muscle groups for filtering
  const exerciseTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'core', label: 'Core' },
    { value: 'balance', label: 'Balance' },
    { value: 'stability', label: 'Stability' },
    { value: 'flexibility', label: 'Flexibility' },
    { value: 'calisthenics', label: 'Calisthenics' },
    { value: 'isolation', label: 'Isolation' },
    { value: 'stabilizers', label: 'Stabilizers' },
    { value: 'injury_prevention', label: 'Injury Prevention' },
    { value: 'injury_recovery', label: 'Injury Recovery' },
    { value: 'compound', label: 'Compound' }
  ];

  const muscleGroups = [
    { value: 'all', label: 'All Muscles' },
    { value: 'Glutes', label: 'Glutes' },
    { value: 'Calves', label: 'Calves' },
    { value: 'Shoulders', label: 'Shoulders' },
    { value: 'Hamstrings', label: 'Hamstrings' },
    { value: 'Abs', label: 'Abs' },
    { value: 'Chest', label: 'Chest' },
    { value: 'Biceps', label: 'Biceps' },
    { value: 'Triceps', label: 'Triceps' },
    { value: 'Lower Back', label: 'Lower Back' },
    { value: 'Quadriceps', label: 'Quadriceps' },
    { value: 'Core', label: 'Core' }
  ];

  // Fetch exercises
  useEffect(() => {
    const fetchExercises = async () => {
      if (!clientId) return;

      try {
        setIsLoading(true);
        const response = await axios.get('/api/exercises', {
          params: {
            type: filterType !== 'all' ? filterType : undefined,
            primaryMuscle: filterMuscle !== 'all' ? filterMuscle : undefined,
            search: searchQuery || undefined
          }
        });
        setExercises(response.data.exercises || []);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching exercises:', err);
        setError('Failed to fetch exercises');
        setIsLoading(false);
      }
    };

    if (clientId) {
      fetchExercises();
    }
  }, [clientId, filterType, filterMuscle, searchQuery]);

  // Handle adding an exercise
  const handleAddExercise = (exercise: any) => {
    onAddExercise(exercise);
  };

  // Filter exercises that are already selected
  const availableExercises = exercises.filter(
    exercise => !selectedExerciseIds.includes(exercise.id)
  );

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
          <FilterSelect
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            {exerciseTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </FilterSelect>
          
          <FilterSelect
            value={filterMuscle}
            onChange={(e) => setFilterMuscle(e.target.value)}
          >
            {muscleGroups.map(muscle => (
              <option key={muscle.value} value={muscle.value}>
                {muscle.label}
              </option>
            ))}
          </FilterSelect>
        </FilterRow>
      </FilterSection>
      
      {isLoading ? (
        <LoadingMessage>Loading exercises...</LoadingMessage>
      ) : error ? (
        <ErrorMessage>{error}</ErrorMessage>
      ) : availableExercises.length === 0 ? (
        <EmptyState>
          No exercises found. Try adjusting your filters.
        </EmptyState>
      ) : (
        <ExerciseList>
          {availableExercises.map(exercise => (
            <ExerciseCard key={exercise.id}>
              <ExerciseHeader>
                <ExerciseType>{exercise.exerciseType}</ExerciseType>
                <ExerciseDifficulty>
                  Level {Math.floor(exercise.difficulty / 100)}
                </ExerciseDifficulty>
              </ExerciseHeader>
              
              <ExerciseName>{exercise.name}</ExerciseName>
              
              <MuscleGroups>
                {exercise.primaryMuscles.slice(0, 3).map((muscle: string, index: number) => (
                  <MuscleTag key={`${exercise.id}-${muscle}-${index}`}>
                    {muscle}
                  </MuscleTag>
                ))}
                {exercise.primaryMuscles.length > 3 && (
                  <MuscleTag>+{exercise.primaryMuscles.length - 3} more</MuscleTag>
                )}
              </MuscleGroups>
              
              <ExerciseFooter>
                <AddButton 
                  onClick={() => handleAddExercise(exercise)}
                  disabled={selectedExerciseIds.includes(exercise.id)}
                >
                  Add to Workout
                </AddButton>
              </ExerciseFooter>
            </ExerciseCard>
          ))}
        </ExerciseList>
      )}
    </SelectorContainer>
  );
};

// Styled components
const SelectorContainer = styled.div`
  display: flex;
  flex-direction: column;
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  height: 100%;
`;

const SelectorHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  
  h3 {
    margin: 0;
    font-size: 18px;
  }
`;

const FilterSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
`;

const SearchInput = styled.input`
  padding: 10px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 16px;
  
  &:focus {
    outline: none;
    border-color: #80bdff;
    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
  }
`;

const FilterRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`;

const FilterSelect = styled.select`
  padding: 10px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  background-color: white;
  font-size: 16px;
  
  &:focus {
    outline: none;
    border-color: #80bdff;
    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
  }
`;

const LoadingMessage = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  color: #666;
`;

const ErrorMessage = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  color: #dc3545;
`;

const EmptyState = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  color: #666;
  text-align: center;
`;

const ExerciseList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
  overflow-y: auto;
  max-height: 500px;
  padding-right: 8px;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 10px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 10px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
`;

const ExerciseCard = styled.div`
  display: flex;
  flex-direction: column;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: transform 0.2s;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }
`;

const ExerciseHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background-color: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
`;

const ExerciseType = styled.span`
  font-size: 12px;
  text-transform: capitalize;
  color: #495057;
`;

const ExerciseDifficulty = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: #495057;
`;

const ExerciseName = styled.h4`
  padding: 12px 12px 8px;
  margin: 0;
  font-size: 16px;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  min-height: 50px;
`;

const MuscleGroups = styled.div`
  display: flex;
  flex-wrap: wrap;
  padding: 0 12px 12px;
  gap: 6px;
`;

const MuscleTag = styled.span`
  display: inline-block;
  padding: 2px 8px;
  background-color: #e9ecef;
  border-radius: 12px;
  font-size: 12px;
  color: #495057;
`;

const ExerciseFooter = styled.div`
  padding: 12px;
  border-top: 1px solid #dee2e6;
  margin-top: auto;
`;

const AddButton = styled.button`
  width: 100%;
  padding: 8px 0;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  
  &:hover {
    background-color: #0069d9;
  }
  
  &:disabled {
    background-color: #6c757d;
    cursor: not-allowed;
  }
`;

export default ExerciseSelector;