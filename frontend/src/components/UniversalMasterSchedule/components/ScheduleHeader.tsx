import React from 'react';
import styled from 'styled-components';
import { Calendar, RefreshCw, Bell, Plus, Clock } from 'lucide-react';
import {
  FlexBox,
  Box,
  PageTitle,
  SmallText,
  IconButton as StyledIconButton,
  OutlinedButton,
  PrimaryButton
} from '../ui';
import ViewSelector from '../Views/ViewSelector';
import { CalendarView } from '../types';

interface ScheduleHeaderProps {
  mode: 'admin' | 'trainer' | 'client';
  activeView: CalendarView;
  currentDate: Date;
  onViewChange: (view: CalendarView) => void;
  onDateChange: (date: Date) => void;
  onRefresh: () => void;
  onOpenNotifications: () => void;
  onOpenAvailability: () => void;
  onOpenBlocked: () => void;
  onOpenRecurring: () => void;
  onOpenPayment: () => void;
  onOpenCreate: () => void;
  canManageAvailability: boolean;
  canBlockTime: boolean;
  canCreateRecurring: boolean;
  canCreateSessions: boolean;
}

const ScheduleHeader: React.FC<ScheduleHeaderProps> = ({
  mode,
  activeView,
  currentDate,
  onViewChange,
  onDateChange,
  onRefresh,
  onOpenNotifications,
  onOpenAvailability,
  onOpenBlocked,
  onOpenRecurring,
  onOpenPayment,
  onOpenCreate,
  canManageAvailability,
  canBlockTime,
  canCreateRecurring,
  canCreateSessions
}) => {
  return (
    <>
      <HeaderContainer>
        <FlexBox align="center" gap="1rem">
          <Calendar size={32} color="#3b82f6" />
          <Box>
            <PageTitle>Universal Master Schedule</PageTitle>
            <SmallText secondary style={{ marginTop: '0.25rem' }}>
              Professional session management system
            </SmallText>
          </Box>
        </FlexBox>

        <HeaderActions>
          <StyledIconButton
            onClick={onRefresh}
            aria-label="Refresh sessions"
            size="medium"
          >
            <RefreshCw size={20} />
          </StyledIconButton>
          <OutlinedButton onClick={onOpenNotifications}>
            <Bell size={18} />
            Notification Settings
          </OutlinedButton>
          {canManageAvailability && (
            <OutlinedButton onClick={onOpenAvailability}>
              <Calendar size={18} />
              Manage Availability
            </OutlinedButton>
          )}
          {(canCreateSessions || canCreateRecurring || canBlockTime) && (
            <>
              {canBlockTime && (
                <OutlinedButton onClick={onOpenBlocked}>
                  <Clock size={18} />
                  Block Time
                </OutlinedButton>
              )}
              {canCreateRecurring && (
                <OutlinedButton onClick={onOpenRecurring}>
                  <Calendar size={18} />
                  Create Recurring
                </OutlinedButton>
              )}
              {canCreateSessions && (
                <>
                  <OutlinedButton onClick={onOpenPayment}>
                    Apply Payment
                  </OutlinedButton>
                  <PrimaryButton onClick={onOpenCreate}>
                    <Plus size={18} />
                    Create Session
                  </PrimaryButton>
                </>
              )}
            </>
          )}
        </HeaderActions>
      </HeaderContainer>

      <ViewSelector
        activeView={activeView}
        onViewChange={onViewChange}
        currentDate={currentDate}
        onDateChange={onDateChange}
      />
    </>
  );
};

export default ScheduleHeader;

const HeaderContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
  gap: 1rem;

  @media (max-width: 1024px) {
    padding: 1.25rem 1.5rem;
  }

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    padding: 1rem;
    gap: 1rem;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: flex-end;

  @media (max-width: 768px) {
    width: 100%;
    justify-content: center;
  }

  @media (max-width: 480px) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.5rem;

    button {
      width: 100%;
      justify-content: center;
      font-size: 0.75rem;
      padding: 0.55rem 0.6rem;
      min-height: 44px;
    }
  }
`;

