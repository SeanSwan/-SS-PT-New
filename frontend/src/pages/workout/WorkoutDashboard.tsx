/**
 * Workout Dashboard
 * ================
 * Protected workout tracking surface for progress, planning, and session history.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ClientProgress from './components/ClientProgress';
import RecentSessions from './components/RecentSessions';
import WorkoutPlanner from './components/WorkoutPlanner';
import {
  getDashboardClientLabel,
  getInitialWorkoutDashboardClientId,
  getWorkoutDashboardClients,
  isWorkoutDashboardStaffRole,
  isWorkoutDashboardAuthorized,
  type WorkoutDashboardClient,
} from './WorkoutDashboard.logic';
import {
  ClientSelector,
  ClientSelectorContainer,
  DashboardContainer,
  DashboardHeader,
  ErrorMessage,
  Tab,
  TabsContainer,
  Title,
} from './WorkoutDashboard.styles';

const WorkoutDashboard: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user, authAxios } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<string>('progress');
  const [clients, setClients] = useState<WorkoutDashboardClient[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const nextClientId = getInitialWorkoutDashboardClientId(userId, user, clients);
    setSelectedClientId((currentClientId) => (
      currentClientId === nextClientId ? currentClientId : nextClientId
    ));
  }, [userId, user, clients]);

  useEffect(() => {
    const fetchClients = async () => {
      if (!user || !isWorkoutDashboardStaffRole(user.role)) return;

      try {
        setError(null);
        const nextClients = await getWorkoutDashboardClients(authAxios, user);
        setClients(nextClients);
      } catch (err: any) {
        console.error('Error fetching workout dashboard clients:', err);
        setClients([]);
        setError(err.response?.data?.message || 'Failed to load clients');
      }
    };

    fetchClients();
  }, [user, authAxios]);

  const handleClientChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const clientId = event.target.value;
    setSelectedClientId(clientId);

    if (clientId !== userId) {
      navigate(`/workout/${clientId}`);
    }
  };

  if (!isWorkoutDashboardAuthorized(user, userId)) {
    return (
      <DashboardContainer>
        <ErrorMessage>You are not authorized to view this workout dashboard.</ErrorMessage>
      </DashboardContainer>
    );
  }

  return (
    <DashboardContainer>
      <DashboardHeader>
        <Title>Workout Dashboard</Title>
      </DashboardHeader>

      {isWorkoutDashboardStaffRole(user?.role) && clients.length > 0 && (
        <ClientSelectorContainer>
          <ClientSelector value={selectedClientId} onChange={handleClientChange}>
            {clients.map((client) => (
              <option key={String(client.id)} value={String(client.id)}>
                {getDashboardClientLabel(client)}
              </option>
            ))}
          </ClientSelector>
        </ClientSelectorContainer>
      )}

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <TabsContainer>
        <Tab $isActive={activeTab === 'progress'} onClick={() => setActiveTab('progress')}>
          Progress
        </Tab>
        <Tab $isActive={activeTab === 'planner'} onClick={() => setActiveTab('planner')}>
          Workout Planner
        </Tab>
        <Tab $isActive={activeTab === 'sessions'} onClick={() => setActiveTab('sessions')}>
          Recent Sessions
        </Tab>
      </TabsContainer>

      {activeTab === 'progress' && (
        <ClientProgress userId={selectedClientId || null} userRole={user?.role || 'client'} />
      )}

      {activeTab === 'planner' && (
        <WorkoutPlanner clientId={selectedClientId || null} userRole={user?.role || 'client'} />
      )}

      {activeTab === 'sessions' && (
        <RecentSessions clientId={selectedClientId || null} userRole={user?.role || 'client'} />
      )}
    </DashboardContainer>
  );
};

export default WorkoutDashboard;
