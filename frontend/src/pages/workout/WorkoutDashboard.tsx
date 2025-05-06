/**
 * Workout Dashboard
 * ================
 * Main dashboard for workout tracking functionality
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../../context/AuthContext';
import ClientProgress from './components/ClientProgress';

// Types
interface User {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  email: string;
}

// Styled Components
const DashboardContainer = styled.div`
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  
  @media (min-width: 2560px) {
    max-width: 1800px;
  }
`;

const DashboardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
`;

const Title = styled.h1`
  font-size: 2rem;
  color: #00ffff;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
  margin: 0;
  
  @media (max-width: 768px) {
    font-size: 1.8rem;
  }
`;

const TabsContainer = styled.div`
  display: flex;
  margin-bottom: 30px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const Tab = styled.button<{ $isActive: boolean }>`
  padding: 12px 20px;
  background: transparent;
  border: none;
  color: ${props => props.$isActive ? '#00ffff' : 'white'};
  font-size: 1rem;
  cursor: pointer;
  position: relative;
  transition: all 0.3s ease;
  
  &::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    width: 100%;
    height: 2px;
    background: ${props => props.$isActive ? '#00ffff' : 'transparent'};
    transition: background 0.3s ease;
  }
  
  &:hover {
    color: #00ffff;
    
    &::after {
      background: rgba(0, 255, 255, 0.5);
    }
  }
`;

const ClientSelectorContainer = styled.div`
  margin-bottom: 30px;
`;

const ClientSelector = styled.select`
  padding: 10px 15px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  outline: none;
  cursor: pointer;
  font-size: 1rem;
  min-width: 200px;
  
  &:hover, &:focus {
    border-color: #00ffff;
    box-shadow: 0 0 5px rgba(0, 255, 255, 0.3);
  }
`;

const ErrorMessage = styled.div`
  padding: 20px;
  background: rgba(255, 72, 72, 0.1);
  border: 1px solid rgba(255, 72, 72, 0.3);
  border-radius: 8px;
  color: #ff4848;
  margin-bottom: 20px;
`;

const WorkoutDashboard: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user, authAxios } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<string>('progress');
  const [clients, setClients] = useState<User[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  // Fetch clients for trainers/admins
  useEffect(() => {
    const fetchClients = async () => {
      if (!user || (user.role !== 'admin' && user.role !== 'trainer')) {
        return;
      }
      
      try {
        const response = await authAxios.get('/api/auth/clients');
        setClients(response.data.clients);
      } catch (err: any) {
        console.error('Error fetching clients:', err);
        setError(err.response?.data?.message || 'Failed to load clients');
      }
    };
    
    fetchClients();
  }, [user, authAxios]);
  
  // Set initial selected client
  useEffect(() => {
    if (userId) {
      setSelectedClientId(userId);
    } else if (user) {
      setSelectedClientId(user.id);
    }
  }, [userId, user]);
  
  // Handle client change
  const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const clientId = e.target.value;
    setSelectedClientId(clientId);
    
    // Update URL if client changes
    if (clientId !== userId) {
      navigate(`/workout/${clientId}`);
    }
  };
  
  // Check if user is authorized to view this dashboard
  const isAuthorized = () => {
    if (!user) return false;
    
    // If no specific userId is provided, the user is viewing their own dashboard
    if (!userId) return true;
    
    // If a userId is provided, check if the current user is authorized to view it
    if (user.id === userId) return true;
    if (user.role === 'admin' || user.role === 'trainer') return true;
    
    return false;
  };
  
  // Render unauthorized message
  if (!isAuthorized()) {
    return (
      <DashboardContainer>
        <ErrorMessage>
          You are not authorized to view this workout dashboard.
        </ErrorMessage>
      </DashboardContainer>
    );
  }
  
  return (
    <DashboardContainer>
      <DashboardHeader>
        <Title>Workout Dashboard</Title>
      </DashboardHeader>
      
      {/* Client Selector for Trainers/Admins */}
      {(user?.role === 'admin' || user?.role === 'trainer') && clients.length > 0 && (
        <ClientSelectorContainer>
          <ClientSelector
            value={selectedClientId}
            onChange={handleClientChange}
          >
            {user && <option value={user.id}>My Workouts</option>}
            {clients.map(client => (
              <option key={client.id} value={client.id}>
                {client.firstName} {client.lastName} ({client.email})
              </option>
            ))}
          </ClientSelector>
        </ClientSelectorContainer>
      )}
      
      {/* Error Message */}
      {error && <ErrorMessage>{error}</ErrorMessage>}
      
      {/* Tabs */}
      <TabsContainer>
        <Tab
          $isActive={activeTab === 'progress'}
          onClick={() => setActiveTab('progress')}
        >
          Progress
        </Tab>
        <Tab
          $isActive={activeTab === 'planner'}
          onClick={() => setActiveTab('planner')}
        >
          Workout Planner
        </Tab>
        <Tab
          $isActive={activeTab === 'sessions'}
          onClick={() => setActiveTab('sessions')}
        >
          Recent Sessions
        </Tab>
      </TabsContainer>
      
      {/* Tab Content */}
      {activeTab === 'progress' && (
        <ClientProgress />
      )}
      
      {activeTab === 'planner' && (
        <div>Workout Planner - Coming Soon</div>
      )}
      
      {activeTab === 'sessions' && (
        <div>Recent Sessions - Coming Soon</div>
      )}
    </DashboardContainer>
  );
};

export default WorkoutDashboard;