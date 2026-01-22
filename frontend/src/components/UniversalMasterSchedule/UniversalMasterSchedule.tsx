/**
 * 🚀 UNIVERSAL MASTER SCHEDULE - MUI-FREE VERSION
 * ================================================
 * Complete rewrite using custom styled-components
 * All MUI dependencies removed, fully accessible
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import RecurringSessionModal from './RecurringSessionModal';
import BlockedTimeModal from './BlockedTimeModal';
import NotificationPreferencesModal from './NotificationPreferencesModal';
import SessionDetailModal from './SessionDetailModal';
import RecurringSeriesModal from './RecurringSeriesModal';
import { useSessionCredits } from './hooks/useSessionCredits';

// Custom UI Components (MUI replacements)
import {
  PageTitle,
  BodyText,
  SmallText,
  Caption,
  ErrorText,
  HelperText,
  PrimaryButton,
  OutlinedButton,
  IconButton as StyledIconButton,
  StyledInput,
  CheckboxWrapper,
  FormField,
  Label,
  StyledTextarea,
  CustomSelect,
  SelectOption,
  Modal,
  Spinner,
  LoadingContainer,
  Card,
  CardBody,
  GridContainer,
  FlexBox,
  Box,
  PrimaryHeading
} from './ui';

// Lucide React icons
import {
  Calendar,
  Plus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Save,
  Clock,
  MapPin,
  User,
  AlertTriangle,
  Bell
} from 'lucide-react';

// Simple theme for styling
const scheduleTheme = {
  colors: {
    primary: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    background: '#0f172a',
    surface: '#1e293b',
    text: '#f1f5f9',
    textSecondary: '#94a3b8'
  }
};

// Simplified session interface
interface Session {
  id: number;
  sessionDate: string;
  duration: number;
  status: string;
  location?: string;
  notes?: string;
  reason?: string;
  userId?: number;
  trainerId?: number;
  rating?: number | null;
  feedback?: string | null;
  clientName?: string;
  trainerName?: string;
  isRecurring?: boolean;
  isBlocked?: boolean;
  recurringGroupId?: string | null;
}

type ScheduleMode = 'admin' | 'trainer' | 'client';

interface UniversalMasterScheduleProps {
  adminMobileMenuOpen?: boolean;
  adminDeviceType?: 'mobile' | 'tablet' | 'desktop';
  mobileAdminMode?: boolean;
  mode?: ScheduleMode;
  userId?: string | number;
}

const UniversalMasterSchedule: React.FC<UniversalMasterScheduleProps> = ({
  adminMobileMenuOpen = false,
  adminDeviceType = 'desktop',
  mobileAdminMode = false,
  mode = 'admin',
  userId
}) => {
  // State management
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRecurringDialog, setShowRecurringDialog] = useState(false);
  const [showBlockedDialog, setShowBlockedDialog] = useState(false);
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [detailSession, setDetailSession] = useState<Session | null>(null);
  const [showSeriesDialog, setShowSeriesDialog] = useState(false);
  const [activeSeriesGroupId, setActiveSeriesGroupId] = useState<string | null>(null);
  const [bookingTarget, setBookingTarget] = useState<Session | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [formData, setFormData] = useState({
    sessionDate: '',
    duration: 60,
    location: 'Main Studio',
    notes: '',
    notifyClient: true
  });

  const {
    data: credits,
    isLoading: creditsLoading,
    refetch: refetchCredits
  } = useSessionCredits(mode === 'client');

  // Simple auth check (build-safe)
  const [hasAccess, setHasAccess] = useState(false);
  const resolvedUserId = typeof userId === 'string' ? parseInt(userId, 10) : userId;
  const canCreateSessions = mode === 'admin';
  const canCreateRecurring = mode === 'admin';
  const canBlockTime = mode === 'admin' || mode === 'trainer';
  const canQuickBook = mode === 'client';
  const sessionsRemaining = credits?.sessionsRemaining;
  const lowCredits = typeof sessionsRemaining === 'number' && sessionsRemaining < 3;

  // Fetch sessions from API (safe implementation)
  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found');
        setLoading(false);
        return;
      }

      if ((mode === 'trainer' || mode === 'client') && !resolvedUserId) {
        console.log('Missing userId for schedule mode:', mode);
        setSessions([]);
        setLoading(false);
        return;
      }

      // Try to fetch from API, fallback gracefully
      try {
        let endpoint = '/api/sessions';
        if (mode === 'admin' && resolvedUserId) {
          endpoint = `/api/sessions?userId=${resolvedUserId}`;
        }

        const response = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const result = await response.json();

          // Handle standardized response format: { success, data, meta }
          let normalized = [];
          if (Array.isArray(result)) {
            normalized = result;
          } else if (result.success && result.data) {
            normalized = Array.isArray(result.data) ? result.data : [];
          } else {
            normalized = result.sessions || [];
          }

          setSessions(normalized.map((session: any) => ({
            ...session,
            isBlocked: Boolean(session.isBlocked) || session.status === 'blocked',
            isRecurring: Boolean(session.isRecurring) || Boolean(session.recurringGroupId),
            clientName: session.clientName
              || (session.client ? `${session.client.firstName} ${session.client.lastName}` : undefined),
            trainerName: session.trainerName
              || (session.trainer ? `${session.trainer.firstName} ${session.trainer.lastName}` : undefined)
          })));
        } else {
          console.log('API call failed, status:', response.status);
          // Keep empty sessions on error
          setSessions([]);
        }
      } catch (apiError) {
        console.log('API not available:', apiError);
        // Keep empty sessions if API isn't available
        setSessions([]);
      }

    } catch (error) {
      console.error('Error fetching sessions:', error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [mode, resolvedUserId]);

  // Initialize component
  useEffect(() => {
    const initializeSchedule = async () => {
      try {
        setLoading(true);

        // Check permissions
        const token = localStorage.getItem('token');
        if (token) {
          setHasAccess(true);
        }

        // Load sessions from API
        await fetchSessions();

      } catch (error) {
        console.error('Error initializing schedule:', error);
        setLoading(false);
      }
    };

    initializeSchedule();
  }, [fetchSessions]);

  // Handle session creation (safe implementation)
  const handleCreateSession = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in to create sessions');
        return;
      }

      // Try API call, fallback gracefully
      try {
        const response = await fetch('/api/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(formData)
        });

        if (response.ok) {
          const result = await response.json();

          if (result.success) {
            alert('Session created successfully!');
            setShowCreateDialog(false);
            fetchSessions();
          } else {
            alert(result.message || 'Failed to create session');
          }
        } else {
          const errorData = await response.json();
          alert(errorData.message || 'Failed to create session');
        }
      } catch (apiError) {
        console.error('API error creating session:', apiError);
        alert('Could not connect to server. Please check your connection and try again.');
      }
      
    } catch (error) {
      console.error('Error creating session:', error);
      alert('Error creating session. Please try again.');
    }
  };

  const openBookingDialog = (session: Session) => {
    setBookingTarget(session);
    setBookingError(null);
    setShowBookingDialog(true);
  };

  const openDetailDialog = (session: Session) => {
    setDetailSession(session);
    setShowDetailDialog(true);
  };

  const openSeriesDialog = (groupId: string) => {
    setActiveSeriesGroupId(groupId);
    setShowSeriesDialog(true);
  };

  const handleBookSession = async () => {
    if (!bookingTarget) {
      return;
    }

    setBookingError(null);
    setBookingLoading(true);

    const token = localStorage.getItem('token');
    if (!token) {
      setBookingError('Please log in to book sessions.');
      setBookingLoading(false);
      return;
    }

    const sessionDate = new Date(bookingTarget.sessionDate);
    if (sessionDate.getTime() < Date.now()) {
      setBookingError('Cannot book sessions in the past.');
      setBookingLoading(false);
      return;
    }

    if (typeof sessionsRemaining === 'number' && sessionsRemaining <= 0) {
      setBookingError('You have no remaining session credits.');
      setBookingLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/sessions/${bookingTarget.id}/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result?.success === false) {
        setBookingError(result?.message || 'Failed to book session.');
        setBookingLoading(false);
        return;
      }

      setShowBookingDialog(false);
      setBookingTarget(null);
      await fetchSessions();
      if (mode === 'client') {
        await refetchCredits();
      }
    } catch (error) {
      console.error('Error booking session:', error);
      setBookingError('Failed to book session. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  // Navigation helpers
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 7 : -7));
    setSelectedDate(newDate);
  };

  // Get week start date
  const getWeekStart = (date: Date) => {
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay());
    return start;
  };

  // Generate week days
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(getWeekStart(selectedDate));
    day.setDate(day.getDate() + i);
    return day;
  });

  // Status color helper
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return '#3b82f6';
      case 'scheduled': return '#10b981';
      case 'confirmed': return '#059669';
      case 'completed': return '#6b7280';
      case 'cancelled': return '#ef4444';
      case 'blocked': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  // Location options for select dropdown
  const locationOptions: SelectOption[] = [
    { value: 'Main Studio', label: 'Main Studio' },
    { value: 'Gym Floor', label: 'Gym Floor' },
    { value: 'Private Room', label: 'Private Room' },
    { value: 'Online', label: 'Online Session' }
  ];

  const creditsDisplay = creditsLoading
    ? '...'
    : (typeof sessionsRemaining === 'number' ? sessionsRemaining : '--');

  const seriesSessions = activeSeriesGroupId
    ? sessions.filter((session) => session.recurringGroupId === activeSeriesGroupId)
    : [];

  // Access control
  if (!hasAccess) {
    return (
      <AccessDeniedContainer>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{ textAlign: 'center' }}
        >
          <AlertTriangle size={48} color="#ef4444" />
          <PrimaryHeading style={{ marginTop: '1rem', color: '#ef4444' }}>
            Access Denied
          </PrimaryHeading>
          <BodyText secondary style={{ marginTop: '0.5rem' }}>
            Schedule access requires login
          </BodyText>
        </motion.div>
      </AccessDeniedContainer>
    );
  }

  // Loading state
  if (loading) {
    return (
      <Spinner 
        size={60} 
        text="Loading Schedule..." 
        fullscreen 
      />
    );
  }

  return (
    <ScheduleContainer>
      {/* Header */}
      <ScheduleHeader>
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
            onClick={fetchSessions}
            aria-label="Refresh sessions"
            size="medium"
          >
            <RefreshCw size={20} />
          </StyledIconButton>
          <OutlinedButton onClick={() => setShowNotificationDialog(true)}>
            <Bell size={18} />
            Notification Settings
          </OutlinedButton>
          {(canCreateSessions || canCreateRecurring || canBlockTime) && (
            <>
              {canBlockTime && (
                <OutlinedButton onClick={() => setShowBlockedDialog(true)}>
                  <Clock size={18} />
                  Block Time
                </OutlinedButton>
              )}
              {canCreateRecurring && (
                <OutlinedButton onClick={() => setShowRecurringDialog(true)}>
                  <Calendar size={18} />
                  Create Recurring
                </OutlinedButton>
              )}
              {canCreateSessions && (
                <PrimaryButton onClick={() => setShowCreateDialog(true)}>
                  <Plus size={18} />
                  Create Session
                </PrimaryButton>
              )}
            </>
          )}
        </FlexBox>
      </ScheduleHeader>

      {/* Navigation */}
      <NavigationBar>
        <FlexBox align="center" gap="1rem">
          <StyledIconButton 
            onClick={() => navigateWeek('prev')}
            aria-label="Previous week"
          >
            <ChevronLeft />
          </StyledIconButton>
          
          <DateDisplay>
            {selectedDate.toLocaleDateString('en-US', { 
              month: 'long', 
              year: 'numeric',
              day: 'numeric'
            })}
          </DateDisplay>
          
          <StyledIconButton 
            onClick={() => navigateWeek('next')}
            aria-label="Next week"
          >
            <ChevronRight />
          </StyledIconButton>
          
          <OutlinedButton onClick={() => setSelectedDate(new Date())}>
            Today
          </OutlinedButton>
        </FlexBox>
      </NavigationBar>

      {/* Statistics Panel */}
      <StatsPanel>
        <PrimaryHeading style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
          Schedule Overview
        </PrimaryHeading>
        {mode === 'client' && lowCredits && (
          <CreditWarning>
            <AlertTriangle size={18} />
            <div>
              <SmallText>
                Low credits: {creditsDisplay} sessions remaining. Visit the store to purchase more.
              </SmallText>
            </div>
          </CreditWarning>
        )}
        <GridContainer columns={mode === 'client' ? 5 : 4} gap="1rem">
          <StatCard>
            <div className="stat-value">{sessions.length}</div>
            <Caption secondary>Total Sessions</Caption>
          </StatCard>
          <StatCard>
            <div className="stat-value" style={{ color: '#10b981' }}>
              {sessions.filter(s => s.status === 'available').length}
            </div>
            <Caption secondary>Available</Caption>
          </StatCard>
          <StatCard>
            <div className="stat-value" style={{ color: '#f59e0b' }}>
              {sessions.filter(s => s.status === 'scheduled').length}
            </div>
            <Caption secondary>Scheduled</Caption>
          </StatCard>
          <StatCard>
            <div className="stat-value" style={{ color: '#6b7280' }}>
              {sessions.filter(s => s.status === 'completed').length}
            </div>
            <Caption secondary>Completed</Caption>
          </StatCard>
          {mode === 'client' && (
            <StatCard>
              <div className="stat-value" style={{ color: '#38bdf8' }}>
                {creditsDisplay}
              </div>
              <Caption secondary>Credits Remaining</Caption>
            </StatCard>
          )}
        </GridContainer>
      </StatsPanel>

      {/* Simple Calendar View */}
      <CalendarContainer>
        <CalendarHeaderRow>
          <PrimaryHeading style={{ fontSize: '1.5rem' }}>
            Week View
          </PrimaryHeading>
          <Legend>
            <LegendItem>
              <LegendSwatch $color={getStatusColor('available')} />
              <Caption secondary>Available</Caption>
            </LegendItem>
            <LegendItem>
              <LegendSwatch $color={getStatusColor('scheduled')} />
              <Caption secondary>Booked/Scheduled</Caption>
            </LegendItem>
            <LegendItem>
              <LegendSwatch $color={getStatusColor('blocked')} $striped />
              <Caption secondary>Blocked</Caption>
            </LegendItem>
            <LegendItem>
              <SessionBadge tone="recurring">Recurring</SessionBadge>
            </LegendItem>
          </Legend>
        </CalendarHeaderRow>
        
        <GridContainer columns={7} gap="0.5rem">
          {weekDays.map((day, index) => (
            <DayCard key={index}>
              <Caption secondary>
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
              </Caption>
              <PrimaryHeading style={{ fontSize: '1.5rem', margin: '0.5rem 0' }}>
                {day.getDate()}
              </PrimaryHeading>
              
              {/* Sessions for this day */}
              {sessions
                .filter(session => {
                  const sessionDate = new Date(session.sessionDate);
                  return sessionDate.toDateString() === day.toDateString();
                })
                .map(session => {
                  const isBookable = canQuickBook && session.status === 'available' && !session.isBlocked;

                  return (
                    <SessionBlock
                      key={session.id}
                      status={session.status}
                      isBlocked={Boolean(session.isBlocked)}
                      onClick={() => {
                        if (isBookable) {
                          openBookingDialog(session);
                          return;
                        }
                        openDetailDialog(session);
                      }}
                    >
                      {(session.isBlocked || session.isRecurring) && (
                        <SessionMetaRow>
                          {session.isBlocked && (
                            <SessionBadge tone="blocked">Blocked</SessionBadge>
                          )}
                          {session.isRecurring && (
                            <SessionBadge tone="recurring">Recurring</SessionBadge>
                          )}
                        </SessionMetaRow>
                      )}
                      <Caption style={{ color: 'white', display: 'block' }}>
                        {new Date(session.sessionDate).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Caption>
                      <Caption style={{ color: 'white', display: 'block', marginTop: '0.25rem' }}>
                        {session.clientName || session.trainerName || 'Available'}
                      </Caption>
                      {isBookable && (
                        <QuickBookButton
                          onClick={(event) => {
                            event.stopPropagation();
                            openBookingDialog(session);
                          }}
                        >
                          Quick Book
                        </QuickBookButton>
                      )}
                    </SessionBlock>
                  );
                })
              }
            </DayCard>
          ))}
        </GridContainer>
      </CalendarContainer>

      {/* Create Session Modal */}
      {canCreateSessions && (
        <Modal
          isOpen={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          title="Create New Session"
          size="md"
          footer={
            <>
              <OutlinedButton onClick={() => setShowCreateDialog(false)}>
                Cancel
              </OutlinedButton>
              <PrimaryButton onClick={handleCreateSession}>
                <Save size={18} />
                Create Session
              </PrimaryButton>
            </>
          }
        >
          <FlexBox direction="column" gap="1.5rem">
            <FormField>
              <Label htmlFor="sessionDate" required>Session Date & Time</Label>
              <StyledInput
                id="sessionDate"
                type="datetime-local"
                value={formData.sessionDate}
                onChange={(e) => setFormData({ ...formData, sessionDate: e.target.value })}
              />
            </FormField>
            
            <FormField>
              <Label htmlFor="duration" required>Duration (minutes)</Label>
              <StyledInput
                id="duration"
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                min={15}
                step={15}
              />
            </FormField>
            
            <FormField>
              <Label htmlFor="location" required>Location</Label>
              <CustomSelect
                value={formData.location}
                onChange={(value) => setFormData({ ...formData, location: value as string })}
                options={locationOptions}
                aria-label="Session location"
              />
            </FormField>
            
            <FormField>
              <Label htmlFor="notes">Notes</Label>
              <StyledTextarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add any additional notes..."
                rows={3}
              />
            </FormField>

            <FormField>
              <CheckboxWrapper>
                <input
                  type="checkbox"
                  checked={formData.notifyClient}
                  onChange={(e) => setFormData({ ...formData, notifyClient: e.target.checked })}
                />
                <span>Notify client about this session</span>
              </CheckboxWrapper>
            </FormField>
          </FlexBox>
        </Modal>
      )}
      {showBookingDialog && bookingTarget && (
        <Modal
          isOpen={showBookingDialog}
          onClose={() => setShowBookingDialog(false)}
          title="Confirm Booking"
          size="sm"
          footer={
            <>
              <OutlinedButton onClick={() => setShowBookingDialog(false)} disabled={bookingLoading}>
                Cancel
              </OutlinedButton>
              <PrimaryButton onClick={handleBookSession} disabled={bookingLoading}>
                {bookingLoading ? 'Booking...' : 'Confirm Booking'}
              </PrimaryButton>
            </>
          }
        >
          <FlexBox direction="column" gap="1rem">
            <BodyText>
              You are booking the session below. One credit will be deducted on confirmation.
            </BodyText>
            <BookingCard>
              <BookingRow>
                <SmallText secondary>Date</SmallText>
                <BodyText>{new Date(bookingTarget.sessionDate).toLocaleDateString()}</BodyText>
              </BookingRow>
              <BookingRow>
                <SmallText secondary>Time</SmallText>
                <BodyText>{new Date(bookingTarget.sessionDate).toLocaleTimeString()}</BodyText>
              </BookingRow>
              <BookingRow>
                <SmallText secondary>Duration</SmallText>
                <BodyText>{bookingTarget.duration} min</BodyText>
              </BookingRow>
              <BookingRow>
                <SmallText secondary>Location</SmallText>
                <BodyText>{bookingTarget.location || 'Main Studio'}</BodyText>
              </BookingRow>
            </BookingCard>
            <CreditCard>
              <SmallText secondary>Credits Remaining</SmallText>
              <PrimaryHeading style={{ fontSize: '1.75rem' }}>
                {creditsDisplay}
              </PrimaryHeading>
              {typeof sessionsRemaining === 'number' && (
                <HelperText>
                  After booking: {Math.max(0, sessionsRemaining - 1)}
                </HelperText>
              )}
            </CreditCard>
            {bookingError && <ErrorText>{bookingError}</ErrorText>}
          </FlexBox>
        </Modal>
      )}
      {canCreateRecurring && (
        <RecurringSessionModal
          open={showRecurringDialog}
          onClose={() => setShowRecurringDialog(false)}
          onSuccess={fetchSessions}
        />
      )}
      {canBlockTime && (
        <BlockedTimeModal
          open={showBlockedDialog}
          onClose={() => setShowBlockedDialog(false)}
          onSuccess={fetchSessions}
        />
      )}
      <NotificationPreferencesModal
        open={showNotificationDialog}
        onClose={() => setShowNotificationDialog(false)}
        onSuccess={() => undefined}
      />
      <SessionDetailModal
        session={detailSession}
        open={showDetailDialog}
        mode={mode}
        onClose={() => setShowDetailDialog(false)}
        onUpdated={fetchSessions}
        onManageSeries={openSeriesDialog}
        seriesCount={detailSession?.recurringGroupId
          ? sessions.filter(session => session.recurringGroupId === detailSession.recurringGroupId).length
          : undefined}
      />
      <RecurringSeriesModal
        groupId={activeSeriesGroupId}
        open={showSeriesDialog}
        onClose={() => setShowSeriesDialog(false)}
        onSuccess={fetchSessions}
        seriesSessions={seriesSessions}
      />
    </ScheduleContainer>
  );
};

export default UniversalMasterSchedule;

// ==================== STYLED COMPONENTS ====================

const ScheduleContainer = styled.div.attrs({
  'data-testid': 'schedule',
  className: 'schedule-container'
})`
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
  color: white;
  overflow: hidden;
`;

const ScheduleHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
  
  @media (max-width: 768px) {
    padding: 1rem;
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }
`;

const NavigationBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
`;

const DateDisplay = styled.div`
  min-width: 200px;
  text-align: center;
  font-size: 1.25rem;
  font-weight: 500;
  color: white;
`;

const StatsPanel = styled.div`
  margin: 1rem 2rem;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  flex-shrink: 0;
`;

const CreditWarning = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  border-radius: 10px;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.35);
  color: #fef3c7;
`;

const StatCard = styled(Card)`
  text-align: center;
  padding: 1.5rem;
  
  .stat-value {
    font-size: 2rem;
    font-weight: 700;
    color: #3b82f6;
    margin-bottom: 0.5rem;
    line-height: 1;
  }
`;

const CalendarContainer = styled.div`
  flex: 1;
  overflow: auto;
  margin: 0 2rem 2rem;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  
  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    
    &:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  }
`;

const CalendarHeaderRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;

const Legend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
  align-items: center;
  justify-content: flex-end;
`;

const LegendItem = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
`;

const LegendSwatch = styled.span<{ $color: string; $striped?: boolean }>`
  width: 14px;
  height: 14px;
  border-radius: 3px;
  background-color: ${props => props.$color};
  border: 1px solid rgba(255, 255, 255, 0.2);
  ${props => props.$striped && `
    background-image: repeating-linear-gradient(
      45deg,
      rgba(255, 255, 255, 0.15),
      rgba(255, 255, 255, 0.15) 4px,
      rgba(0, 0, 0, 0.2) 4px,
      rgba(0, 0, 0, 0.2) 8px
    );
  `}
`;

const DayCard = styled(Card)`
  padding: 1rem;
  text-align: center;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const SessionBlock = styled.div<{ status: string; isBlocked?: boolean }>`
  background-color: ${props => getStatusColor(props.status)};
  ${props => props.isBlocked && `
    background-image: repeating-linear-gradient(
      45deg,
      rgba(255, 255, 255, 0.12),
      rgba(255, 255, 255, 0.12) 6px,
      rgba(0, 0, 0, 0.2) 6px,
      rgba(0, 0, 0, 0.2) 12px
    );
  `}
  border-radius: 6px;
  padding: 0.5rem;
  margin: 0.5rem 0;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  
  &:hover {
    transform: scale(1.02);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
  
  &:active {
    transform: scale(0.98);
  }
`;

const QuickBookButton = styled.button`
  margin-top: 0.5rem;
  width: 100%;
  padding: 0.3rem 0.5rem;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #ffffff;
  background: rgba(59, 130, 246, 0.7);
  border: 1px solid rgba(59, 130, 246, 0.9);
  border-radius: 6px;
  cursor: pointer;

  &:hover {
    background: rgba(37, 99, 235, 0.85);
  }

  &:focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }
`;

const SessionMetaRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.35rem;
  margin-bottom: 0.25rem;
  flex-wrap: wrap;
`;

const SessionBadge = styled.span<{ tone: 'blocked' | 'recurring' }>`
  padding: 0.15rem 0.4rem;
  border-radius: 999px;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: ${props => props.tone === 'blocked'
    ? 'rgba(15, 23, 42, 0.55)'
    : 'rgba(59, 130, 246, 0.2)'};
  color: ${props => props.tone === 'blocked'
    ? '#e2e8f0'
    : '#bfdbfe'};
  border: 1px solid ${props => props.tone === 'blocked'
    ? 'rgba(148, 163, 184, 0.6)'
    : 'rgba(59, 130, 246, 0.5)'};
`;

const BookingCard = styled.div`
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const BookingRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
`;

const CreditCard = styled.div`
  background: rgba(56, 189, 248, 0.12);
  border: 1px solid rgba(56, 189, 248, 0.35);
  border-radius: 10px;
  padding: 1rem;
  text-align: center;
`;

const AccessDeniedContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  color: white;
  padding: 2rem;
`;

// Helper function (keep at bottom)
const getStatusColor = (status: string): string => {
  switch (status) {
    case 'available': return '#3b82f6';
    case 'scheduled': return '#10b981';
    case 'confirmed': return '#059669';
    case 'completed': return '#6b7280';
    case 'cancelled': return '#ef4444';
    case 'blocked': return '#f59e0b';
    default: return '#6b7280';
  }
};
