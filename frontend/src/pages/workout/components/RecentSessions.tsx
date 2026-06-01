import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import {
  canCompleteSession,
  extractWorkoutSession,
  extractWorkoutSessions,
  formatSessionDate,
  getRecentSessionsUrl,
  type RecentWorkoutSession,
} from './RecentSessions.logic';
import {
  ActionButton,
  CardActions,
  DetailHeader,
  DetailItem,
  DetailMeta,
  DetailTitle,
  DetailView,
  ErrorMessage,
  ExerciseTable,
  FilterContainer,
  ListHeader,
  MutedLabel,
  Pagination,
  Panel,
  SessionCard,
  SessionDetails,
  SessionHeader,
  SessionsContainer,
  SessionsList,
  SessionStatus,
  SessionTitle,
  StateMessage,
  StatusFilter,
  StrongValue,
} from './RecentSessions.styles';

const PAGE_SIZE = 10;

interface RecentSessionsProps {
  clientId: string | null;
  userRole: string;
}

const RecentSessions: React.FC<RecentSessionsProps> = ({ clientId, userRole }) => {
  const { authAxios } = useAuth();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<RecentWorkoutSession[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hasNextPage, setHasNextPage] = useState<boolean>(false);
  const [selectedSession, setSelectedSession] = useState<RecentWorkoutSession | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const loadSessions = useCallback(async () => {
    if (!clientId) return;

    try {
      setIsLoading(true);
      setError(null);
      const response = await authAxios.get(getRecentSessionsUrl(clientId, userRole), {
        params: {
          status: statusFilter !== 'all' ? statusFilter : undefined,
          page: currentPage,
          limit: PAGE_SIZE,
        },
      });
      const nextSessions = extractWorkoutSessions(response.data);
      setSessions(nextSessions);
      setHasNextPage(nextSessions.length === PAGE_SIZE);
    } catch (err) {
      console.error('Error fetching workout sessions:', err);
      setError('Failed to fetch workout sessions');
    } finally {
      setIsLoading(false);
    }
  }, [authAxios, clientId, currentPage, statusFilter, userRole]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const fetchSessionDetails = useCallback(async (sessionId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await authAxios.get(`/api/workout/sessions/${sessionId}`);
      const nextSession = extractWorkoutSession(response.data);
      setSelectedSession(nextSession);
      setViewMode('detail');
    } catch (err) {
      console.error('Error fetching session details:', err);
      setError('Failed to fetch session details');
    } finally {
      setIsLoading(false);
    }
  }, [authAxios]);

  const handleMarkAsCompleted = useCallback(async (sessionId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      await authAxios.put(`/api/workout/sessions/${sessionId}`, {
        status: 'completed',
        completedAt: new Date().toISOString(),
      });

      if (viewMode === 'detail' && selectedSession?.id === sessionId) {
        await fetchSessionDetails(sessionId);
      } else {
        await loadSessions();
      }
    } catch (err) {
      console.error('Error updating session:', err);
      setError('Failed to update session');
    } finally {
      setIsLoading(false);
    }
  }, [authAxios, fetchSessionDetails, loadSessions, selectedSession?.id, viewMode]);

  const handleStatusFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(event.target.value);
    setCurrentPage(1);
  };

  if (isLoading) return <StateMessage>Loading...</StateMessage>;
  if (error) return <ErrorMessage>{error}</ErrorMessage>;
  if (!clientId) return <StateMessage>Select a client to view workout sessions.</StateMessage>;

  return (
    <SessionsContainer>
      {viewMode === 'list' ? (
        <>
          <ListHeader>
            <h2>Recent Workout Sessions</h2>
            <FilterContainer>
              Status
              <StatusFilter value={statusFilter} onChange={handleStatusFilterChange}>
                <option value="all">All Statuses</option>
                <option value="planned">Planned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="skipped">Skipped</option>
                <option value="cancelled">Cancelled</option>
              </StatusFilter>
            </FilterContainer>
          </ListHeader>

          {sessions.length === 0 ? (
            <StateMessage>No workout sessions found with the selected filters.</StateMessage>
          ) : (
            <>
              <SessionsList>
                {sessions.map((session) => (
                  <SessionCard key={session.id}>
                    <SessionHeader>
                      <span>{formatSessionDate(session.date)}</span>
                      <SessionStatus status={session.status}>{session.status.replace('_', ' ')}</SessionStatus>
                    </SessionHeader>
                    <SessionTitle>{session.title}</SessionTitle>
                    <SessionDetails>
                      <DetailItem>
                        <MutedLabel>Exercises</MutedLabel>
                        <StrongValue>{session.exercises.length}</StrongValue>
                      </DetailItem>
                      <DetailItem>
                        <MutedLabel>XP</MutedLabel>
                        <StrongValue>{session.experiencePoints}</StrongValue>
                      </DetailItem>
                      <DetailItem>
                        <MutedLabel>Completion</MutedLabel>
                        <StrongValue>{session.completionPercentage}%</StrongValue>
                      </DetailItem>
                      {session.trainerName && (
                        <DetailItem>
                          <MutedLabel>Trainer</MutedLabel>
                          <StrongValue>{session.trainerName}</StrongValue>
                        </DetailItem>
                      )}
                    </SessionDetails>
                    <CardActions>
                      <ActionButton onClick={() => fetchSessionDetails(session.id)}>Details</ActionButton>
                      {canCompleteSession(userRole, session.status) && (
                        <ActionButton onClick={() => handleMarkAsCompleted(session.id)}>
                          Complete
                        </ActionButton>
                      )}
                    </CardActions>
                  </SessionCard>
                ))}
              </SessionsList>
              <Pagination>
                <ActionButton disabled={currentPage === 1} onClick={() => setCurrentPage((page) => page - 1)}>
                  Previous
                </ActionButton>
                <StrongValue>Page {currentPage}</StrongValue>
                <ActionButton disabled={!hasNextPage} onClick={() => setCurrentPage((page) => page + 1)}>
                  Next
                </ActionButton>
              </Pagination>
            </>
          )}
        </>
      ) : selectedSession ? (
        <DetailView>
          <DetailHeader>
            <ActionButton onClick={() => setViewMode('list')}>Back</ActionButton>
            <SessionStatus status={selectedSession.status}>
              {selectedSession.status.replace('_', ' ')}
            </SessionStatus>
          </DetailHeader>
          <DetailTitle>{selectedSession.title}</DetailTitle>
          <DetailMeta>
            <DetailItem>
              <MutedLabel>Date</MutedLabel>
              <StrongValue>{formatSessionDate(selectedSession.date)}</StrongValue>
            </DetailItem>
            <DetailItem>
              <MutedLabel>Client</MutedLabel>
              <StrongValue>{selectedSession.clientName || 'N/A'}</StrongValue>
            </DetailItem>
            <DetailItem>
              <MutedLabel>Trainer</MutedLabel>
              <StrongValue>{selectedSession.trainerName || 'N/A'}</StrongValue>
            </DetailItem>
            <DetailItem>
              <MutedLabel>XP</MutedLabel>
              <StrongValue>{selectedSession.experiencePoints}</StrongValue>
            </DetailItem>
          </DetailMeta>
          <Panel>
            <h3>Exercises</h3>
            {selectedSession.exercises.length === 0 ? (
              <StateMessage>No exercise data recorded for this session.</StateMessage>
            ) : (
              <ExerciseTable>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Exercise</th>
                    <th>Type</th>
                    <th>Sets</th>
                    <th>Status</th>
                    <th>XP</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedSession.exercises.map((exercise, index) => (
                    <tr key={exercise.id}>
                      <td>{index + 1}</td>
                      <td>{exercise.name}</td>
                      <td>{exercise.type}</td>
                      <td>{exercise.sets}</td>
                      <td>{exercise.status}</td>
                      <td>{exercise.experiencePoints}</td>
                    </tr>
                  ))}
                </tbody>
              </ExerciseTable>
            )}
          </Panel>
          {selectedSession.notes && (
            <Panel>
              <h3>Notes</h3>
              <p>{selectedSession.notes}</p>
            </Panel>
          )}
          {canCompleteSession(userRole, selectedSession.status) && (
            <ActionButton onClick={() => handleMarkAsCompleted(selectedSession.id)}>
              Mark Session Complete
            </ActionButton>
          )}
        </DetailView>
      ) : null}
    </SessionsContainer>
  );
};

export default RecentSessions;
