import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Save, Search, ChevronDown } from 'lucide-react';
import { useToast } from '../../../../hooks/use-toast';
import apiService from '../../../../services/api.service';
import GlowButton from '../../../ui/buttons/GlowButton';

// Interfaces
interface Client { id: string; name: string; }
interface Exercise { id: string; name: string; }
interface SetEntry { setNumber: number; reps: number; weight: number; rpe: number; formQualityScore: number; }
interface RecentWorkout {
  id: string;
  sessionDate: string;
  duration: number;
  exerciseCount: number;
  totalVolume?: number;
}
interface WorkoutExerciseEntry { exerciseId: string; exerciseName: string; sets: SetEntry[]; notes: string; }

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

const PageContainer = styled(motion.div)`
  padding: 16px;

  @media (min-width: 768px) {
    padding: 32px;
  }
`;

const Panel = styled(motion.div)`
  padding: 16px;
  margin-bottom: 24px;
  border-radius: 12px;
  background: rgba(30, 41, 59, 0.6);
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);

  @media (min-width: 768px) {
    padding: 24px;
  }
`;

const PanelTitle = styled.h5`
  font-size: 1.25rem;
  font-weight: 700;
  color: #00ffff;
  margin: 0 0 16px;
`;

const SectionTitle = styled.h6`
  font-size: 1.125rem;
  font-weight: 700;
  color: rgba(0, 255, 255, 0.8);
  margin: 0 0 16px;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;

  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const FieldLabel = styled.label`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 6px;
`;

const StyledSelect = styled.div`
  position: relative;
`;

const SelectTrigger = styled.button`
  width: 100%;
  padding: 12px 16px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.05);
  color: white;
  font-size: 0.875rem;
  cursor: pointer;
  text-align: left;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: rgba(0, 255, 255, 0.5);
  }
`;

const SelectDropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 50;
  margin-top: 4px;
  max-height: 240px;
  overflow-y: auto;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(15, 23, 42, 0.98);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
`;

const SelectOption = styled.button<{ $selected?: boolean }>`
  width: 100%;
  padding: 10px 16px;
  min-height: 44px;
  border: none;
  background: ${props => props.$selected ? 'rgba(0, 255, 255, 0.1)' : 'transparent'};
  color: ${props => props.$selected ? '#00ffff' : 'white'};
  font-size: 0.875rem;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease;

  &:hover { background: rgba(0, 255, 255, 0.08); }
`;

const StyledInput = styled.input`
  width: 100%;
  padding: 12px 16px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.05);
  color: white;
  font-size: 0.875rem;
  transition: border-color 0.2s ease;

  &::placeholder { color: rgba(255, 255, 255, 0.4); }
  &:focus { outline: none; border-color: rgba(0, 255, 255, 0.5); }
`;

const SmallInput = styled.input`
  width: 100%;
  padding: 8px 12px;
  min-height: 36px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.05);
  color: white;
  font-size: 0.8125rem;
  transition: border-color 0.2s ease;

  &::placeholder { color: rgba(255, 255, 255, 0.4); }
  &:focus { outline: none; border-color: rgba(0, 255, 255, 0.5); }
`;

const SmallLabel = styled.span`
  font-size: 0.6875rem;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 4px;
`;

const AutocompleteWrapper = styled.div`
  position: relative;
`;

const AutocompleteInput = styled.input`
  width: 100%;
  padding: 12px 16px;
  padding-left: 40px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.05);
  color: white;
  font-size: 0.875rem;
  transition: border-color 0.2s ease;

  &::placeholder { color: rgba(255, 255, 255, 0.4); }
  &:focus { outline: none; border-color: rgba(0, 255, 255, 0.5); }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 255, 255, 0.4);
  pointer-events: none;
`;

const AutocompleteDropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 50;
  margin-top: 4px;
  max-height: 200px;
  overflow-y: auto;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(15, 23, 42, 0.98);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
`;

const AutocompleteOption = styled.button`
  width: 100%;
  padding: 10px 16px;
  min-height: 44px;
  border: none;
  background: transparent;
  color: white;
  font-size: 0.875rem;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s ease;

  &:hover { background: rgba(0, 255, 255, 0.08); }
`;

const ExerciseHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const ExerciseName = styled.h6`
  font-size: 1.125rem;
  font-weight: 600;
  color: white;
  margin: 0;
`;

const DeleteBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: #ef5350;
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover { background: rgba(244, 67, 54, 0.1); }
`;

const SetGrid = styled.div`
  display: grid;
  grid-template-columns: auto 1fr 1fr 1fr 1fr;
  gap: 8px;
  align-items: end;

  @media (max-width: 599px) {
    grid-template-columns: auto 1fr 1fr;
    & > *:nth-child(5n+1) { grid-column: 1 / -1; }
  }

  @media (min-width: 600px) {
    gap: 12px;
  }
`;

const SetLabel = styled.span`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.7);
  padding: 8px 0;
  white-space: nowrap;
`;

const AddSetBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  min-height: 36px;
  border-radius: 6px;
  border: none;
  background: rgba(0, 255, 255, 0.1);
  color: #00ffff;
  font-size: 0.8125rem;
  cursor: pointer;
  margin-top: 16px;
  transition: all 0.2s ease;

  &:hover { background: rgba(0, 255, 255, 0.2); }
`;

const ExerciseStack = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const RecentList = styled.div`
  display: flex;
  flex-direction: column;
`;

const RecentItem = styled.div`
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
`;

const RecentPrimary = styled.span`
  font-size: 0.875rem;
  color: white;
  display: block;
`;

const RecentSecondary = styled.span`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  display: block;
  margin-top: 2px;
`;

const LoadingText = styled.p`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
`;

const SaveRow = styled(motion.div)`
  margin-top: 24px;
  text-align: right;
`;

const WorkoutDataEntry: React.FC = () => {
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [exercisesLibrary, setExercisesLibrary] = useState<Exercise[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [workoutDate, setWorkoutDate] = useState(new Date().toISOString().split('T')[0]);
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExerciseEntry[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [recentWorkouts, setRecentWorkouts] = useState<RecentWorkout[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  // Client select state
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const clientRef = useRef<HTMLDivElement>(null);

  // Exercise autocomplete state
  const [exerciseQuery, setExerciseQuery] = useState('');
  const [exerciseDropdownOpen, setExerciseDropdownOpen] = useState(false);
  const exerciseRef = useRef<HTMLDivElement>(null);

  const filteredExercises = exercisesLibrary.filter(e =>
    e.name.toLowerCase().includes(exerciseQuery.toLowerCase())
  );

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (clientRef.current && !clientRef.current.contains(e.target as Node)) {
        setClientDropdownOpen(false);
      }
      if (exerciseRef.current && !exerciseRef.current.contains(e.target as Node)) {
        setExerciseDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const clientsRes = await apiService.get('/api/admin/clients');
        setClients(clientsRes.data);

        const exercisesRes = await apiService.get('/api/exercises');
        setExercisesLibrary(exercisesRes.data);
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to load initial data.', variant: 'destructive' });
      }
    };
    fetchData();
  }, [toast]);

  useEffect(() => {
    if (selectedClient) {
      const fetchRecentWorkouts = async () => {
        setLoadingRecent(true);
        try {
          const response = await apiService.get(`/api/workout-sessions/${selectedClient.id}?limit=3`);
          if (response.data?.workouts) {
            setRecentWorkouts(response.data.workouts);
          }
        } catch (error) {
          toast({ title: 'Error', description: 'Failed to load recent workouts.', variant: 'destructive' });
        } finally {
          setLoadingRecent(false);
        }
      };
      fetchRecentWorkouts();
    } else {
      setRecentWorkouts([]);
    }
  }, [selectedClient, toast]);

  const addExercise = (exercise: Exercise) => {
    setWorkoutExercises([
      ...workoutExercises,
      {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        sets: [{ setNumber: 1, reps: 8, weight: 135, rpe: 7, formQualityScore: 8 }],
        notes: '',
      },
    ]);
    setExerciseQuery('');
    setExerciseDropdownOpen(false);
  };

  const removeExercise = (index: number) => {
    setWorkoutExercises(workoutExercises.filter((_, i) => i !== index));
  };

  const addSet = (exerciseIndex: number) => {
    const newExercises = [...workoutExercises];
    const lastSet = newExercises[exerciseIndex].sets.slice(-1)[0];
    newExercises[exerciseIndex].sets.push({
      setNumber: newExercises[exerciseIndex].sets.length + 1,
      reps: lastSet?.reps || 8,
      weight: lastSet?.weight || 135,
      rpe: lastSet?.rpe || 7,
      formQualityScore: lastSet?.formQualityScore || 8,
    });
    setWorkoutExercises(newExercises);
  };

  const handleSetChange = (exerciseIndex: number, setIndex: number, field: keyof SetEntry, value: number) => {
    const newExercises = [...workoutExercises];
    (newExercises[exerciseIndex].sets[setIndex] as any)[field] = value;
    setWorkoutExercises(newExercises);
  };

  const handleSaveWorkout = async () => {
    if (!selectedClient || workoutExercises.length === 0) {
      toast({ title: 'Validation Error', description: 'Please select a client and add at least one exercise.', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        userId: selectedClient.id,
        sessionDate: workoutDate,
        exercises: workoutExercises.map((ex, index) => ({
          exerciseId: ex.exerciseId,
          orderInWorkout: index + 1,
          notes: ex.notes,
          sets: ex.sets,
        })),
      };
      await apiService.post('/api/workout/sessions', payload);
      toast({ title: 'Success', description: 'Workout saved successfully!' });
      setSelectedClient(null);
      setWorkoutExercises([]);
    } catch (error) {
      toast({ title: 'Save Error', description: 'Failed to save workout.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PageContainer variants={containerVariants} initial="hidden" animate="visible">
      <Panel variants={itemVariants}>
        <PanelTitle>Workout Data Entry</PanelTitle>
        <FormGrid>
          <FieldGroup>
            <FieldLabel>Select Client</FieldLabel>
            <StyledSelect ref={clientRef}>
              <SelectTrigger
                onClick={() => setClientDropdownOpen(!clientDropdownOpen)}
                type="button"
              >
                <span style={{ color: selectedClient ? 'white' : 'rgba(255,255,255,0.4)' }}>
                  {selectedClient?.name || 'Choose a client...'}
                </span>
                <ChevronDown size={16} style={{ opacity: 0.5 }} />
              </SelectTrigger>
              {clientDropdownOpen && (
                <SelectDropdown>
                  {clients.map(c => (
                    <SelectOption
                      key={c.id}
                      $selected={selectedClient?.id === c.id}
                      onClick={() => {
                        setSelectedClient(c);
                        setClientDropdownOpen(false);
                      }}
                    >
                      {c.name}
                    </SelectOption>
                  ))}
                </SelectDropdown>
              )}
            </StyledSelect>
          </FieldGroup>
          <FieldGroup>
            <FieldLabel>Workout Date</FieldLabel>
            <StyledInput
              type="date"
              value={workoutDate}
              onChange={(e) => setWorkoutDate(e.target.value)}
            />
          </FieldGroup>
        </FormGrid>
      </Panel>

      <AnimatePresence>
        {selectedClient && (
          <Panel variants={itemVariants}>
            <SectionTitle>Recent Workouts for {selectedClient.name}</SectionTitle>
            {loadingRecent ? (
              <LoadingText>Loading recent workouts...</LoadingText>
            ) : recentWorkouts.length > 0 ? (
              <RecentList>
                {recentWorkouts.map((workout) => (
                  <RecentItem key={workout.id}>
                    <RecentPrimary>
                      {new Date(workout.sessionDate).toLocaleDateString()} - {workout.duration} min
                    </RecentPrimary>
                    <RecentSecondary>
                      {workout.exerciseCount || 0} exercises, {workout.totalVolume || 0} lbs total volume
                    </RecentSecondary>
                  </RecentItem>
                ))}
              </RecentList>
            ) : (
              <LoadingText>No recent workouts found for this client.</LoadingText>
            )}
          </Panel>
        )}
      </AnimatePresence>

      <Panel variants={itemVariants}>
        <FieldLabel>Add Exercise</FieldLabel>
        <AutocompleteWrapper ref={exerciseRef}>
          <SearchIcon><Search size={16} /></SearchIcon>
          <AutocompleteInput
            value={exerciseQuery}
            onChange={(e) => {
              setExerciseQuery(e.target.value);
              setExerciseDropdownOpen(true);
            }}
            onFocus={() => { if (exerciseQuery) setExerciseDropdownOpen(true); }}
            placeholder="Search exercises..."
          />
          {exerciseDropdownOpen && exerciseQuery && filteredExercises.length > 0 && (
            <AutocompleteDropdown>
              {filteredExercises.map(exercise => (
                <AutocompleteOption
                  key={exercise.id}
                  onClick={() => addExercise(exercise)}
                >
                  {exercise.name}
                </AutocompleteOption>
              ))}
            </AutocompleteDropdown>
          )}
        </AutocompleteWrapper>
      </Panel>

      <ExerciseStack variants={containerVariants}>
        {workoutExercises.map((ex, exIndex) => (
          <Panel key={exIndex} variants={itemVariants} style={{ background: 'rgba(30, 41, 59, 0.4)' }}>
            <ExerciseHeader>
              <ExerciseName>{ex.exerciseName}</ExerciseName>
              <DeleteBtn onClick={() => removeExercise(exIndex)} aria-label="Remove exercise">
                <Trash2 size={18} />
              </DeleteBtn>
            </ExerciseHeader>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {ex.sets.map((set, setIndex) => (
                <SetGrid key={setIndex}>
                  <SetLabel>Set {set.setNumber}</SetLabel>
                  <div>
                    <SmallLabel>Weight</SmallLabel>
                    <SmallInput
                      type="number"
                      value={set.weight}
                      onChange={e => handleSetChange(exIndex, setIndex, 'weight', +e.target.value)}
                    />
                  </div>
                  <div>
                    <SmallLabel>Reps</SmallLabel>
                    <SmallInput
                      type="number"
                      value={set.reps}
                      onChange={e => handleSetChange(exIndex, setIndex, 'reps', +e.target.value)}
                    />
                  </div>
                  <div>
                    <SmallLabel>RPE</SmallLabel>
                    <SmallInput
                      type="number"
                      value={set.rpe}
                      onChange={e => handleSetChange(exIndex, setIndex, 'rpe', +e.target.value)}
                    />
                  </div>
                  <div>
                    <SmallLabel>Form</SmallLabel>
                    <SmallInput
                      type="number"
                      value={set.formQualityScore}
                      onChange={e => handleSetChange(exIndex, setIndex, 'formQualityScore', +e.target.value)}
                    />
                  </div>
                </SetGrid>
              ))}
            </div>
            <AddSetBtn onClick={() => addSet(exIndex)}>
              <Plus size={16} /> Add Set
            </AddSetBtn>
          </Panel>
        ))}
      </ExerciseStack>

      {workoutExercises.length > 0 && (
        <SaveRow variants={itemVariants}>
          <GlowButton
            text="Save Workout"
            theme="emerald"
            leftIcon={<Save />}
            onClick={handleSaveWorkout}
            isLoading={isSaving}
          />
        </SaveRow>
      )}
    </PageContainer>
  );
};

export default WorkoutDataEntry;
