/**
 * trainer-dashboard.tsx
 * Trainer Dashboard View Component for SwanStudios Platform
 */
import React, { useState, useEffect, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { 
  Users, 
  Calendar, 
  TrendingUp, 
  Target, 
  Plus,
  Search,
  Filter,
  MoreVertical,
  User,
  Video,
  Clock,
  Upload
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// Styled Components
const DashboardContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding: 2rem;
  background: #0a0a1a;
  min-height: 100vh;
  color: white;

  @media (max-width: 768px) {
    padding: 1rem;
    gap: 1rem;
  }
`;

const DashboardHeader = styled.div`
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
`;

const HeaderContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const HeaderTitle = styled.h1`
  font-size: 1.75rem;
  font-weight: 600;
  margin: 0;
  color: #00ffff;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
`;

const WelcomeMessage = styled.p`
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
`;

const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
`;

const StatCard = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, #00ffff, #7851a9);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 255, 255, 0.1);
    
    &::before {
      opacity: 1;
    }
  }
`;

const StatIcon = styled.div<{ color: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: ${({ color }) => `${color}15`};
  border: 1px solid ${({ color }) => `${color}30`};

  svg {
    color: ${({ color }) => color};
  }
`;

const StatContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
  line-height: 1.2;
`;

const StatLabel = styled.div`
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 0.25rem;
`;

const SectionContainer = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 1.5rem;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  color: #00ffff;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
`;

const ActionButton = styled.button`
  background: linear-gradient(135deg, #00ffff, #00c8ff);
  border: none;
  border-radius: 8px;
  padding: 0.6rem 1.2rem;
  color: #0a0a1a;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s ease;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 255, 255, 0.4);
    
    &::before {
      left: 100%;
    }
  }

  &:active {
    transform: translateY(0);
  }
`;

const GridContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const ClientCard = styled.div`
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.75rem;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 3px;
    height: 100%;
    background: linear-gradient(180deg, #00ffff, #7851a9);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    transform: translateX(8px);
    box-shadow: 0 4px 16px rgba(0, 255, 255, 0.1);
    
    &::before {
      opacity: 1;
    }
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

const ClientAvatar = styled.div`
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, #00ffff, #7851a9);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 700;
  font-size: 1.1rem;
  box-shadow: 0 4px 12px rgba(0, 255, 255, 0.3);
`;

const ClientInfo = styled.div`
  flex: 1;
`;

const ClientName = styled.div`
  font-weight: 600;
  color: white;
  margin-bottom: 0.25rem;
  font-size: 1rem;
`;

const ClientDetails = styled.div`
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 0.1rem;
`;

const ClientStatus = styled.div<{ status: string }>`
  padding: 0.35rem 0.85rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: ${({ status }) => {
    switch (status) {
      case 'active': return 'linear-gradient(135deg, #10b981, #34d399)';
      case 'inactive': return 'linear-gradient(135deg, #ef4444, #f87171)';
      case 'pending': return 'linear-gradient(135deg, #f59e0b, #fbbf24)';
      default: return 'linear-gradient(135deg, #6b7280, #9ca3af)';
    }
  }};
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
`;

const SessionCard = styled.div`
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 1rem;
  margin-bottom: 0.75rem;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 3px;
    background: linear-gradient(90deg, #00ffff, #7851a9);
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 255, 255, 0.1);
    
    &::before {
      opacity: 1;
    }
  }
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const SessionTime = styled.div`
  font-size: 0.9rem;
  color: #00ffff;
  font-weight: 600;
  margin-bottom: 0.5rem;
  text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
`;

const SessionInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
`;

const SessionDetails = styled.div`
  color: white;
  font-weight: 600;
  margin-bottom: 0.25rem;
  font-size: 1rem;
`;

const SessionClient = styled.div`
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
`;

const SessionDuration = styled.div`
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.85rem;
  font-weight: 500;
  padding: 0.25rem 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 15px;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const SearchFilterContainer = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  align-items: center;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const SearchInputContainer = styled.div`
  position: relative;
  flex: 1;
`;

const SearchInput = styled.input`
  width: 100%;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 0.6rem 1rem 0.6rem 2.5rem;
  color: white;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
  
  &:focus {
    outline: none;
    border-color: #00ffff;
    background: rgba(255, 255, 255, 0.1);
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
  }
`;

const SearchIcon = styled(Search)`
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 255, 255, 0.5);
  pointer-events: none;
`;

const FilterButton = styled.button`
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 0.6rem 1rem;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  font-weight: 500;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: #00ffff;
    transform: translateY(-2px);
  }
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 3rem;
  color: #00ffff;
  font-size: 1.1rem;
  
  &::after {
    content: '';
    width: 24px;
    height: 24px;
    border: 3px solid rgba(0, 255, 255, 0.3);
    border-top: 3px solid #00ffff;
    border-radius: 50%;
    margin-left: 1rem;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem 2rem;
  color: rgba(255, 255, 255, 0.6);
  gap: 1rem;
  text-align: center;
  
  svg {
    color: rgba(255, 255, 255, 0.3);
  }
  
  h3 {
    margin: 0;
    color: rgba(255, 255, 255, 0.8);
    font-weight: 600;
  }
  
  p {
    margin: 0;
    font-size: 0.9rem;
  }
`;

const MenuButton = styled.button`
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
    transform: scale(1.1);
  }
`;

// Mock data with more realistic information
const mockClients = [
  { 
    id: 1, 
    name: 'Sarah Johnson', 
    email: 'sarah.j@email.com', 
    status: 'active', 
    lastSession: '2 days ago',
    totalSessions: 24,
    joinDate: '2023-08-15'
  },
  { 
    id: 2, 
    name: 'Mike Chen', 
    email: 'mike.chen@email.com', 
    status: 'active', 
    lastSession: '1 day ago',
    totalSessions: 18,
    joinDate: '2023-09-01'
  },
  { 
    id: 3, 
    name: 'Emma Williams', 
    email: 'emma.w@email.com', 
    status: 'inactive', 
    lastSession: '1 week ago',
    totalSessions: 35,
    joinDate: '2023-06-10'
  },
  { 
    id: 4, 
    name: 'John Davis', 
    email: 'john.d@email.com', 
    status: 'pending', 
    lastSession: 'Never',
    totalSessions: 0,
    joinDate: '2024-01-05'
  },
];

const mockSessions = [
  { 
    id: 1, 
    time: '9:00 AM', 
    title: 'Upper Body Strength', 
    client: 'Sarah Johnson', 
    duration: '60 min',
    type: 'personal'
  },
  { 
    id: 2, 
    time: '10:30 AM', 
    title: 'HIIT Training', 
    client: 'Mike Chen', 
    duration: '45 min',
    type: 'group'
  },
  { 
    id: 3, 
    time: '2:00 PM', 
    title: 'Flexibility & Mobility', 
    client: 'Emma Williams', 
    duration: '60 min',
    type: 'personal'
  },
  { 
    id: 4, 
    time: '3:30 PM', 
    title: 'Full Body Workout', 
    client: 'John Davis', 
    duration: '75 min',
    type: 'personal'
  },
];

interface TrainerDashboardProps {}

const TrainerDashboard: React.FC<TrainerDashboardProps> = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Simulate data loading with better error handling
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Simulate potential error (uncomment to test error state)
        // if (Math.random() > 0.8) {
        //   throw new Error('Failed to load trainer data');
        // }
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  const filteredClients = mockClients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || client.status === filterStatus;
    return matchesSearch && matchesFilter;
  });
  
  const getInitials = (name: string): string => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };
  
  const handleRetry = () => {
    setError(null);
    setLoading(true);
    
    // Retry loading
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };
  
  // Error state
  if (error) {
    return (
      <DashboardContainer>
        <div style={{ 
          textAlign: 'center', 
          padding: '3rem',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '12px'
        }}>
          <h2 style={{ color: '#ff416c', marginBottom: '1rem' }}>Error Loading Dashboard</h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '1.5rem' }}>{error}</p>
          <ActionButton onClick={handleRetry}>
            Retry Loading
          </ActionButton>
        </div>
      </DashboardContainer>
    );
  }
  
  // Loading state
  if (loading) {
    return (
      <LoadingSpinner>
        Loading trainer dashboard...
      </LoadingSpinner>
    );
  }
  
  return (
    <DashboardContainer>
        <DashboardHeader>
          <HeaderContent>
            <HeaderTitle>Trainer Dashboard</HeaderTitle>
            <WelcomeMessage>
              Welcome back, {user?.firstName || 'Trainer'}! Here's an overview of your training activities.
            </WelcomeMessage>
            
            <StatsRow>
              <StatCard>
                <StatIcon color="#00ffff">
                  <Users size={24} />
                </StatIcon>
                <StatContent>
                  <StatValue>{mockClients.length}</StatValue>
                  <StatLabel>Total Clients</StatLabel>
                </StatContent>
              </StatCard>
              
              <StatCard>
                <StatIcon color="#7851a9">
                  <Calendar size={24} />
                </StatIcon>
                <StatContent>
                  <StatValue>{mockSessions.length}</StatValue>
                  <StatLabel>Today's Sessions</StatLabel>
                </StatContent>
              </StatCard>
              
              <StatCard>
                <StatIcon color="#10b981">
                  <TrendingUp size={24} />
                </StatIcon>
                <StatContent>
                  <StatValue>85%</StatValue>
                  <StatLabel>Client Retention</StatLabel>
                </StatContent>
              </StatCard>
              
              <StatCard>
              <StatIcon color="#f59e0b">
              <Target size={24} />
              </StatIcon>
              <StatContent>
              <StatValue>42</StatValue>
              <StatLabel>Goals Achieved</StatLabel>
              </StatContent>
              </StatCard>
            
            <StatCard>
              <StatIcon color="#ff416c">
                <Video size={24} />
              </StatIcon>
              <StatContent>
                <StatValue>3</StatValue>
                <StatLabel>Form Checks Pending</StatLabel>
              </StatContent>
            </StatCard>
            </StatsRow>
          </HeaderContent>
        </DashboardHeader>
        
        <GridContainer>
          <SectionContainer>
            <SectionHeader>
              <SectionTitle>My Clients</SectionTitle>
              <ActionButton>
                <Plus size={18} />
                Add Client
              </ActionButton>
            </SectionHeader>
            
            <SearchFilterContainer>
              <SearchInputContainer>
                <SearchIcon size={16} />
                <SearchInput
                  type="text"
                  placeholder="Search clients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </SearchInputContainer>
              
              <FilterButton onClick={() => setFilterStatus(filterStatus === 'all' ? 'active' : 'all')}>
                <Filter size={16} />
                {filterStatus === 'all' ? 'All' : 'Active'}
              </FilterButton>
            </SearchFilterContainer>
            
            {filteredClients.length > 0 ? (
              filteredClients.map(client => (
                <ClientCard key={client.id}>
                  <ClientAvatar>
                    {getInitials(client.name)}
                  </ClientAvatar>
                  <ClientInfo>
                    <ClientName>{client.name}</ClientName>
                    <ClientDetails>{client.email}</ClientDetails>
                    <ClientDetails>Last session: {client.lastSession}</ClientDetails>
                    <ClientDetails>Total sessions: {client.totalSessions}</ClientDetails>
                  </ClientInfo>
                  <ClientStatus status={client.status}>
                    {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                  </ClientStatus>
                  <MenuButton>
                    <MoreVertical size={16} />
                  </MenuButton>
                </ClientCard>
              ))
            ) : (
              <EmptyState>
                <User size={48} />
                <h3>No clients found</h3>
                <p>Try adjusting your search or filter criteria</p>
              </EmptyState>
            )}
          </SectionContainer>
          
          <SectionContainer>
            <SectionHeader>
              <SectionTitle>Content & Form Checks</SectionTitle>
              <ActionButton onClick={() => navigate('/trainer-dashboard/content')}>
                <Video size={18} />
                Manage Content
              </ActionButton>
            </SectionHeader>
            
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ 
                padding: '1rem', 
                background: 'rgba(0, 255, 255, 0.05)', 
                borderRadius: '8px',
                marginBottom: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div style={{ 
                    background: 'rgba(0, 255, 255, 0.1)', 
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '1rem'
                  }}>
                    <Video size={20} color="#00ffff" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>New Form Check System</div>
                    <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                      Review client videos with AI-assisted form analysis
                    </div>
                  </div>
                </div>
              </div>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '1rem',
                marginBottom: '1rem'
              }}>
                <div style={{ 
                  padding: '1rem', 
                  background: 'rgba(255, 65, 108, 0.05)', 
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <div style={{ marginRight: '1rem' }}>
                    <Clock size={24} color="#ff416c" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '1.25rem' }}>3</div>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                      Pending form checks
                    </div>
                  </div>
                </div>
                
                <div style={{ 
                  padding: '1rem', 
                  background: 'rgba(120, 81, 169, 0.05)', 
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <div style={{ marginRight: '1rem' }}>
                    <Upload size={24} color="#7851a9" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '1.25rem' }}>6</div>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                      Uploaded instruction videos
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </SectionContainer>
          
          <SectionContainer>
            <SectionHeader>
              <SectionTitle>Today's Schedule</SectionTitle>
              <ActionButton>
                <Plus size={18} />
                Add Session
              </ActionButton>
            </SectionHeader>
            
            {mockSessions.length > 0 ? (
              mockSessions.map(session => (
                <SessionCard key={session.id}>
                  <SessionTime>{session.time}</SessionTime>
                  <SessionInfo>
                    <div>
                      <SessionDetails>{session.title}</SessionDetails>
                      <SessionClient>with {session.client}</SessionClient>
                    </div>
                    <SessionDuration>
                      {session.duration}
                    </SessionDuration>
                  </SessionInfo>
                </SessionCard>
              ))
            ) : (
              <EmptyState>
                <Calendar size={48} />
                <h3>No sessions scheduled</h3>
                <p>Add your first session to get started</p>
              </EmptyState>
            )}
          </SectionContainer>
        </GridContainer>
    </DashboardContainer>
  );
};

export default TrainerDashboard;
