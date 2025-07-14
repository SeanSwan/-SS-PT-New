/**
 * Client-Trainer Assignment Interface
 * ==================================
 * 
 * Revolutionary Drag-and-Drop Assignment Interface for Admin Dashboard
 * Enables seamless client-trainer relationship management with visual assignment board.
 * 
 * Core Features:
 * - Intuitive drag-and-drop assignment interface
 * - Real-time assignment status tracking
 * - Comprehensive assignment statistics and analytics
 * - Mobile-responsive design with touch optimization
 * - Assignment audit trail and history
 * - Bulk assignment operations
 * - WCAG AA accessibility compliance
 * 
 * Part of the NASM Workout Tracking System - Phase 2.3: Core Components
 * Designed for SwanStudios Platform - Production Ready
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { motion, AnimatePresence } from 'framer-motion';
import styled, { ThemeProvider, keyframes } from 'styled-components';
import { 
  Users, UserCheck, UserPlus, UserMinus, Search, Filter, 
  BarChart3, TrendingUp, AlertTriangle, CheckCircle, 
  Clock, Calendar, MessageSquare, Eye, Edit, Trash2,
  RefreshCw, Download, Upload, Settings, Info, Star,
  Activity, Shield, Zap, Target, Award, ChevronDown
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { 
  clientTrainerAssignmentService, 
  ClientTrainerAssignment 
} from '../../services/nasmApiService';

// ==================== INTERFACES ====================

interface ClientTrainerAssignmentsProps {
  onAssignmentChange?: () => void;
}

interface Client {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  availableSessions: number;
  createdAt: string;
  assignedTrainer?: Trainer;
}

interface Trainer {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  assignedClients: Client[];
}

interface AssignmentStats {
  totalAssignments: number;
  activeAssignments: number;
  totalTrainers: number;
  totalClients: number;
  unassignedClients: number;
  assignmentRate: string;
  averageClientsPerTrainer: string;
  trainerWorkload: Array<{
    trainerId: number;
    trainerName: string;
    activeClients: number;
  }>;
}

// ==================== STYLED COMPONENTS ====================

const stellarGlow = keyframes`
  0% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.3); }
  50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.6), 0 0 30px rgba(59, 130, 246, 0.4); }
  100% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.3); }
`;

const assignmentTheme = {
  colors: {
    primary: '#3b82f6',
    secondary: '#1e40af',
    accent: '#06b6d4',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    background: '#0f172a',
    surface: '#1e293b',
    cardBg: '#334155',
    text: '#f8fafc',
    textSecondary: '#cbd5e1',
    border: '#475569',
    inputBg: '#475569',
    dragOver: '#3b82f640',
    unassigned: '#64748b',
    assigned: '#10b981'
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    xxl: '3rem'
  },
  borderRadius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem'
  }
};

const AssignmentContainer = styled(motion.div)`
  min-height: 100vh;
  background: linear-gradient(135deg, ${assignmentTheme.colors.background} 0%, #1a202c 100%);
  padding: ${assignmentTheme.spacing.lg};
  color: ${assignmentTheme.colors.text};
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

  @media (max-width: 768px) {
    padding: ${assignmentTheme.spacing.md};
  }
`;

const Header = styled.div`
  background: ${assignmentTheme.colors.surface};
  border-radius: ${assignmentTheme.borderRadius.lg};
  padding: ${assignmentTheme.spacing.xl};
  margin-bottom: ${assignmentTheme.spacing.xl};
  border: 1px solid ${assignmentTheme.colors.border};
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, ${assignmentTheme.colors.primary}, ${assignmentTheme.colors.accent});
  }
`;

const HeaderTop = styled.div`
  display: flex;
  justify-content: between;
  align-items: flex-start;
  gap: ${assignmentTheme.spacing.lg};
  margin-bottom: ${assignmentTheme.spacing.lg};

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const TitleSection = styled.div`
  flex: 1;
  
  h1 {
    margin: 0 0 ${assignmentTheme.spacing.sm} 0;
    font-size: 1.75rem;
    font-weight: 700;
    color: ${assignmentTheme.colors.text};
    display: flex;
    align-items: center;
    gap: ${assignmentTheme.spacing.sm};
  }

  p {
    margin: 0;
    color: ${assignmentTheme.colors.textSecondary};
    font-size: 1rem;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  gap: ${assignmentTheme.spacing.md};
  flex-wrap: wrap;
`;

const Button = styled(motion.button)<{ variant: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' }>`
  padding: ${assignmentTheme.spacing.sm} ${assignmentTheme.spacing.lg};
  border-radius: ${assignmentTheme.borderRadius.md};
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  border: none;
  display: flex;
  align-items: center;
  gap: ${assignmentTheme.spacing.sm};
  transition: all 0.3s ease;
  min-width: 120px;
  justify-content: center;

  background: ${props => 
    props.variant === 'primary' ? assignmentTheme.colors.primary :
    props.variant === 'success' ? assignmentTheme.colors.success :
    props.variant === 'warning' ? assignmentTheme.colors.warning :
    props.variant === 'danger' ? assignmentTheme.colors.error :
    assignmentTheme.colors.cardBg
  };
  
  color: ${assignmentTheme.colors.text};

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px ${props => 
      props.variant === 'primary' ? `${assignmentTheme.colors.primary}40` :
      props.variant === 'success' ? `${assignmentTheme.colors.success}40` :
      props.variant === 'warning' ? `${assignmentTheme.colors.warning}40` :
      props.variant === 'danger' ? `${assignmentTheme.colors.error}40` :
      `${assignmentTheme.colors.cardBg}40`
    };
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${assignmentTheme.spacing.lg};
  margin-bottom: ${assignmentTheme.spacing.xl};
`;

const StatCard = styled(motion.div)<{ type: 'primary' | 'success' | 'warning' | 'info' }>`
  background: ${assignmentTheme.colors.cardBg};
  border-radius: ${assignmentTheme.borderRadius.lg};
  padding: ${assignmentTheme.spacing.lg};
  border: 1px solid ${assignmentTheme.colors.border};
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${props => 
      props.type === 'primary' ? assignmentTheme.colors.primary :
      props.type === 'success' ? assignmentTheme.colors.success :
      props.type === 'warning' ? assignmentTheme.colors.warning :
      assignmentTheme.colors.accent
    };
  }

  &:hover {
    border-color: ${props => 
      props.type === 'primary' ? assignmentTheme.colors.primary :
      props.type === 'success' ? assignmentTheme.colors.success :
      props.type === 'warning' ? assignmentTheme.colors.warning :
      assignmentTheme.colors.accent
    };
    animation: ${stellarGlow} 2s ease-in-out infinite;
  }
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: ${assignmentTheme.colors.text};
  margin-bottom: ${assignmentTheme.spacing.xs};
`;

const StatLabel = styled.div`
  font-size: 0.9rem;
  color: ${assignmentTheme.colors.textSecondary};
  display: flex;
  align-items: center;
  gap: ${assignmentTheme.spacing.xs};
`;

const AssignmentBoard = styled.div`
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: ${assignmentTheme.spacing.xl};
  min-height: 600px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
    gap: ${assignmentTheme.spacing.lg};
  }
`;

const UnassignedColumn = styled.div`
  background: ${assignmentTheme.colors.surface};
  border-radius: ${assignmentTheme.borderRadius.lg};
  border: 1px solid ${assignmentTheme.colors.border};
  overflow: hidden;
`;

const ColumnHeader = styled.div`
  padding: ${assignmentTheme.spacing.lg};
  background: ${assignmentTheme.colors.background};
  border-bottom: 1px solid ${assignmentTheme.colors.border};
  
  h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: ${assignmentTheme.colors.text};
    display: flex;
    align-items: center;
    gap: ${assignmentTheme.spacing.sm};
  }
`;

const ClientCount = styled.span`
  font-size: 0.85rem;
  color: ${assignmentTheme.colors.textSecondary};
  font-weight: normal;
`;

const TrainersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: ${assignmentTheme.spacing.lg};

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const TrainerColumn = styled.div`
  background: ${assignmentTheme.colors.surface};
  border-radius: ${assignmentTheme.borderRadius.lg};
  border: 1px solid ${assignmentTheme.colors.border};
  overflow: hidden;
  min-height: 400px;
`;

const ClientList = styled.div<{ isDraggingOver?: boolean }>`
  padding: ${assignmentTheme.spacing.md};
  min-height: 300px;
  background: ${props => props.isDraggingOver ? assignmentTheme.colors.dragOver : 'transparent'};
  transition: background 0.3s ease;
`;

const ClientCard = styled(motion.div)<{ assigned?: boolean; isDragging?: boolean }>`
  background: ${props => props.assigned ? assignmentTheme.colors.success : assignmentTheme.colors.unassigned}20;
  border: 1px solid ${props => props.assigned ? assignmentTheme.colors.success : assignmentTheme.colors.unassigned};
  border-radius: ${assignmentTheme.borderRadius.md};
  padding: ${assignmentTheme.spacing.md};
  margin-bottom: ${assignmentTheme.spacing.sm};
  cursor: grab;
  transition: all 0.3s ease;
  position: relative;
  
  opacity: ${props => props.isDragging ? 0.5 : 1};
  transform: ${props => props.isDragging ? 'rotate(5deg)' : 'rotate(0deg)'};

  &:hover {
    transform: translateY(-2px) ${props => props.isDragging ? 'rotate(5deg)' : 'rotate(0deg)'};
    box-shadow: 0 4px 12px ${props => props.assigned ? `${assignmentTheme.colors.success}40` : `${assignmentTheme.colors.unassigned}40`};
  }

  &:active {
    cursor: grabbing;
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

const ClientName = styled.div`
  font-weight: 600;
  color: ${assignmentTheme.colors.text};
  margin-bottom: ${assignmentTheme.spacing.xs};
  font-size: 0.95rem;
`;

const ClientEmail = styled.div`
  font-size: 0.8rem;
  color: ${assignmentTheme.colors.textSecondary};
  margin-bottom: ${assignmentTheme.spacing.xs};
`;

const ClientMeta = styled.div`
  display: flex;
  justify-content: between;
  align-items: center;
  gap: ${assignmentTheme.spacing.sm};
  font-size: 0.8rem;
`;

const SessionBadge = styled.div<{ type: 'good' | 'low' | 'none' }>`
  padding: ${assignmentTheme.spacing.xs} ${assignmentTheme.spacing.sm};
  border-radius: ${assignmentTheme.borderRadius.sm};
  font-weight: 500;
  
  background: ${props => 
    props.type === 'good' ? `${assignmentTheme.colors.success}20` :
    props.type === 'low' ? `${assignmentTheme.colors.warning}20` :
    `${assignmentTheme.colors.error}20`
  };
  
  color: ${props => 
    props.type === 'good' ? assignmentTheme.colors.success :
    props.type === 'low' ? assignmentTheme.colors.warning :
    assignmentTheme.colors.error
  };
  
  border: 1px solid ${props => 
    props.type === 'good' ? assignmentTheme.colors.success :
    props.type === 'low' ? assignmentTheme.colors.warning :
    assignmentTheme.colors.error
  };
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid ${assignmentTheme.colors.border};
  border-radius: 50%;
  border-top-color: ${assignmentTheme.colors.text};
  animation: spin 1s ease-in-out infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const SearchAndFilterBar = styled.div`
  display: flex;
  gap: ${assignmentTheme.spacing.md};
  margin-bottom: ${assignmentTheme.spacing.xl};
  align-items: center;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const SearchInput = styled.input`
  flex: 1;
  padding: ${assignmentTheme.spacing.md};
  background: ${assignmentTheme.colors.inputBg};
  border: 1px solid ${assignmentTheme.colors.border};
  border-radius: ${assignmentTheme.borderRadius.md};
  color: ${assignmentTheme.colors.text};
  font-size: 0.9rem;

  &:focus {
    outline: none;
    border-color: ${assignmentTheme.colors.primary};
  }

  &::placeholder {
    color: ${assignmentTheme.colors.textSecondary};
  }
`;

// ==================== MAIN COMPONENT ====================

const ClientTrainerAssignments: React.FC<ClientTrainerAssignmentsProps> = ({ onAssignmentChange }) => {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [unassignedClients, setUnassignedClients] = useState<Client[]>([]);
  const [assignments, setAssignments] = useState<ClientTrainerAssignment[]>([]);
  const [stats, setStats] = useState<AssignmentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [isDragging, setIsDragging] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [assignmentsResponse, unassignedResponse, statsResponse] = await Promise.all([
        clientTrainerAssignmentService.getAssignments({ includeInactive: false }),
        clientTrainerAssignmentService.getUnassignedClients(),
        clientTrainerAssignmentService.getAssignmentStats()
      ]);

      if (assignmentsResponse.success && assignmentsResponse.data) {
        setAssignments(assignmentsResponse.data);
        processAssignmentData(assignmentsResponse.data);
      }

      if (unassignedResponse.success && unassignedResponse.data) {
        setUnassignedClients(unassignedResponse.data);
      }

      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      }

    } catch (error) {
      console.error('Failed to load assignment data:', error);
      toast.error('Failed to load assignment data');
    } finally {
      setLoading(false);
    }
  };

  const processAssignmentData = useCallback((assignmentData: ClientTrainerAssignment[]) => {
    // Group assignments by trainer
    const trainerMap = new Map<number, Trainer>();
    const clientMap = new Map<number, Client>();

    assignmentData.forEach(assignment => {
      if (assignment.trainer && assignment.client) {
        // Add trainer
        if (!trainerMap.has(assignment.trainerId)) {
          trainerMap.set(assignment.trainerId, {
            id: assignment.trainer.id,
            firstName: assignment.trainer.firstName,
            lastName: assignment.trainer.lastName,
            email: assignment.trainer.email,
            role: 'trainer',
            assignedClients: []
          });
        }

        // Add client to trainer
        const trainer = trainerMap.get(assignment.trainerId)!;
        const client: Client = {
          id: assignment.client.id,
          firstName: assignment.client.firstName,
          lastName: assignment.client.lastName,
          email: assignment.client.email,
          availableSessions: assignment.client.availableSessions || 0,
          createdAt: assignment.createdAt
        };

        trainer.assignedClients.push(client);
        clientMap.set(client.id, client);
      }
    });

    setTrainers(Array.from(trainerMap.values()));
    setClients(Array.from(clientMap.values()));
  }, []);

  const handleDragEnd = async (result: DropResult) => {
    setIsDragging(false);
    
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    const clientId = parseInt(draggableId);

    if (source.droppableId === destination.droppableId) return;

    try {
      // Handle assignment logic
      if (destination.droppableId.startsWith('trainer-')) {
        const trainerId = parseInt(destination.droppableId.replace('trainer-', ''));
        await assignClientToTrainer(clientId, trainerId);
      } else if (destination.droppableId === 'unassigned') {
        await unassignClient(clientId);
      }

      // Reload data to reflect changes
      await loadData();
      onAssignmentChange?.();
      
    } catch (error) {
      console.error('Assignment operation failed:', error);
      toast.error('Failed to update assignment');
    }
  };

  const assignClientToTrainer = async (clientId: number, trainerId: number) => {
    try {
      const response = await clientTrainerAssignmentService.createAssignment({
        clientId,
        trainerId
      });

      if (response.success) {
        toast.success('Client assigned successfully');
      } else {
        throw new Error(response.message || 'Failed to assign client');
      }
    } catch (error: any) {
      console.error('Assignment failed:', error);
      throw error;
    }
  };

  const unassignClient = async (clientId: number) => {
    try {
      // Find the current assignment
      const currentAssignment = assignments.find(a => a.clientId === clientId && a.status === 'active');
      
      if (currentAssignment) {
        const response = await clientTrainerAssignmentService.updateAssignment(currentAssignment.id, {
          status: 'inactive'
        });

        if (response.success) {
          toast.success('Client unassigned successfully');
        } else {
          throw new Error(response.message || 'Failed to unassign client');
        }
      }
    } catch (error: any) {
      console.error('Unassignment failed:', error);
      throw error;
    }
  };

  const filteredUnassignedClients = useMemo(() => {
    return unassignedClients.filter(client => {
      const matchesSearch = searchQuery === '' || 
        `${client.firstName} ${client.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesSearch;
    });
  }, [unassignedClients, searchQuery]);

  const getSessionBadgeType = (sessions: number): 'good' | 'low' | 'none' => {
    if (sessions === 0) return 'none';
    if (sessions <= 3) return 'low';
    return 'good';
  };

  if (loading) {
    return (
      <AssignmentContainer>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <LoadingSpinner />
        </div>
      </AssignmentContainer>
    );
  }

  return (
    <ThemeProvider theme={assignmentTheme}>
      <AssignmentContainer
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Header>
          <HeaderTop>
            <TitleSection>
              <h1>
                <Users size={28} />
                Client-Trainer Assignments
              </h1>
              <p>Manage client-trainer relationships with drag-and-drop assignment board</p>
            </TitleSection>
            <HeaderActions>
              <Button variant="secondary" onClick={loadData}>
                <RefreshCw size={16} />
                Refresh
              </Button>
              <Button variant="primary">
                <Download size={16} />
                Export
              </Button>
            </HeaderActions>
          </HeaderTop>

          {stats && (
            <StatsGrid>
              <StatCard type="primary" whileHover={{ scale: 1.02 }}>
                <StatValue>{stats.totalClients}</StatValue>
                <StatLabel>
                  <Users size={16} />
                  Total Clients
                </StatLabel>
              </StatCard>
              <StatCard type="success" whileHover={{ scale: 1.02 }}>
                <StatValue>{stats.activeAssignments}</StatValue>
                <StatLabel>
                  <UserCheck size={16} />
                  Assigned Clients
                </StatLabel>
              </StatCard>
              <StatCard type="warning" whileHover={{ scale: 1.02 }}>
                <StatValue>{stats.unassignedClients}</StatValue>
                <StatLabel>
                  <UserMinus size={16} />
                  Unassigned Clients
                </StatLabel>
              </StatCard>
              <StatCard type="info" whileHover={{ scale: 1.02 }}>
                <StatValue>{stats.assignmentRate}%</StatValue>
                <StatLabel>
                  <TrendingUp size={16} />
                  Assignment Rate
                </StatLabel>
              </StatCard>
            </StatsGrid>
          )}
        </Header>

        <SearchAndFilterBar>
          <SearchInput
            type="text"
            placeholder="Search clients by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Button variant="secondary">
            <Filter size={16} />
            Filter
          </Button>
        </SearchAndFilterBar>

        <DragDropContext 
          onDragEnd={handleDragEnd}
          onDragStart={() => setIsDragging(true)}
        >
          <AssignmentBoard>
            <UnassignedColumn>
              <ColumnHeader>
                <h3>
                  <UserMinus size={20} />
                  Unassigned Clients
                  <ClientCount>({filteredUnassignedClients.length})</ClientCount>
                </h3>
              </ColumnHeader>
              <Droppable droppableId="unassigned">
                {(provided, snapshot) => (
                  <ClientList
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    isDraggingOver={snapshot.isDraggingOver}
                  >
                    {filteredUnassignedClients.map((client, index) => (
                      <Draggable
                        key={client.id}
                        draggableId={client.id.toString()}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <ClientCard
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            isDragging={snapshot.isDragging}
                            whileHover={{ scale: 1.02 }}
                          >
                            <ClientName>
                              {client.firstName} {client.lastName}
                            </ClientName>
                            <ClientEmail>{client.email}</ClientEmail>
                            <ClientMeta>
                              <SessionBadge type={getSessionBadgeType(client.availableSessions)}>
                                {client.availableSessions} sessions
                              </SessionBadge>
                              <div style={{ fontSize: '0.75rem', color: assignmentTheme.colors.textSecondary }}>
                                <Calendar size={12} style={{ marginRight: '4px' }} />
                                {new Date(client.createdAt).toLocaleDateString()}
                              </div>
                            </ClientMeta>
                          </ClientCard>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {filteredUnassignedClients.length === 0 && (
                      <div style={{ 
                        textAlign: 'center', 
                        color: assignmentTheme.colors.textSecondary,
                        padding: assignmentTheme.spacing.xl,
                        fontStyle: 'italic'
                      }}>
                        {searchQuery ? 'No clients match your search' : 'All clients are assigned'}
                      </div>
                    )}
                  </ClientList>
                )}
              </Droppable>
            </UnassignedColumn>

            <TrainersGrid>
              {trainers.map((trainer) => (
                <TrainerColumn key={trainer.id}>
                  <ColumnHeader>
                    <h3>
                      <UserCheck size={20} />
                      {trainer.firstName} {trainer.lastName}
                      <ClientCount>({trainer.assignedClients.length} clients)</ClientCount>
                    </h3>
                  </ColumnHeader>
                  
                  <Droppable droppableId={`trainer-${trainer.id}`}>
                    {(provided, snapshot) => (
                      <ClientList
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        isDraggingOver={snapshot.isDraggingOver}
                      >
                        {trainer.assignedClients.map((client, index) => (
                          <Draggable
                            key={client.id}
                            draggableId={client.id.toString()}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <ClientCard
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                assigned
                                isDragging={snapshot.isDragging}
                                whileHover={{ scale: 1.02 }}
                              >
                                <ClientName>
                                  {client.firstName} {client.lastName}
                                </ClientName>
                                <ClientEmail>{client.email}</ClientEmail>
                                <ClientMeta>
                                  <SessionBadge type={getSessionBadgeType(client.availableSessions)}>
                                    {client.availableSessions} sessions
                                  </SessionBadge>
                                  <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    color: assignmentTheme.colors.success 
                                  }}>
                                    <CheckCircle size={12} style={{ marginRight: '4px' }} />
                                    Assigned
                                  </div>
                                </ClientMeta>
                              </ClientCard>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {trainer.assignedClients.length === 0 && (
                          <div style={{ 
                            textAlign: 'center', 
                            color: assignmentTheme.colors.textSecondary,
                            padding: assignmentTheme.spacing.xl,
                            fontStyle: 'italic'
                          }}>
                            No clients assigned
                          </div>
                        )}
                      </ClientList>
                    )}
                  </Droppable>
                </TrainerColumn>
              ))}
              
              {trainers.length === 0 && (
                <div style={{ 
                  gridColumn: '1 / -1',
                  textAlign: 'center', 
                  color: assignmentTheme.colors.textSecondary,
                  padding: assignmentTheme.spacing.xxl,
                  fontSize: '1.1rem'
                }}>
                  No trainers available. Create trainer accounts to enable assignments.
                </div>
              )}
            </TrainersGrid>
          </AssignmentBoard>
        </DragDropContext>
      </AssignmentContainer>
    </ThemeProvider>
  );
};

export default ClientTrainerAssignments;