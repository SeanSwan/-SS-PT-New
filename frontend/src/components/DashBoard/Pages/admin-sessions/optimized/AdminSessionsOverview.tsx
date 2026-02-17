/**
 * AdminSessionsOverview.tsx
 * ==========================
 * 
 * Overview component for Admin Sessions - Statistics and View Controls
 * Part of the Admin Sessions optimization following proven Trainer Dashboard methodology
 * 
 * Features:
 * - Statistics dashboard with 4 key metrics
 * - View mode toggle (table/calendar)
 * - Action buttons (refresh, add sessions)
 * - Performance-optimized with memoization
 * - Responsive design with mobile-first approach
 * - WCAG AA accessibility compliance
 */

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Typography, Stack, Grid } from '../../../../ui/primitives';
import { Calendar, TableIcon, CalendarDays, Zap, RefreshCw } from 'lucide-react';
import { 
  AdminSessionsOverviewProps, 
  SessionStats 
} from './AdminSessionsTypes';
import { 
  StatsCard, 
  StellarSearchContainer,
  getStatsCardsData,
  cardVariants 
} from './AdminSessionsSharedComponents';
import GlowButton from '../../../../ui/buttons/GlowButton';
import styled from 'styled-components';

// ===== STYLED COMPONENTS =====

const OverviewContainer = styled(motion.div)`
  width: 100%;
  margin-bottom: 1.5rem;
`;

const HeaderSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 2rem;
  
  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
`;

const HeaderTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const ActionButtonsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
`;

const ViewToggleContainer = styled.div`
  display: flex;
  gap: 0.25rem;
  background: rgba(30, 58, 138, 0.2);
  border-radius: 8px;
  padding: 4px;
  border: 1px solid rgba(59, 130, 246, 0.3);
`;

const StatsGridContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
`;

// ===== MAIN COMPONENT =====

const AdminSessionsOverview: React.FC<AdminSessionsOverviewProps> = ({
  statsData,
  loading,
  viewMode,
  onViewModeChange,
  onRefresh,
  onOpenAddSessions,
  loadingClients
}) => {
  // Prepare stats cards data
  const statsCards = getStatsCardsData(
    statsData.todaySessions,
    statsData.completedHours,
    statsData.activeTrainers,
    statsData.completionRate
  );

  return (
    <OverviewContainer
      variants={cardVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Section */}
      <HeaderSection>
        <HeaderTitle>
          <Calendar size={28} />
          <Typography
            variant="h5"
            component="h1"
            style={{
              fontWeight: 300,
              color: 'white',
              fontSize: '1.75rem',
            }}
          >
            Training Sessions Management
          </Typography>
        </HeaderTitle>
        
        <ActionButtonsContainer>
          {/* View Toggle Buttons */}
          <ViewToggleContainer>
            <GlowButton
              text="Table"
              theme={viewMode === 'table' ? 'cosmic' : 'ruby'}
              size="small"
              leftIcon={<TableIcon size={16} />}
              onClick={() => onViewModeChange('table')}
              style={{
                background: viewMode === 'table' 
                  ? 'linear-gradient(135deg, #3b82f6 0%, #0ea5e9 100%)' 
                  : 'rgba(30, 58, 138, 0.3)',
                border: viewMode === 'table' ? '1px solid #3b82f6' : '1px solid transparent',
                minWidth: '80px'
              }}
            />
            <GlowButton
              text="Calendar"
              theme={viewMode === 'calendar' ? 'cosmic' : 'ruby'}
              size="small"
              leftIcon={<CalendarDays size={16} />}
              onClick={() => onViewModeChange('calendar')}
              style={{
                background: viewMode === 'calendar' 
                  ? 'linear-gradient(135deg, #3b82f6 0%, #0ea5e9 100%)' 
                  : 'rgba(30, 58, 138, 0.3)',
                border: viewMode === 'calendar' ? '1px solid #3b82f6' : '1px solid transparent',
                minWidth: '80px'
              }}
            />
          </ViewToggleContainer>
          
          {/* Action Buttons */}
          <GlowButton
            text="Add Sessions"
            theme="emerald"
            size="small"
            leftIcon={<Zap size={16} />}
            onClick={onOpenAddSessions}
            disabled={loadingClients}
            style={{ minWidth: '120px' }}
          />
          <GlowButton
            text="Refresh"
            theme="purple"
            size="small"
            leftIcon={<RefreshCw size={16} />}
            onClick={onRefresh}
            isLoading={loading}
            style={{ minWidth: '100px' }}
          />
        </ActionButtonsContainer>
      </HeaderSection>

      {/* Statistics Cards Grid */}
      <StatsGridContainer>
        {statsCards.map((cardData, index) => (
          <StatsCard
            key={cardData.label}
            data={cardData}
            index={index}
            loading={loading}
          />
        ))}
      </StatsGridContainer>
    </OverviewContainer>
  );
};

// ===== PERFORMANCE OPTIMIZATION =====

// Memoize the component to prevent unnecessary re-renders
export default memo(AdminSessionsOverview);

// ===== ADDITIONAL COMPONENT VARIANTS =====

// Compact version for smaller screens or embedded views
interface CompactOverviewProps {
  statsData: SessionStats;
  loading: boolean;
  onRefresh: () => void;
}

export const CompactAdminSessionsOverview: React.FC<CompactOverviewProps> = memo(({
  statsData,
  loading,
  onRefresh
}) => {
  const statsCards = getStatsCardsData(
    statsData.todaySessions,
    statsData.completedHours,
    statsData.activeTrainers,
    statsData.completionRate
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <StellarSearchContainer>
        <Typography
          variant="h6"
          style={{
            color: 'white',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Calendar size={20} />
          Sessions Overview
        </Typography>
        <GlowButton
          text="Refresh"
          theme="cosmic"
          size="small"
          leftIcon={<RefreshCw size={14} />}
          onClick={onRefresh}
          isLoading={loading}
        />
      </StellarSearchContainer>
      
      <Grid container spacing={1.5}>
        {statsCards.map((cardData, index) => (
          <Grid item xs={6} sm={3} key={cardData.label} style={{ minWidth: 0 }}>
            <StatsCard
              data={cardData}
              index={index}
              loading={loading}
            />
          </Grid>
        ))}
      </Grid>
    </motion.div>
  );
});

CompactAdminSessionsOverview.displayName = 'CompactAdminSessionsOverview';

// ===== UTILITY FUNCTIONS =====

export const calculateSessionStats = (sessions: any[]): SessionStats => {
  const today = new Date().toLocaleDateString();
  
  const todaySessionsCount = sessions.filter(session =>
    new Date(session.sessionDate).toLocaleDateString() === today
  ).length;

  const completedSessions = sessions.filter(session =>
    session.status === 'completed'
  );

  const completedHours = completedSessions.reduce((total, session) =>
    total + (session.duration / 60), 0
  );

  const uniqueTrainers = new Set(
    sessions
      .filter(session => session.trainerId)
      .map(session => session.trainerId)
  );

  const relevantSessionsForRate = sessions.filter(session =>
    ['scheduled', 'confirmed', 'completed'].includes(session.status)
  );

  const completionRate = relevantSessionsForRate.length > 0
    ? Math.round((completedSessions.length / relevantSessionsForRate.length) * 100)
    : 0;

  return {
    todaySessions: todaySessionsCount,
    completedHours: Math.round(completedHours * 10) / 10,
    activeTrainers: uniqueTrainers.size,
    completionRate
  };
};

// ===== ACCESSIBILITY HELPERS =====

export const getOverviewAriaLabel = (statsData: SessionStats): string => {
  return `Sessions overview: ${statsData.todaySessions} sessions today, ${statsData.completedHours} hours completed, ${statsData.activeTrainers} active trainers, ${statsData.completionRate}% completion rate`;
};

// ===== ERROR HANDLING =====

export const validateStatsData = (statsData: SessionStats): boolean => {
  return (
    typeof statsData.todaySessions === 'number' &&
    typeof statsData.completedHours === 'number' &&
    typeof statsData.activeTrainers === 'number' &&
    typeof statsData.completionRate === 'number' &&
    statsData.todaySessions >= 0 &&
    statsData.completedHours >= 0 &&
    statsData.activeTrainers >= 0 &&
    statsData.completionRate >= 0 &&
    statsData.completionRate <= 100
  );
};
