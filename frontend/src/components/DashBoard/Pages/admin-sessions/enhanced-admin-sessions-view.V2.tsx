/**
 * Enhanced Admin Sessions View V2 - GOLDEN STANDARD
 * ==================================================
 * Perfect example of using UI Kit compound components + useTable hook
 * 
 * Features:
 * ✅ Table compound component
 * ✅ Pagination compound component
 * ✅ Badge component for status
 * ✅ EmptyState component
 * ✅ useTable hook for table logic
 * ✅ Container components from ui-kit
 * ✅ Zero local styled components (except page-specific)
 * ✅ Zero MUI dependencies
 * 
 * This file serves as the template for all other V2 files.
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../hooks/use-toast.tsx';
import { useTable } from '../../../../hooks/useTable.ts';
import GlowButton from '../../../ui/buttons/GlowButton';

// Import icons
import {
  Search,
  Calendar,
  Clock,
  User,
  Plus,
  Download,
  Eye,
  Edit,
  CheckCircle,
  RefreshCw,
  Zap,
  TableIcon,
  CalendarDays,
  Filter,
  Inbox
} from 'lucide-react';

// Import UI Kit Components
import { PageTitle, SectionTitle, BodyText, SmallText, Caption } from '../../../ui-kit/Typography';
import { PrimaryButton, OutlinedButton, SecondaryButton } from '../../../ui-kit/Button';
import { Card, CardHeader, CardBody, GridContainer, FlexBox } from '../../../ui-kit/Card';
import { StyledInput } from '../../../ui-kit/Input';
import Table from '../../../ui-kit/Table';
import Pagination from '../../../ui-kit/Pagination';
import Badge, { getStatusVariant } from '../../../ui-kit/Badge';
import EmptyState, { LoadingState } from '../../../ui-kit/EmptyState';
import { 
  PageContainer, 
  ContentContainer, 
  StatsGridContainer 
} from '../../../ui-kit/Container';

// Import Schedule Components
import ScheduleErrorBoundary from '../../../Schedule/ScheduleErrorBoundary';
import ScheduleInitializer from '../../../Schedule/ScheduleInitializer';
import UnifiedCalendar from '../../../Schedule/schedule';

// ==========================================
// PAGE-SPECIFIC STYLED COMPONENTS
// ==========================================

// Stats Card
const StatsCard = styled(Card)`
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(14, 165, 233, 0.05));
  border-color: rgba(59, 130, 246, 0.3);
`;

const StatIconContainer = styled.div<{ variant: 'primary' | 'success' | 'info' | 'warning' }>`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.75rem;
  background: ${props => {
    switch(props.variant) {
      case 'success': return 'rgba(16, 185, 129, 0.2)';
      case 'info': return 'rgba(14, 165, 233, 0.2)';
      case 'warning': return 'rgba(245, 158, 11, 0.2)';
      default: return 'rgba(59, 130, 246, 0.2)';
    }
  }};
  
  svg {
    color: ${props => {
      switch(props.variant) {
        case 'success': return '#34d399';
        case 'info': return '#38bdf8';
        case 'warning': return '#fbbf24';
        default: return '#60a5fa';
      }
    }};
  }
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 0.5rem;
`;

const StatLabel = styled.div`
  font-size: 0.875rem;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

// Avatar
const Avatar = styled.div<{ src?: string }>`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${props => props.src ? `url(${props.src})` : 'linear-gradient(135deg, #3b82f6, #8b5cf6)'};
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-weight: 600;
  font-size: 0.75rem;
  flex-shrink: 0;
`;

// Filter Container
const FilterContainer = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
`;

const SearchContainer = styled.div`
  position: relative;
  flex: 1;
  min-width: 300px;
  
  svg {
    position: absolute;
    left: 1rem;
    top: 50%;
    transform: translateY(-50%);
    color: rgba(255, 255, 255, 0.5);
  }
  
  input {
    padding-left: 2.75rem;
  }
`;

const FilterButton = styled.button<{ isActive: boolean }>`
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  border: 1px solid ${props => props.isActive ? '#3b82f6' : 'rgba(255, 255, 255, 0.2)'};
  background: ${props => props.isActive ? 'rgba(59, 130, 246, 0.2)' : 'transparent'};
  color: ${props => props.isActive ? '#60a5fa' : '#e2e8f0'};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: #3b82f6;
    background: rgba(59, 130, 246, 0.1);
  }
`;

// View Toggle
const ViewToggle = styled.div`
  display: flex;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 0.25rem;
`;

const ViewButton = styled.button<{ isActive: boolean }>`
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  background: ${props => props.isActive ? 'rgba(59, 130, 246, 0.3)' : 'transparent'};
  color: ${props => props.isActive ? '#ffffff' : '#94a3b8'};
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &:hover {
    background: rgba(59, 130, 246, 0.2);
    color: #ffffff;
  }
`;

// ==========================================
// TYPES
// ==========================================

interface Session {
  id: string;
  sessionDate: string;
  duration: number;
  userId: string | null;
  trainerId: string | null;
  location?: string;
  status: 'available' | 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  client?: {
    firstName: string;
    lastName: string;
    photo?: string;
  };
  trainer?: {
    firstName: string;
    lastName: string;
    photo?: string;
  };
}

// ==========================================
// COMPONENT
// ==========================================

const EnhancedAdminSessionsView: React.FC = () => {
  const { authAxios } = useAuth();
  const { toast } = useToast();

  // State
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('calendar');

  // Stats
  const [statsData, setStatsData] = useState({
    todaySessions: 0,
    completedHours: 0,
    activeTrainers: 0,
    completionRate: 0
  });

  // Table hook with filtering and pagination
  const {
    paginatedData,
    currentPage,
    totalPages,
    rowsPerPage,
    hasNextPage,
    hasPrevPage,
    totalItems,
    searchTerm,
    handlePageChange,
    handleRowsPerPageChange,
    handleSearch,
    handleSort,
    sortBy,
    sortOrder,
    goToNextPage,
    goToPrevPage
  } = useTable<Session>({
    data: sessions,
    initialRowsPerPage: 10,
    searchFields: ['client.firstName', 'client.lastName', 'trainer.firstName', 'trainer.lastName'],
    customFilter: (session) => {
      // Filter by status
      if (statusFilter === 'all') return true;
      return session.status === statusFilter;
    }
  });

  // Fetch sessions on mount
  useEffect(() => {
    fetchSessions();
  }, []);

  // Fetch sessions from API
  const fetchSessions = async () => {
    setLoading(true);
    try {
      const response = await authAxios.get('/api/sessions');
      if (response.data && Array.isArray(response.data)) {
        setSessions(response.data);
        calculateStats(response.data);
        toast({ title: 'Success', description: 'Sessions loaded successfully' });
      }
    } catch (err: any) {
      console.error('Error fetching sessions:', err);
      toast({ 
        title: 'Error', 
        description: 'Failed to load sessions', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate stats from sessions
  const calculateStats = (sessionsData: Session[]) => {
    const today = new Date().toLocaleDateString();
    const todayCount = sessionsData.filter(s => 
      new Date(s.sessionDate).toLocaleDateString() === today
    ).length;

    const completed = sessionsData.filter(s => s.status === 'completed');
    const hours = completed.reduce((total, s) => total + (s.duration / 60), 0);

    const trainers = new Set(sessionsData.filter(s => s.trainerId).map(s => s.trainerId));

    const relevantSessions = sessionsData.filter(s => 
      ['scheduled', 'confirmed', 'completed'].includes(s.status)
    );
    const rate = relevantSessions.length > 0 
      ? Math.round((completed.length / relevantSessions.length) * 100)
      : 0;

    setStatsData({
      todaySessions: todayCount,
      completedHours: Math.round(hours * 10) / 10,
      activeTrainers: trainers.size,
      completionRate: rate
    });
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  // Format time
  const formatTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return 'N/A';
    }
  };

  // Handle status filter change
  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
  };

  return (
    <PageContainer>
      <ContentContainer maxWidth="1600px">
        {/* Header */}
        <Card style={{ marginBottom: '2rem' }}>
          <CardHeader>
            <FlexBox justify="space-between" align="center">
              <div>
                <PageTitle style={{ marginBottom: '0.5rem' }}>
                  <FlexBox align="center" gap="0.75rem">
                    <Calendar size={28} />
                    Training Sessions Management
                  </FlexBox>
                </PageTitle>
              </div>
              <FlexBox gap="0.75rem">
                <GlowButton
                  text="Add Sessions"
                  theme="emerald"
                  size="small"
                  leftIcon={<Zap size={16} />}
                  onClick={() => toast({ title: 'Info', description: 'Feature pending' })}
                />
                <GlowButton
                  text="Refresh"
                  theme="purple"
                  size="small"
                  leftIcon={<RefreshCw size={16} />}
                  onClick={fetchSessions}
                  isLoading={loading}
                />
              </FlexBox>
            </FlexBox>
          </CardHeader>
        </Card>

        {/* Stats Grid */}
        <StatsGridContainer style={{ marginBottom: '2rem' }}>
          <StatsCard>
            <CardBody>
              <StatIconContainer variant="primary">
                <Calendar size={24} />
              </StatIconContainer>
              <StatValue>{loading ? '-' : statsData.todaySessions}</StatValue>
              <StatLabel>Sessions Today</StatLabel>
            </CardBody>
          </StatsCard>
          <StatsCard>
            <CardBody>
              <StatIconContainer variant="success">
                <Clock size={24} />
              </StatIconContainer>
              <StatValue>{loading ? '-' : statsData.completedHours}</StatValue>
              <StatLabel>Hours Completed</StatLabel>
            </CardBody>
          </StatsCard>
          <StatsCard>
            <CardBody>
              <StatIconContainer variant="info">
                <User size={24} />
              </StatIconContainer>
              <StatValue>{loading ? '-' : statsData.activeTrainers}</StatValue>
              <StatLabel>Active Trainers</StatLabel>
            </CardBody>
          </StatsCard>
          <StatsCard>
            <CardBody>
              <StatIconContainer variant="warning">
                <CheckCircle size={24} />
              </StatIconContainer>
              <StatValue>{loading ? '-' : `${statsData.completionRate}%`}</StatValue>
              <StatLabel>Completion Rate</StatLabel>
            </CardBody>
          </StatsCard>
        </StatsGridContainer>

        {/* Filters & View Toggle */}
        <Card style={{ marginBottom: '1.5rem' }}>
          <CardBody>
            <FlexBox justify="space-between" align="center">
              <FilterContainer>
                <SearchContainer>
                  <Search size={18} />
                  <StyledInput
                    placeholder="Search sessions..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                </SearchContainer>
                <FilterButton 
                  isActive={statusFilter === 'all'} 
                  onClick={() => handleStatusFilterChange('all')}
                >
                  All
                </FilterButton>
                <FilterButton 
                  isActive={statusFilter === 'available'} 
                  onClick={() => handleStatusFilterChange('available')}
                >
                  Available
                </FilterButton>
                <FilterButton 
                  isActive={statusFilter === 'scheduled'} 
                  onClick={() => handleStatusFilterChange('scheduled')}
                >
                  Scheduled
                </FilterButton>
                <FilterButton 
                  isActive={statusFilter === 'completed'} 
                  onClick={() => handleStatusFilterChange('completed')}
                >
                  Completed
                </FilterButton>
              </FilterContainer>
              
              <ViewToggle>
                <ViewButton 
                  isActive={viewMode === 'calendar'} 
                  onClick={() => setViewMode('calendar')}
                >
                  <CalendarDays size={16} />
                  Calendar
                </ViewButton>
                <ViewButton 
                  isActive={viewMode === 'table'} 
                  onClick={() => setViewMode('table')}
                >
                  <TableIcon size={16} />
                  Table
                </ViewButton>
              </ViewToggle>
            </FlexBox>
          </CardBody>
        </Card>

        {/* Calendar View */}
        {viewMode === 'calendar' && (
          <Card>
            <CardBody>
              <ScheduleErrorBoundary>
                <ScheduleInitializer>
                  <UnifiedCalendar />
                </ScheduleInitializer>
              </ScheduleErrorBoundary>
            </CardBody>
          </Card>
        )}

        {/* Table View - GOLDEN STANDARD IMPLEMENTATION */}
        {viewMode === 'table' && (
          <Card>
            <CardBody padding="0">
              {loading ? (
                <LoadingState message="Loading sessions..." />
              ) : paginatedData.length > 0 ? (
                <>
                  <Table variant="default">
                    <Table.Header>
                      <Table.Row>
                        <Table.Head>Client</Table.Head>
                        <Table.Head>Trainer</Table.Head>
                        <Table.Head>Date & Time</Table.Head>
                        <Table.Head>Location</Table.Head>
                        <Table.Head>Duration</Table.Head>
                        <Table.Head>Status</Table.Head>
                        <Table.Head align="right">Actions</Table.Head>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {paginatedData.map((session) => (
                        <Table.Row key={session.id}>
                          <Table.Cell>
                            {session.client ? (
                              <FlexBox align="center" gap="0.75rem">
                                <Avatar>
                                  {session.client.firstName[0]}{session.client.lastName[0]}
                                </Avatar>
                                <div>
                                  <SmallText style={{ fontWeight: 600 }}>
                                    {session.client.firstName} {session.client.lastName}
                                  </SmallText>
                                </div>
                              </FlexBox>
                            ) : (
                              <SmallText style={{ color: '#94a3b8' }}>Available Slot</SmallText>
                            )}
                          </Table.Cell>
                          <Table.Cell>
                            {session.trainer ? (
                              <FlexBox align="center" gap="0.75rem">
                                <Avatar>
                                  {session.trainer.firstName[0]}{session.trainer.lastName[0]}
                                </Avatar>
                                <SmallText>
                                  {session.trainer.firstName} {session.trainer.lastName}
                                </SmallText>
                              </FlexBox>
                            ) : (
                              <SmallText style={{ color: '#94a3b8' }}>Unassigned</SmallText>
                            )}
                          </Table.Cell>
                          <Table.Cell>
                            <BodyText style={{ marginBottom: '0.25rem' }}>
                              {formatDate(session.sessionDate)}
                            </BodyText>
                            <Caption style={{ color: '#94a3b8' }}>
                              {formatTime(session.sessionDate)}
                            </Caption>
                          </Table.Cell>
                          <Table.Cell>{session.location || 'N/A'}</Table.Cell>
                          <Table.Cell>{session.duration} min</Table.Cell>
                          <Table.Cell>
                            <Badge variant={getStatusVariant(session.status)}>
                              {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell align="right">
                            <FlexBox gap="0.5rem" justify="end">
                              <OutlinedButton 
                                onClick={() => toast({ title: 'Info', description: 'View feature pending' })}
                              >
                                <Eye size={16} />
                              </OutlinedButton>
                              <SecondaryButton 
                                onClick={() => toast({ title: 'Info', description: 'Edit feature pending' })}
                              >
                                <Edit size={16} />
                              </SecondaryButton>
                            </FlexBox>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table>

                  {/* Pagination - GOLDEN STANDARD IMPLEMENTATION */}
                  <div style={{ padding: '1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <FlexBox justify="space-between" align="center">
                      <SmallText style={{ color: '#94a3b8' }}>
                        Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, totalItems)} of {totalItems} sessions
                      </SmallText>
                      
                      <Pagination>
                        <Pagination.PrevButton 
                          onClick={goToPrevPage} 
                          disabled={!hasPrevPage} 
                        />
                        <Pagination.PageNumber>
                          Page {currentPage} of {totalPages}
                        </Pagination.PageNumber>
                        <Pagination.NextButton 
                          onClick={goToNextPage} 
                          disabled={!hasNextPage} 
                        />
                        <Pagination.PageSizeSelector
                          value={rowsPerPage}
                          onChange={handleRowsPerPageChange}
                          options={[5, 10, 25, 50]}
                        />
                      </Pagination>
                    </FlexBox>
                  </div>
                </>
              ) : (
                <EmptyState
                  icon={<Inbox size={48} />}
                  title="No sessions found"
                  message="Try adjusting your search filters or add new sessions"
                  action={
                    <PrimaryButton onClick={() => toast({ title: 'Info', description: 'Add sessions feature pending' })}>
                      <Plus size={16} style={{ marginRight: '0.5rem' }} />
                      Add Session
                    </PrimaryButton>
                  }
                />
              )}
            </CardBody>
          </Card>
        )}
      </ContentContainer>
    </PageContainer>
  );
};

export default EnhancedAdminSessionsView;
