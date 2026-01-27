import React from 'react';
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
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '1.5rem 2rem', 
        background: 'rgba(0, 0, 0, 0.3)', 
        backdropFilter: 'blur(10px)', 
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        flexShrink: 0,
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <FlexBox align="center" gap="1rem">
          <Calendar size={32} color="#3b82f6" />
          <Box>
            <PageTitle>Universal Master Schedule</PageTitle>
            <SmallText secondary style={{ marginTop: '0.25rem' }}>
              Professional session management system
            </SmallText>
          </Box>
        </FlexBox>
        
        <FlexBox align="center" gap="0.5rem">
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
        </FlexBox>
      </div>

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
