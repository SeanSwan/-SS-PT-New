/**
 * WorkoutPlanBuilder
 * ==================
 * Galaxy-Swan themed admin UI for creating workout plans for clients.
 */

import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useParams } from 'react-router-dom';
import { Plus, Save, Search, Trash2 } from 'lucide-react';
import {
  PageTitle,
  SectionTitle,
  BodyText,
  SmallText,
  ErrorText,
  HelperText,
  Label,
  FormField,
  StyledInput,
  StyledTextarea,
  PrimaryButton,
  OutlinedButton,
  SecondaryButton,
  Card,
  CardHeader,
  CardBody,
  GridContainer,
  FlexBox
} from '../UniversalMasterSchedule/ui';
import { useCurrentWorkout } from '../../hooks/useCurrentWorkout';

type ExerciseSearchResult = {
  id: string | number;
  name: string;
};

type ExerciseDraft = {
  exerciseId: string;
  exerciseName: string;
  sets: string;
  reps: string;
  restSeconds: string;
  notes: string;
};

type DayDraft = {
  name: string;
  exercises: ExerciseDraft[];
};

const WorkoutPlanBuilder: React.FC = () => {
  const { clientId: clientIdParam } = useParams();
  const [clientIdInput, setClientIdInput] = useState(clientIdParam || '');
  const numericClientId = useMemo(() => {
    const parsed = Number(clientIdInput);
    return Number.isFinite(parsed) ? parsed : undefined;
  }, [clientIdInput]);

  const { data: existingPlan, isLoading, error: loadError } = useCurrentWorkout(numericClientId);

  const [hasPrefilled, setHasPrefilled] = useState(false);
  const [planName, setPlanName] = useState(existingPlan?.name || '');
  const [description, setDescription] = useState(existingPlan?.description || '');
  const [durationWeeks, setDurationWeeks] = useState(existingPlan?.durationWeeks ? String(existingPlan.durationWeeks) : '8');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [days, setDays] = useState<DayDraft[]>(() => (
    existingPlan?.days?.length
      ? existingPlan.days.map((day) => ({
          name: day.name || `Day ${day.dayNumber}`,
          exercises: day.exercises.map((exercise) => ({
            exerciseId: exercise.id ? String(exercise.id) : '',
            exerciseName: exercise.name || '',
            sets: exercise.sets ? String(exercise.sets) : '3',
            reps: exercise.reps || '10',
            restSeconds: exercise.restSeconds ? String(exercise.restSeconds) : '60',
            notes: exercise.notes || ''
          }))
        }))
      : []
  ));
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setHasPrefilled(false);
  }, [numericClientId]);

  useEffect(() => {
    if (!existingPlan || hasPrefilled) {
      return;
    }

    setPlanName(existingPlan.name || '');
    setDescription(existingPlan.description || '');
    setDurationWeeks(existingPlan.durationWeeks ? String(existingPlan.durationWeeks) : '8');

    if (existingPlan.days?.length) {
      setDays(existingPlan.days.map((day) => ({
        name: day.name || `Day ${day.dayNumber}`,
        exercises: day.exercises.map((exercise) => ({
          exerciseId: exercise.id ? String(exercise.id) : '',
          exerciseName: exercise.name || '',
          sets: exercise.sets ? String(exercise.sets) : '3',
          reps: exercise.reps || '10',
          restSeconds: exercise.restSeconds ? String(exercise.restSeconds) : '60',
          notes: exercise.notes || ''
        }))
      })));
    } else {
      setDays([]);
    }

    setHasPrefilled(true);
  }, [existingPlan, hasPrefilled]);

  const handleAddDay = () => {
    setDays((prev) => [...prev, { name: `Day ${prev.length + 1}`, exercises: [] }]);
  };

  const handleRemoveDay = (index: number) => {
    setDays((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleDayNameChange = (index: number, value: string) => {
    setDays((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], name: value };
      return updated;
    });
  };

  const handleAddExercise = (dayIndex: number, exercise: ExerciseSearchResult) => {
    setDays((prev) => {
      const updated = [...prev];
      const exerciseDraft: ExerciseDraft = {
        exerciseId: String(exercise.id),
        exerciseName: exercise.name,
        sets: '3',
        reps: '10',
        restSeconds: '60',
        notes: ''
      };
      updated[dayIndex].exercises = [...updated[dayIndex].exercises, exerciseDraft];
      return updated;
    });
  };

  const handleExerciseChange = (
    dayIndex: number,
    exerciseIndex: number,
    field: keyof ExerciseDraft,
    value: string
  ) => {
    setDays((prev) => {
      const updated = [...prev];
      const exercises = [...updated[dayIndex].exercises];
      exercises[exerciseIndex] = { ...exercises[exerciseIndex], [field]: value };
      updated[dayIndex].exercises = exercises;
      return updated;
    });
  };

  const handleRemoveExercise = (dayIndex: number, exerciseIndex: number) => {
    setDays((prev) => {
      const updated = [...prev];
      updated[dayIndex].exercises = updated[dayIndex].exercises.filter((_, idx) => idx !== exerciseIndex);
      return updated;
    });
  };

  const buildPayload = () => {
    return {
      name: planName.trim(),
      title: planName.trim(),
      description: description.trim(),
      clientId: numericClientId,
      userId: numericClientId,
      trainerId: getCurrentUserId(),
      durationWeeks: Number(durationWeeks) || 8,
      startDate: startDate || new Date().toISOString().split('T')[0],
      endDate: endDate || null,
      status: 'active',
      days: days.map((day, index) => ({
        dayNumber: index + 1,
        name: day.name || `Day ${index + 1}`,
        exercises: day.exercises.map((exercise, exIndex) => ({
          exerciseId: exercise.exerciseId,
          orderInWorkout: exIndex + 1,
          setScheme: exercise.sets && exercise.reps ? `${exercise.sets}x${exercise.reps}` : undefined,
          repGoal: exercise.reps || undefined,
          restPeriod: Number(exercise.restSeconds) || 0,
          notes: exercise.notes || undefined
        }))
      }))
    };
  };

  const handleSubmit = async () => {
    setFormError(null);
    setSuccessMessage(null);

    if (!numericClientId) {
      setFormError('Valid client ID is required.');
      return;
    }

    if (!planName.trim()) {
      setFormError('Plan name is required.');
      return;
    }

    if (days.length === 0) {
      setFormError('Add at least one workout day.');
      return;
    }

    const missingExerciseId = days.some((day) =>
      day.exercises.some((exercise) => !exercise.exerciseId)
    );

    if (missingExerciseId) {
      setFormError('Every exercise must be linked to a valid exercise ID.');
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setFormError('Please log in to save workout plans.');
        return;
      }

      const response = await fetch('/api/workout/plans', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(buildPayload())
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result?.success === false) {
        setFormError(result?.message || 'Failed to save workout plan.');
        return;
      }

      setSuccessMessage('Workout plan saved successfully.');
    } catch (error) {
      console.error('Error saving workout plan:', error);
      setFormError('Network error saving workout plan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageWrapper>
      <HeaderRow>
        <div>
          <PageTitle>Workout Plan Builder</PageTitle>
          <BodyText secondary>
            Build client-specific workout plans with structured days and exercises.
          </BodyText>
        </div>
      </HeaderRow>

      <Card>
        <CardHeader>
          <SectionTitle>Client Selection</SectionTitle>
        </CardHeader>
        <CardBody>
          <FormField>
            <Label htmlFor="workout-client-id" required>Client ID</Label>
            <StyledInput
              id="workout-client-id"
              type="number"
              value={clientIdInput}
              onChange={(event) => setClientIdInput(event.target.value)}
              placeholder="Enter client user ID"
              hasError={!numericClientId && clientIdInput.length > 0}
            />
            <HelperText>Use the numeric user ID from the client profile.</HelperText>
          </FormField>
          {loadError && <ErrorText>{loadError}</ErrorText>}
          {isLoading && <SmallText secondary>Loading current workout plan...</SmallText>}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <SectionTitle>Plan Details</SectionTitle>
        </CardHeader>
        <CardBody>
          <GridContainer columns={2} gap="1.5rem">
            <FormField>
              <Label htmlFor="workout-plan-name" required>Plan Name</Label>
              <StyledInput
                id="workout-plan-name"
                value={planName}
                onChange={(event) => setPlanName(event.target.value)}
                placeholder="Strength Foundation"
              />
            </FormField>
            <FormField>
              <Label htmlFor="workout-duration-weeks">Duration (weeks)</Label>
              <StyledInput
                id="workout-duration-weeks"
                type="number"
                min={1}
                value={durationWeeks}
                onChange={(event) => setDurationWeeks(event.target.value)}
              />
            </FormField>
            <FormField>
              <Label htmlFor="workout-start-date">Start Date</Label>
              <StyledInput
                id="workout-start-date"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </FormField>
            <FormField>
              <Label htmlFor="workout-end-date">End Date</Label>
              <StyledInput
                id="workout-end-date"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </FormField>
          </GridContainer>
          <FormField>
            <Label htmlFor="workout-description">Description</Label>
            <StyledTextarea
              id="workout-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Plan focus, goals, and training notes."
              rows={4}
            />
          </FormField>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <SectionTitle>Workout Days</SectionTitle>
          <SecondaryButton type="button" onClick={handleAddDay}>
            <Plus size={16} /> Add Day
          </SecondaryButton>
        </CardHeader>
        <CardBody>
          {days.length === 0 && (
            <SmallText secondary>Add workout days to start building the plan.</SmallText>
          )}

          {days.map((day, dayIndex) => (
            <DayCard key={`day-${dayIndex}`}>
              <DayHeader>
                <FormField style={{ flex: 1, marginBottom: 0 }}>
                  <Label htmlFor={`day-name-${dayIndex}`}>Day Name</Label>
                  <StyledInput
                    id={`day-name-${dayIndex}`}
                    value={day.name}
                    onChange={(event) => handleDayNameChange(dayIndex, event.target.value)}
                  />
                </FormField>
                <OutlinedButton type="button" onClick={() => handleRemoveDay(dayIndex)}>
                  <Trash2 size={16} /> Remove Day
                </OutlinedButton>
              </DayHeader>

              <ExerciseSearch
                onSelect={(exercise) => handleAddExercise(dayIndex, exercise)}
              />

              {day.exercises.map((exercise, exerciseIndex) => (
                <ExerciseRow key={`exercise-${dayIndex}-${exerciseIndex}`}>
                  <ExerciseHeader>
                    <Subheading>{exercise.exerciseName || 'Exercise'}</Subheading>
                    <OutlinedButton
                      type="button"
                      onClick={() => handleRemoveExercise(dayIndex, exerciseIndex)}
                    >
                      <Trash2 size={14} /> Remove
                    </OutlinedButton>
                  </ExerciseHeader>
                  <GridContainer columns={4} gap="1rem">
                    <FormField>
                      <Label htmlFor={`exercise-id-${dayIndex}-${exerciseIndex}`}>Exercise ID</Label>
                      <StyledInput
                        id={`exercise-id-${dayIndex}-${exerciseIndex}`}
                        value={exercise.exerciseId}
                        onChange={(event) => handleExerciseChange(dayIndex, exerciseIndex, 'exerciseId', event.target.value)}
                        placeholder="UUID"
                      />
                    </FormField>
                    <FormField>
                      <Label htmlFor={`exercise-sets-${dayIndex}-${exerciseIndex}`}>Sets</Label>
                      <StyledInput
                        id={`exercise-sets-${dayIndex}-${exerciseIndex}`}
                        type="number"
                        min={1}
                        value={exercise.sets}
                        onChange={(event) => handleExerciseChange(dayIndex, exerciseIndex, 'sets', event.target.value)}
                      />
                    </FormField>
                    <FormField>
                      <Label htmlFor={`exercise-reps-${dayIndex}-${exerciseIndex}`}>Reps</Label>
                      <StyledInput
                        id={`exercise-reps-${dayIndex}-${exerciseIndex}`}
                        value={exercise.reps}
                        onChange={(event) => handleExerciseChange(dayIndex, exerciseIndex, 'reps', event.target.value)}
                        placeholder="8-12"
                      />
                    </FormField>
                    <FormField>
                      <Label htmlFor={`exercise-rest-${dayIndex}-${exerciseIndex}`}>Rest (sec)</Label>
                      <StyledInput
                        id={`exercise-rest-${dayIndex}-${exerciseIndex}`}
                        type="number"
                        min={0}
                        value={exercise.restSeconds}
                        onChange={(event) => handleExerciseChange(dayIndex, exerciseIndex, 'restSeconds', event.target.value)}
                      />
                    </FormField>
                  </GridContainer>
                  <FormField>
                    <Label htmlFor={`exercise-notes-${dayIndex}-${exerciseIndex}`}>Notes</Label>
                    <StyledTextarea
                      id={`exercise-notes-${dayIndex}-${exerciseIndex}`}
                      value={exercise.notes}
                      onChange={(event) => handleExerciseChange(dayIndex, exerciseIndex, 'notes', event.target.value)}
                      rows={2}
                      placeholder="Tempo cues, regressions, or coaching notes."
                    />
                  </FormField>
                </ExerciseRow>
              ))}
            </DayCard>
          ))}
        </CardBody>
      </Card>

      {formError && <ErrorText>{formError}</ErrorText>}
      {successMessage && <SuccessText>{successMessage}</SuccessText>}

      <ActionRow>
        <PrimaryButton type="button" onClick={handleSubmit} disabled={isSubmitting}>
          <Save size={16} />
          {isSubmitting ? 'Saving...' : 'Save Workout Plan'}
        </PrimaryButton>
      </ActionRow>
    </PageWrapper>
  );
};

export default WorkoutPlanBuilder;

const getCurrentUserId = (): number | null => {
  const stored = localStorage.getItem('user');
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored);
    return parsed?.id ? Number(parsed.id) : null;
  } catch (error) {
    console.error('Error parsing user from localStorage:', error);
    return null;
  }
};

const PageWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const HeaderRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
`;

const DayCard = styled(Card)`
  padding: 1rem;
  margin-bottom: 1.5rem;
`;

const DayHeader = styled(FlexBox)`
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const ExerciseRow = styled(Card)`
  padding: 1rem;
  margin-bottom: 1rem;
`;

const ExerciseHeader = styled(FlexBox)`
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
`;

const Subheading = styled.h4`
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: #ffffff;
`;

const ActionRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
`;

const SuccessText = styled.span`
  display: block;
  font-size: 0.875rem;
  color: #10b981;
`;

const SearchContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  margin-bottom: 1rem;
`;

const SearchRow = styled(FlexBox)`
  align-items: center;
  gap: 0.75rem;
`;

const ResultsList = styled.div`
  display: grid;
  gap: 0.5rem;
`;

const ResultItem = styled.button`
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 0.75rem;
  color: #ffffff;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(0, 255, 255, 0.4);
    background: rgba(0, 255, 255, 0.08);
  }
`;

const ExerciseSearch: React.FC<{ onSelect: (exercise: ExerciseSearchResult) => void }> = ({ onSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ExerciseSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (query.trim().length < 2) {
      setSearchError('Enter at least 2 characters to search exercises.');
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setSearchError('Please log in to search exercises.');
        return;
      }

      const response = await fetch(`/api/exercises/search?q=${encodeURIComponent(query.trim())}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.success === false) {
        setSearchError(result?.message || 'Failed to search exercises.');
        return;
      }

      setResults(result.exercises || []);
    } catch (error) {
      console.error('Error searching exercises:', error);
      setSearchError('Network error searching exercises.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelect = (exercise: ExerciseSearchResult) => {
    onSelect(exercise);
    setQuery('');
    setResults([]);
  };

  return (
    <SearchContainer>
      <SectionTitle style={{ fontSize: '1rem' }}>Search Exercises</SectionTitle>
      <SearchRow>
        <StyledInput
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search exercises by name or type"
        />
        <OutlinedButton type="button" onClick={handleSearch} disabled={isSearching}>
          <Search size={16} /> {isSearching ? 'Searching...' : 'Search'}
        </OutlinedButton>
      </SearchRow>
      {searchError && <ErrorText>{searchError}</ErrorText>}
      {results.length > 0 && (
        <ResultsList>
          {results.map((exercise) => (
            <ResultItem key={exercise.id} type="button" onClick={() => handleSelect(exercise)}>
              {exercise.name}
            </ResultItem>
          ))}
        </ResultsList>
      )}
      {results.length === 0 && query.trim().length >= 2 && !isSearching && !searchError && (
        <SmallText secondary>No exercises found.</SmallText>
      )}
    </SearchContainer>
  );
};
