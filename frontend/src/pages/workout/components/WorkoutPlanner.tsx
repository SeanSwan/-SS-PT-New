import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import { format } from 'date-fns';
import WorkoutForm from './WorkoutForm';
import ExerciseSelector from './ExerciseSelector';
import SessionNotes from './SessionNotes';

interface WorkoutPlannerProps {
  clientId: string | null;
  userRole: string;
}

interface WorkoutSession {
  id: string;
  date: string;
  status: string;
  title: string;
  exercises: any[];
}

const WorkoutPlanner: React.FC<WorkoutPlannerProps> = ({ clientId, userRole }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [workoutPlans, setWorkoutPlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<WorkoutSession | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [selectedExercises, setSelectedExercises] = useState<any[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [sessionDate, setSessionDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  // Fetch workout plans when client is selected
  useEffect(() => {
    const fetchWorkoutPlans = async () => {
      if (!clientId) return;

      try {
        setIsLoading(true);
        const response = await axios.get(`/api/workouts/history/${clientId}`);
        setWorkoutPlans(response.data.history?.workoutSessions || []);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching workout plans:', err);
        setError('Failed to fetch workout plans');
        setIsLoading(false);
      }
    };

    if (clientId) {
      fetchWorkoutPlans();
    }
  }, [clientId]);

  // Create new session
  const handleCreateSession = () => {
    setCurrentSession({
      id: '',
      date: sessionDate,
      status: 'scheduled',
      title: 'New Workout Session',
      exercises: []
    });
    setSelectedExercises([]);
    setNotes('');
    setIsEditing(true);
  };

  // Save session
  const handleSaveSession = async () => {
    if (!clientId) return;

    try {
      setIsLoading(true);
      
      const sessionData = {
        clientId,
        date: sessionDate,
        title: currentSession?.title || 'Workout Session',
        workoutType: 'scheduled',
        status: 'scheduled',
        trainerNotes: notes,
        exercises: selectedExercises.map((exercise, index) => ({
          exerciseId: exercise.id,
          orderIndex: index,
          setsCompleted: 0,
          setDetails: Array(exercise.recommendedSets || 3).fill().map((_, setIndex) => ({
            setNumber: setIndex + 1,
            reps: exercise.recommendedReps || 10,
            weight: 0,
            completed: false
          })),
          completionStatus: 'scheduled'
        }))
      };
      
      if (currentSession?.id) {
        // Update existing session
        await axios.put(`/api/workouts/sessions/${currentSession.id}`, sessionData);
      } else {
        // Create new session
        await axios.post('/api/workouts/sessions', sessionData);
      }
      
      // Refresh workout plans
      const response = await axios.get(`/api/workouts/history/${clientId}`);
      setWorkoutPlans(response.data.history?.workoutSessions || []);
      
      setIsEditing(false);
      setCurrentSession(null);
      setIsLoading(false);
    } catch (err) {
      console.error('Error saving workout session:', err);
      setError('Failed to save workout session');
      setIsLoading(false);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setIsEditing(false);
    setCurrentSession(null);
  };

  // Add exercise to session
  const handleAddExercise = (exercise: any) => {
    setSelectedExercises(prev => [...prev, exercise]);
  };

  // Remove exercise from session
  const handleRemoveExercise = (exerciseId: string) => {
    setSelectedExercises(prev => prev.filter(ex => ex.id !== exerciseId));
  };

  // Handle notes change
  const handleNotesChange = (value: string) => {
    setNotes(value);
  };

  // Disable if no client selected or if not authorized
  const isDisabled = !clientId || (userRole === 'client');

  return (
    <PlannerContainer>
      {isLoading ? (
        <LoadingMessage>Loading...</LoadingMessage>
      ) : error ? (
        <ErrorMessage>{error}</ErrorMessage>
      ) : isEditing ? (
        // Editing/creating a session
        <EditContainer>
          <EditHeader>
            <h2>{currentSession?.id ? 'Edit Workout Session' : 'Create Workout Session'}</h2>
            <ButtonGroup>
              <SaveButton onClick={handleSaveSession}>Save Session</SaveButton>
              <CancelButton onClick={handleCancelEdit}>Cancel</CancelButton>
            </ButtonGroup>
          </EditHeader>
          
          <EditContent>
            {/* Session form */}
            <FormColumn>
              <WorkoutForm
                session={currentSession}
                onSessionChange={setCurrentSession}
                selectedExercises={selectedExercises}
                onRemoveExercise={handleRemoveExercise}
                sessionDate={sessionDate}
                onDateChange={setSessionDate}
              />
              
              {/* Session notes */}
              <SessionNotes
                notes={notes}
                onChange={handleNotesChange}
              />
            </FormColumn>
            
            {/* Exercise selector */}
            <SelectorColumn>
              <ExerciseSelector
                clientId={clientId}
                onAddExercise={handleAddExercise}
                selectedExerciseIds={selectedExercises.map(ex => ex.id)}
              />
            </SelectorColumn>
          </EditContent>
        </EditContainer>
      ) : (
        // Viewing session list
        <ViewContainer>
          <ViewHeader>
            <h2>Workout Sessions</h2>
            <CreateButton onClick={handleCreateSession} disabled={isDisabled}>
              Create New Session
            </CreateButton>
          </ViewHeader>
          
          {workoutPlans.length === 0 ? (
            <EmptyState>
              <p>No workout sessions found. Create a new session to get started.</p>
            </EmptyState>
          ) : (
            <SessionsList>
              {workoutPlans.map(session => (
                <SessionCard key={session.id}>
                  <SessionHeader>
                    <SessionDate>{format(new Date(session.date), 'MMM dd, yyyy')}</SessionDate>
                    <SessionStatus status={session.status}>{session.status}</SessionStatus>
                  </SessionHeader>
                  <SessionTitle>{session.title}</SessionTitle>
                  <SessionInfo>
                    <InfoItem>
                      <strong>Exercises:</strong> {session.exercises?.length || 0}
                    </InfoItem>
                    <InfoItem>
                      <strong>Completion:</strong> {session.completionPercentage || 0}%
                    </InfoItem>
                  </SessionInfo>
                  <SessionActions>
                    <ViewButton>View Details</ViewButton>
                    {(userRole === 'trainer' || userRole === 'admin') && (
                      <EditButton>Edit</EditButton>
                    )}
                  </SessionActions>
                </SessionCard>
              ))}
            </SessionsList>
          )}
        </ViewContainer>
      )}
    </PlannerContainer>
  );
};

// Styled components
const PlannerContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

const LoadingMessage = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  font-size: 18px;
  color: #666;
`;

const ErrorMessage = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  font-size: 18px;
  color: #dc3545;
`;

const ViewContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

const ViewHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  
  h2 {
    font-size: 20px;
    margin: 0;
  }
`;

const CreateButton = styled.button`
  padding: 10px 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  
  &:hover {
    background-color: #0069d9;
  }
  
  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
`;

const EmptyState = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  color: #666;
`;

const SessionsList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
`;

const SessionCard = styled.div`
  display: flex;
  flex-direction: column;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: transform 0.2s;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
`;

const SessionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
`;

const SessionDate = styled.span`
  font-weight: 500;
`;

interface StatusProps {
  status: string;
}

const SessionStatus = styled.span<StatusProps>`
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  
  ${props => {
    switch (props.status) {
      case 'completed':
        return 'background-color: #d4edda; color: #155724;';
      case 'scheduled':
        return 'background-color: #cce5ff; color: #004085;';
      case 'in_progress':
        return 'background-color: #fff3cd; color: #856404;';
      case 'cancelled':
        return 'background-color: #f8d7da; color: #721c24;';
      default:
        return 'background-color: #e2e3e5; color: #383d41;';
    }
  }}
`;

const SessionTitle = styled.h3`
  padding: 16px 16px 8px;
  margin: 0;
  font-size: 16px;
`;

const SessionInfo = styled.div`
  padding: 0 16px 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`;

const InfoItem = styled.div`
  font-size: 14px;
  color: #666;
`;

const SessionActions = styled.div`
  display: flex;
  padding: 12px 16px;
  border-top: 1px solid #dee2e6;
  gap: 8px;
`;

const ViewButton = styled.button`
  flex: 1;
  padding: 8px;
  background-color: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  
  &:hover {
    background-color: #5a6268;
  }
`;

const EditButton = styled.button`
  flex: 1;
  padding: 8px;
  background-color: #17a2b8;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  
  &:hover {
    background-color: #138496;
  }
`;

const EditContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

const EditHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  
  h2 {
    font-size: 20px;
    margin: 0;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
`;

const SaveButton = styled.button`
  padding: 10px 16px;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  
  &:hover {
    background-color: #218838;
  }
`;

const CancelButton = styled.button`
  padding: 10px 16px;
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  
  &:hover {
    background-color: #c82333;
  }
`;

const EditContent = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FormColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const SelectorColumn = styled.div`
  display: flex;
  flex-direction: column;
`;

export default WorkoutPlanner;