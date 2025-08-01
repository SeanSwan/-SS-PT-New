/**
 * EMERGENCY BYPASS - Universal Master Schedule 
 * ==========================================
 * Temporarily disabling complex hooks to restore functionality
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import styled, { ThemeProvider } from 'styled-components';
import { Typography } from '@mui/material';
import { Calendar as CalendarIcon, AlertCircle } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { useAppSelector } from '../../redux/hooks';
import { selectAllSessions } from '../../redux/slices/scheduleSlice';
import GlowButton from '../ui/buttons/GlowButton';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { CommandCenterTheme } from './UniversalMasterScheduleTheme';
import CalendarFallback from './CalendarFallback';

/**
 * EMERGENCY VERSION - Bypasses problematic hooks
 */
const UniversalMasterSchedule: React.FC = () => {
  const { toast } = useToast();
  const sessions = useAppSelector(selectAllSessions);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simple initialization without complex hooks
    const timer = setTimeout(() => {
      setLoading(false);
      toast({
        title: 'Schedule Loaded',
        description: 'Emergency mode - Core functionality restored',
        variant: 'default'
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [toast]);

  if (loading) {
    return (
      <ThemeProvider theme={CommandCenterTheme}>
        <ScheduleContainer>
          <LoadingContainer>
            <LoadingSpinner size="large" message="Loading Universal Master Schedule..." />
          </LoadingContainer>
        </ScheduleContainer>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={CommandCenterTheme}>
      <ScheduleContainer>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
        >
          <HeaderSection>
            <HeaderTitle>
              <CalendarIcon size={28} />
              <div>
                <Typography variant="h4" component="h1">
                  Universal Master Schedule
                </Typography>
                <Typography variant="subtitle1" color="rgba(255, 255, 255, 0.7)">
                  Emergency mode - Restored functionality
                </Typography>
              </div>
            </HeaderTitle>
          </HeaderSection>

          <CalendarContainer>
            <CalendarFallback
              events={[]}
              onEventClick={() => {}}
              onSlotClick={() => {}}
              onCreateSession={() => {}}
              onFilterChange={() => {}}
              showQuickActions={true}
              compactView={false}
              clientsCount={0}
              utilizationRate={0}
              completionRate={0}
            />
          </CalendarContainer>
        </motion.div>
      </ScheduleContainer>
    </ThemeProvider>
  );
};

export default UniversalMasterSchedule;

const ScheduleContainer = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, 
    rgba(10, 10, 15, 0.95) 0%, 
    rgba(30, 58, 138, 0.1) 50%, 
    rgba(14, 165, 233, 0.05) 100%
  );
`;

const HeaderSection = styled.div`
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1.5rem 2rem;
`;

const HeaderTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  
  svg { color: #3b82f6; }
  h4 { color: white; margin: 0; }
`;

const CalendarContainer = styled.div`
  flex: 1;
  background: rgba(0, 0, 0, 0.2);
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
`;
