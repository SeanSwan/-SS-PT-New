import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import WorkoutForm from './WorkoutForm';
import ExerciseSelector from './ExerciseSelector';
import SessionNotes from './SessionNotes';
import WorkoutLoggerConfirmDialog, { type WorkoutLoggerConfirmRequest } from '../../../components/WorkoutLogger/WorkoutLoggerConfirmDialog';
import {
  buildWorkoutSessionPayload,
  createBlankWorkoutSession,
  extractWorkoutHistory,
  formatEditableSessionDate,
  formatWorkoutSessionDate,
  getWorkoutHistoryUrl,
  hasWorkoutSessionDraft,
  type PlannerWorkoutSession
} from './WorkoutPlanner.logic';
import {
  PlannerContainer,
  LoadingMessage,
  ErrorMessage,
  ViewContainer,
  ViewHeader,
  CreateButton,
  EmptyState,
  SessionsList,
  SessionCard,
  SessionHeader,
  SessionDate,
  SessionStatus,
  SessionTitle,
  SessionInfo,
  InfoItem,
  SessionActions,
  ViewButton,
  EditButton,
  EditContainer,
  EditHeader,
  ButtonGroup,
  SaveButton,
  CancelButton,
  EditContent,
  FormColumn,
  SelectorColumn,
} from './WorkoutPlanner.styles';

interface WorkoutPlannerProps {
  clientId: string | null;
  userRole: string;
}

type WorkoutSession = PlannerWorkoutSession;

const WorkoutPlanner: React.FC<WorkoutPlannerProps> = ({ clientId, userRole }) => {
  const { authAxios } = useAuth();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [workoutPlans, setWorkoutPlans] = useState<PlannerWorkoutSession[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<WorkoutSession | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [selectedExercises, setSelectedExercises] = useState<any[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [sessionDate, setSessionDate] = useState<string>(formatEditableSessionDate(null));
  const [discardRequest, setDiscardRequest] = useState<WorkoutLoggerConfirmRequest | null>(null);

  const refreshWorkoutHistory = useCallback(async () => {
    if (!clientId) return;

    const response = await authAxios.get(getWorkoutHistoryUrl(clientId));
    setWorkoutPlans(extractWorkoutHistory(response.data));
  }, [authAxios, clientId]);

  useEffect(() => {
    const fetchWorkoutPlans = async () => {
      if (!clientId) return;

      try {
        setIsLoading(true);
        await refreshWorkoutHistory();
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
  }, [clientId, refreshWorkoutHistory]);

  const handleCreateSession = () => {
    setCurrentSession(createBlankWorkoutSession(sessionDate));
    setSelectedExercises([]);
    setNotes('');
    setIsEditing(true);
  };

  const handleSaveSession = async () => {
    if (!clientId) return;

    try {
      setIsLoading(true);
      const sessionData = buildWorkoutSessionPayload({
        clientId,
        currentSession,
        notes,
        selectedExercises,
        sessionDate
      });
      
      if (currentSession?.id) {
        await authAxios.put(`/api/workout/sessions/${currentSession.id}`, sessionData);
      } else {
        await authAxios.post('/api/workout/sessions', sessionData);
      }
      
      await refreshWorkoutHistory();
      
      setIsEditing(false);
      setCurrentSession(null);
      setIsLoading(false);
    } catch (err) {
      console.error('Error saving workout session:', err);
      setError('Failed to save workout session');
      setIsLoading(false);
    }
  };

  const handleViewSession = (session: WorkoutSession) => {
    setSelectedPlan(prev => (prev === session.id ? null : session.id));
  };

  const handleEditSession = (session: WorkoutSession) => {
    setCurrentSession(session);
    setSessionDate(formatEditableSessionDate(session.date));
    setSelectedExercises(Array.isArray(session.exercises) ? session.exercises : []);
    setNotes(session.notes || '');
    setSelectedPlan(session.id);
    setIsEditing(true);
  };

  const discardCurrentDraft = useCallback(() => {
    setIsEditing(false);
    setCurrentSession(null);
    setDiscardRequest(null);
  }, []);

  const handleCancelEdit = () => {
    if (!hasWorkoutSessionDraft({ currentSession, notes, selectedExercises })) {
      discardCurrentDraft();
      return;
    }

    setDiscardRequest({
      title: 'Discard workout session draft?',
      message: 'Unsaved exercise selections, notes, and session edits will be lost.',
      confirmLabel: 'Discard draft',
      cancelLabel: 'Keep editing',
      tone: 'danger',
      onConfirm: discardCurrentDraft
    });
  };

  const handleAddExercise = (exercise: any) => {
    setSelectedExercises(prev => [...prev, exercise]);
  };

  const handleRemoveExercise = (exerciseId: string) => {
    setSelectedExercises(prev => prev.filter(ex => ex.id !== exerciseId));
  };

  const handleMoveExercise = (index: number, direction: 'up' | 'down') => {
    setSelectedExercises(prev => {
      const nextIndex = direction === 'up' ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;

      const reordered = [...prev];
      [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];
      return reordered;
    });
  };

  const handleNotesChange = (value: string) => {
    setNotes(value);
  };

  const isDisabled = !clientId || (userRole === 'client');

  return (
    <PlannerContainer>
      {isLoading ? (
        <LoadingMessage>Loading...</LoadingMessage>
      ) : error ? (
        <ErrorMessage>{error}</ErrorMessage>
      ) : isEditing ? (
        <EditContainer>
          <EditHeader>
            <h2>{currentSession?.id ? 'Edit Workout Session' : 'Create Workout Session'}</h2>
            <ButtonGroup>
              <SaveButton onClick={handleSaveSession}>Save Session</SaveButton>
              <CancelButton onClick={handleCancelEdit}>Cancel</CancelButton>
            </ButtonGroup>
          </EditHeader>
          
          <EditContent>
            <FormColumn>
              <WorkoutForm
                session={currentSession}
                onSessionChange={setCurrentSession}
                selectedExercises={selectedExercises}
                onMoveExercise={handleMoveExercise}
                onRemoveExercise={handleRemoveExercise}
                sessionDate={sessionDate}
                onDateChange={setSessionDate}
              />
              
              <SessionNotes
                notes={notes}
                onChange={handleNotesChange}
              />
            </FormColumn>
            
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
                    <SessionDate>{formatWorkoutSessionDate(session.date)}</SessionDate>
                    <SessionStatus status={session.status}>{session.status}</SessionStatus>
                  </SessionHeader>
                  <SessionTitle>{session.title}</SessionTitle>
                  <SessionInfo>
                    <InfoItem>
                      <strong>Exercises:</strong> {session.exerciseCount}
                    </InfoItem>
                    <InfoItem>
                      <strong>Completion:</strong> {session.completionPercentage || 0}%
                    </InfoItem>
                  </SessionInfo>
                  {selectedPlan === session.id && (
                    <SessionInfo>
                      <InfoItem>
                        <strong>Session ID:</strong> {session.id}
                      </InfoItem>
                      <InfoItem>
                        <strong>Date:</strong> {formatWorkoutSessionDate(session.date)}
                      </InfoItem>
                      {session.notes && (
                        <InfoItem>
                          <strong>Notes:</strong> {session.notes}
                        </InfoItem>
                      )}
                    </SessionInfo>
                  )}
                  <SessionActions>
                    <ViewButton onClick={() => handleViewSession(session)}>
                      {selectedPlan === session.id ? 'Hide Details' : 'View Details'}
                    </ViewButton>
                    {(userRole === 'trainer' || userRole === 'admin') && (
                      <EditButton onClick={() => handleEditSession(session)}>Edit</EditButton>
                    )}
                  </SessionActions>
                </SessionCard>
              ))}
            </SessionsList>
          )}
        </ViewContainer>
      )}
      <WorkoutLoggerConfirmDialog request={discardRequest} onClose={() => setDiscardRequest(null)} />
    </PlannerContainer>
  );
};

export default WorkoutPlanner;
