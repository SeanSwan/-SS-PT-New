import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import { format } from 'date-fns';

interface RecentSessionsProps {
  clientId: string | null;
  userRole: string;
}

interface WorkoutSession {
  id: string;
  date: string;
  title: string;
  status: string;
  experiencePointsEarned: number;
  completionPercentage: number;
  exercises: any[];
  client?: {
    firstName: string;
    lastName: string;
  };
  trainer?: {
    firstName: string;
    lastName: string;
  };
}

const RecentSessions: React.FC<RecentSessionsProps> = ({
  clientId,
  userRole
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [selectedSession, setSelectedSession] = useState<WorkoutSession | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch sessions
  useEffect(() => {
    const fetchSessions = async () => {
      if (!clientId) return;

      try {
        setIsLoading(true);
        const response = await axios.get('/api/workouts/sessions', {
          params: {
            clientId,
            status: statusFilter !== 'all' ? statusFilter : undefined,
            page: currentPage,
            limit: 10
          }
        });

        setSessions(response.data.workoutSessions || []);
        setTotalPages(response.data.totalPages || 1);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching workout sessions:', err);
        setError('Failed to fetch workout sessions');
        setIsLoading(false);
      }
    };

    if (clientId) {
      fetchSessions();
    }
  }, [clientId, currentPage, statusFilter]);

  // Fetch session details
  const fetchSessionDetails = async (sessionId: string) => {
    try {
      setIsLoading(true);
      const response = await axios.get(`/api/workouts/sessions/${sessionId}`);
      setSelectedSession(response.data.workoutSession || null);
      setViewMode('detail');
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching session details:', err);
      setError('Failed to fetch session details');
      setIsLoading(false);
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle status filter change
  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1); // Reset to first page
  };

  // Back to list view
  const handleBackToList = () => {
    setViewMode('list');
    setSelectedSession(null);
  };

  // Mark session as completed
  const handleMarkAsCompleted = async (sessionId: string) => {
    if (!clientId) return;

    try {
      setIsLoading(true);
      await axios.put(`/api/workouts/sessions/${sessionId}`, {
        status: 'completed',
        completionPercentage: 100
      });

      // Refetch session details if in detail view
      if (viewMode === 'detail' && selectedSession?.id === sessionId) {
        await fetchSessionDetails(sessionId);
      } else {
        // Otherwise refetch the list
        const response = await axios.get('/api/workouts/sessions', {
          params: {
            clientId,
            status: statusFilter !== 'all' ? statusFilter : undefined,
            page: currentPage,
            limit: 10
          }
        });

        setSessions(response.data.workoutSessions || []);
        setTotalPages(response.data.totalPages || 1);
      }

      setIsLoading(false);
    } catch (err) {
      console.error('Error updating session:', err);
      setError('Failed to update session');
      setIsLoading(false);
    }
  };

  return (
    <SessionsContainer>
      {isLoading ? (
        <LoadingMessage>Loading...</LoadingMessage>
      ) : error ? (
        <ErrorMessage>{error}</ErrorMessage>
      ) : !clientId ? (
        <EmptyState>
          No client selected. Please select a client to view workout sessions.
        </EmptyState>
      ) : viewMode === 'list' ? (
        // List view
        <>
          <ListHeader>
            <h2>Recent Workout Sessions</h2>
            <FilterContainer>
              <FilterLabel>Status:</FilterLabel>
              <StatusFilter
                value={statusFilter}
                onChange={handleStatusFilterChange}
              >
                <option value="all">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="in_progress">In Progress</option>
                <option value="cancelled">Cancelled</option>
                <option value="missed">Missed</option>
              </StatusFilter>
            </FilterContainer>
          </ListHeader>
          
          {sessions.length === 0 ? (
            <EmptyState>
              No workout sessions found with the selected filters.
            </EmptyState>
          ) : (
            <>
              <SessionsList>
                {sessions.map((session) => (
                  <SessionCard key={session.id}>
                    <SessionHeader>
                      <SessionDate>
                        {format(new Date(session.date), 'MMM dd, yyyy')}
                      </SessionDate>
                      <SessionStatus status={session.status}>
                        {session.status.replace('_', ' ')}
                      </SessionStatus>
                    </SessionHeader>
                    
                    <SessionTitle>{session.title || 'Untitled Session'}</SessionTitle>
                    
                    <SessionDetails>
                      <DetailItem>
                        <DetailLabel>Exercises:</DetailLabel>
                        <DetailValue>{session.exercises?.length || 0}</DetailValue>
                      </DetailItem>
                      
                      <DetailItem>
                        <DetailLabel>XP Earned:</DetailLabel>
                        <DetailValue>{session.experiencePointsEarned || 0}</DetailValue>
                      </DetailItem>
                      
                      <DetailItem>
                        <DetailLabel>Completion:</DetailLabel>
                        <DetailValue>{session.completionPercentage || 0}%</DetailValue>
                      </DetailItem>
                      
                      {session.trainer && (
                        <DetailItem>
                          <DetailLabel>Trainer:</DetailLabel>
                          <DetailValue>
                            {session.trainer.firstName} {session.trainer.lastName}
                          </DetailValue>
                        </DetailItem>
                      )}
                    </SessionDetails>
                    
                    <CardActions>
                      <ViewButton
                        onClick={() => fetchSessionDetails(session.id)}
                      >
                        View Details
                      </ViewButton>
                      
                      {(userRole === 'trainer' || userRole === 'admin') && 
                       session.status !== 'completed' && (
                        <CompleteButton
                          onClick={() => handleMarkAsCompleted(session.id)}
                        >
                          Mark Completed
                        </CompleteButton>
                      )}
                    </CardActions>
                  </SessionCard>
                ))}
              </SessionsList>
              
              <Pagination>
                <PaginationButton
                  disabled={currentPage === 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                >
                  Previous
                </PaginationButton>
                
                <PageInfo>
                  Page {currentPage} of {totalPages}
                </PageInfo>
                
                <PaginationButton
                  disabled={currentPage === totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                >
                  Next
                </PaginationButton>
              </Pagination>
            </>
          )}
        </>
      ) : (
        // Detail view
        selectedSession && (
          <DetailView>
            <DetailHeader>
              <BackButton onClick={handleBackToList}>
                &larr; Back to All Sessions
              </BackButton>
              <DetailStatus status={selectedSession.status}>
                {selectedSession.status.replace('_', ' ')}
              </DetailStatus>
            </DetailHeader>
            
            <DetailTitle>
              {selectedSession.title || 'Untitled Session'}
            </DetailTitle>
            
            <DetailMeta>
              <DetailMetaItem>
                <MetaLabel>Date:</MetaLabel>
                <MetaValue>
                  {format(new Date(selectedSession.date), 'MMM dd, yyyy')}
                </MetaValue>
              </DetailMetaItem>
              
              <DetailMetaItem>
                <MetaLabel>Client:</MetaLabel>
                <MetaValue>
                  {selectedSession.client
                    ? `${selectedSession.client.firstName} ${selectedSession.client.lastName}`
                    : 'N/A'}
                </MetaValue>
              </DetailMetaItem>
              
              <DetailMetaItem>
                <MetaLabel>Trainer:</MetaLabel>
                <MetaValue>
                  {selectedSession.trainer
                    ? `${selectedSession.trainer.firstName} ${selectedSession.trainer.lastName}`
                    : 'N/A'}
                </MetaValue>
              </DetailMetaItem>
              
              <DetailMetaItem>
                <MetaLabel>XP Earned:</MetaLabel>
                <MetaValue>
                  {selectedSession.experiencePointsEarned || 0}
                </MetaValue>
              </DetailMetaItem>
              
              <DetailMetaItem>
                <MetaLabel>Completion:</MetaLabel>
                <MetaValue>
                  {selectedSession.completionPercentage || 0}%
                </MetaValue>
              </DetailMetaItem>
            </DetailMeta>
            
            <ExercisesSection>
              <SectionTitle>Exercises</SectionTitle>
              
              {selectedSession.exercises.length === 0 ? (
                <EmptyExercises>No exercises in this session.</EmptyExercises>
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
                        <td>
                          {exercise.exercise?.name || 'Unknown Exercise'}
                        </td>
                        <td>
                          {exercise.exercise?.exerciseType || 'N/A'}
                        </td>
                        <td>{exercise.setsCompleted || 0}</td>
                        <td>
                          <ExerciseStatus status={exercise.completionStatus}>
                            {exercise.completionStatus || 'N/A'}
                          </ExerciseStatus>
                        </td>
                        <td>{exercise.experiencePointsEarned || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </ExerciseTable>
              )}
            </ExercisesSection>
            
            {selectedSession.trainerNotes && (
              <NotesSection>
                <SectionTitle>Trainer Notes</SectionTitle>
                <NotesContent>
                  {selectedSession.trainerNotes}
                </NotesContent>
              </NotesSection>
            )}
            
            {(userRole === 'trainer' || userRole === 'admin') && 
             selectedSession.status !== 'completed' && (
              <ActionButton
                onClick={() => handleMarkAsCompleted(selectedSession.id)}
              >
                Mark Session as Completed
              </ActionButton>
            )}
          </DetailView>
        )
      )}
    </SessionsContainer>
  );
};

// Styled components
const SessionsContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

const LoadingMessage = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  color: #6c757d;
`;

const ErrorMessage = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  color: #dc3545;
`;

const EmptyState = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  color: #6c757d;
  text-align: center;
`;

const ListHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  
  h2 {
    margin: 0;
    font-size: 22px;
  }
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
`;

const FilterContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const FilterLabel = styled.label`
  font-weight: 500;
`;

const StatusFilter = styled.select`
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  background-color: white;
  
  &:focus {
    outline: none;
    border-color: #80bdff;
    box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
  }
`;

const SessionsList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
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
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
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
      case 'missed':
        return 'background-color: #f8d7da; color: #721c24;';
      default:
        return 'background-color: #e2e3e5; color: #383d41;';
    }
  }}
`;

const SessionTitle = styled.h3`
  padding: 16px 16px 8px;
  margin: 0;
  font-size: 18px;
`;

const SessionDetails = styled.div`
  padding: 0 16px 16px;
`;

const DetailItem = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
`;

const DetailLabel = styled.span`
  color: #6c757d;
`;

const DetailValue = styled.span`
  font-weight: 500;
`;

const CardActions = styled.div`
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #dee2e6;
  margin-top: auto;
`;

const ViewButton = styled.button`
  flex: 1;
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
`;

const CompleteButton = styled.button`
  flex: 1;
  padding: 8px 0;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  
  &:hover {
    background-color: #218838;
  }
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 20px;
`;

const PaginationButton = styled.button`
  padding: 8px 16px;
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

const PageInfo = styled.div`
  font-size: 14px;
  color: #6c757d;
`;

const DetailView = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const DetailHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const BackButton = styled.button`
  background: none;
  border: none;
  color: #007bff;
  font-weight: 500;
  cursor: pointer;
  padding: 0;
  
  &:hover {
    text-decoration: underline;
  }
`;

const DetailStatus = styled.span<StatusProps>`
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 14px;
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
      case 'missed':
        return 'background-color: #f8d7da; color: #721c24;';
      default:
        return 'background-color: #e2e3e5; color: #383d41;';
    }
  }}
`;

const DetailTitle = styled.h2`
  margin: 0;
  font-size: 24px;
`;

const DetailMeta = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  background-color: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
`;

const DetailMetaItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const MetaLabel = styled.span`
  font-size: 12px;
  color: #6c757d;
`;

const MetaValue = styled.span`
  font-size: 16px;
  font-weight: 500;
`;

const ExercisesSection = styled.div`
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 20px;
`;

const SectionTitle = styled.h3`
  margin-top: 0;
  margin-bottom: 16px;
  font-size: 18px;
`;

const EmptyExercises = styled.div`
  text-align: center;
  padding: 20px;
  color: #6c757d;
`;

const ExerciseTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  
  th, td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid #dee2e6;
  }
  
  th {
    background-color: #f8f9fa;
    font-weight: 600;
    color: #495057;
  }
  
  tr:last-child td {
    border-bottom: none;
  }
  
  tr:hover td {
    background-color: #f8f9fa;
  }
`;

const ExerciseStatus = styled.span<StatusProps>`
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  
  ${props => {
    switch (props.status) {
      case 'completed':
        return 'background-color: #d4edda; color: #155724;';
      case 'partial':
        return 'background-color: #fff3cd; color: #856404;';
      case 'modified':
        return 'background-color: #cce5ff; color: #004085;';
      case 'skipped':
        return 'background-color: #e2e3e5; color: #383d41;';
      case 'failed':
        return 'background-color: #f8d7da; color: #721c24;';
      default:
        return 'background-color: #e2e3e5; color: #383d41;';
    }
  }}
`;

const NotesSection = styled.div`
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 20px;
`;

const NotesContent = styled.div`
  white-space: pre-wrap;
  font-size: 14px;
  line-height: 1.5;
`;

const ActionButton = styled.button`
  align-self: flex-end;
  padding: 10px 20px;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  
  &:hover {
    background-color: #218838;
  }
`;

export default RecentSessions;