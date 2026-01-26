/**
 * 🚀 UNIVERSAL MASTER SCHEDULE - MUI-FREE VERSION
 * ================================================
 * Complete rewrite using custom styled-components
 * All MUI dependencies removed, fully accessible
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import RecurringSessionModal from './RecurringSessionModal';
import BlockedTimeModal from './BlockedTimeModal';
import NotificationPreferencesModal from './NotificationPreferencesModal';
import SessionDetailModal from './SessionDetailModal';
import RecurringSeriesModal from './RecurringSeriesModal';
import AvailabilityEditor from './Availability/AvailabilityEditor';
import AvailabilityOverrideModal from './Availability/AvailabilityOverrideModal';
import ApplyPaymentModal from './ApplyPaymentModal';
import { useSessionCredits } from './hooks/useSessionCredits';
import ViewSelector from './Views/ViewSelector';
import MonthView from './Views/MonthView';
import DayView from './Views/DayView';
import AgendaView from './Views/AgendaView';
import SessionCard from './Cards/SessionCard';
import DragDropManager, { DragDropResult } from './DragDrop/DragDropManager';
import ConflictPanel, { Alternative, Conflict } from './Conflicts/ConflictPanel';
import { useSchedule } from '../../hooks/useSchedule';

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
  Save,
  Clock,
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
  notifyClient?: boolean;
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
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRecurringDialog, setShowRecurringDialog] = useState(false);
  const [showBlockedDialog, setShowBlockedDialog] = useState(false);
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [detailSession, setDetailSession] = useState<Session | null>(null);
  const [showSeriesDialog, setShowSeriesDialog] = useState(false);
  const [activeSeriesGroupId, setActiveSeriesGroupId] = useState<string | null>(null);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [pendingReschedule, setPendingReschedule] = useState<DragDropResult | null>(null);
  const [bookingTarget, setBookingTarget] = useState<Session | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [showAvailabilityEditor, setShowAvailabilityEditor] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [availabilityTrainerId, setAvailabilityTrainerId] = useState<number | string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [formData, setFormData] = useState<{
    sessionDate: string;
    duration: number;
    location: string;
    notes: string;
    notifyClient: boolean;
    trainerId?: string | number;
    clientId?: string | number;
    manualClientName?: string;
  }>({
    sessionDate: '',
    duration: 60,
    location: 'Main Studio',
    notes: '',
    notifyClient: true,
    trainerId: undefined,
    clientId: undefined,
    manualClientName: ''
  });
  const [dbClients, setDbClients] = useState<Array<{ id: number | string; firstName: string; lastName: string; email?: string }>>([]);
  const [dbTrainers, setDbTrainers] = useState<Array<{ id: number | string; firstName: string; lastName: string }>>([]);
  const [useManualClient, setUseManualClient] = useState(false);

  const {
    data: credits,
    isLoading: creditsLoading,
    refetch: refetchCredits
  } = useSessionCredits(mode === 'client');

  const {
    activeView,
    currentDate,
    setView,
    setDate,
    drillDownToDay
  } = useSchedule();

  // Simple auth check (build-safe)
  const [hasAccess, setHasAccess] = useState(false);
  const resolvedUserId = typeof userId === 'string' ? parseInt(userId, 10) : userId;
  const canCreateSessions = mode === 'admin';
  const canCreateRecurring = mode === 'admin';
  const canBlockTime = mode === 'admin' || mode === 'trainer';
  const canQuickBook = mode === 'client';
  const canReschedule = mode === 'admin' || mode === 'trainer';
  const canOverrideConflicts = mode === 'admin';
  const canManageAvailability = mode === 'admin' || mode === 'trainer';
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

  // Fetch clients and trainers from database
  const fetchUsersForDropdowns = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token || mode !== 'admin') return;

    try {
      // Fetch trainers
      const trainersRes = await fetch('/api/auth/trainers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (trainersRes.ok) {
        const trainersData = await trainersRes.json();
        setDbTrainers(trainersData.data || trainersData.trainers || []);
      }

      // Fetch clients
      const clientsRes = await fetch('/api/auth/clients', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (clientsRes.ok) {
        const clientsData = await clientsRes.json();
        setDbClients(clientsData.data || clientsData.clients || []);
      }
    } catch (error) {
      console.error('Error fetching users for dropdowns:', error);
    }
  }, [mode]);

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

        // Load clients and trainers for admin dropdowns
        await fetchUsersForDropdowns();

      } catch (error) {
        console.error('Error initializing schedule:', error);
        setLoading(false);
      }
    };

    initializeSchedule();
  }, [fetchSessions, fetchUsersForDropdowns]);

  // Handle session creation (safe implementation)
  const handleCreateSession = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in to create sessions');
        return;
      }

      // Validate required fields
      if (!formData.sessionDate) {
        alert('Please select a date and time');
        return;
      }

      // Build session object
      const sessionData = {
        sessionDate: new Date(formData.sessionDate).toISOString(), // Ensure ISO format
        duration: formData.duration,
        location: formData.location,
        notes: formData.notes,
        trainerId: formData.trainerId || null,
        userId: formData.clientId || null,
        clientName: useManualClient ? formData.manualClientName : undefined,
        notifyClient: formData.notifyClient,
        status: 'available'
      };

      // Try API call - wrap in sessions array as backend expects
      try {
        const response = await fetch('/api/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ sessions: [sessionData] })
        });

        if (response.ok) {
          const result = await response.json();

          if (result.success) {
            alert('Session created successfully!');
            setShowCreateDialog(false);
            // Reset form
            setFormData({
              sessionDate: '',
              duration: 60,
              location: 'Main Studio',
              notes: '',
              notifyClient: true,
              trainerId: undefined,
              clientId: undefined,
              manualClientName: ''
            });
            setUseManualClient(false);
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

  const openConflictPanel = (nextConflicts: Conflict[], nextAlternatives: Alternative[], drop: DragDropResult) => {
    setConflicts(nextConflicts);
    setAlternatives(nextAlternatives);
    setPendingReschedule(drop);
    setConflictModalOpen(true);
  };

  const checkConflicts = useCallback(async (
    sessionId: string | number,
    newDate: Date,
    newHour: number,
    trainerId?: string | number
  ) => {
    const token = localStorage.getItem('token');
    if (!token) {
      return {
        conflicts: [{ type: 'hard', reason: 'Authentication required to check conflicts' }],
        alternatives: []
      };
    }

    const session = sessions.find((item) => String(item.id) === String(sessionId));
    const duration = session?.duration ?? 60;
    const startTime = new Date(newDate);
    startTime.setHours(newHour, 0, 0, 0);
    const endTime = new Date(startTime.getTime() + duration * 60000);

    try {
      const response = await fetch('/api/sessions/check-conflicts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          trainerId: trainerId ?? session?.trainerId ?? null,
          clientId: session?.userId ?? null,
          excludeSessionId: sessionId
        })
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        return {
          conflicts: [{ type: 'hard', reason: result?.message || 'Unable to verify conflicts' }],
          alternatives: []
        };
      }

      const normalizedAlternatives = Array.isArray(result?.alternatives)
        ? result.alternatives.map((alt: Alternative) => ({
            ...alt,
            date: new Date(alt.date)
          }))
        : [];

      return {
        conflicts: result?.conflicts || [],
        alternatives: normalizedAlternatives
      };
    } catch (error) {
      console.error('Conflict check failed:', error);
      return {
        conflicts: [{ type: 'hard', reason: 'Unable to verify conflicts' }],
        alternatives: []
      };
    }
  }, [sessions]);

  const handleReschedule = useCallback(async (
    drop: DragDropResult,
    options: { conflictOverride?: boolean } = {}
  ) => {
    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }

    const session = sessions.find((item) => String(item.id) === String(drop.sessionId));
    const duration = session?.duration ?? 60;

    const startTime = new Date(drop.newDate);
    startTime.setHours(drop.newHour, 0, 0, 0);
    const endTime = new Date(startTime.getTime() + duration * 60000);

    try {
      const response = await fetch(`/api/sessions/${drop.sessionId}/reschedule`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          newStartTime: startTime.toISOString(),
          newEndTime: endTime.toISOString(),
          trainerId: drop.trainerId ?? session?.trainerId ?? null,
          notifyClient: session?.notifyClient ?? true,
          conflictOverride: options.conflictOverride === true
        })
      });

      const result = await response.json().catch(() => ({}));

      if (response.status === 409) {
        const normalizedAlternatives = Array.isArray(result?.alternatives)
          ? result.alternatives.map((alt: Alternative) => ({
              ...alt,
              date: new Date(alt.date)
            }))
          : [];
        openConflictPanel(result?.conflicts || [], normalizedAlternatives, drop);
        return;
      }

      if (!response.ok || result?.success === false) {
        console.error('Reschedule failed:', result?.message || response.statusText);
        return;
      }

      await fetchSessions();
    } catch (error) {
      console.error('Reschedule request failed:', error);
    }
  }, [sessions, fetchSessions]);

  const handleConflictAlternative = (alternative: Alternative) => {
    if (!pendingReschedule) {
      return;
    }

    setConflictModalOpen(false);
    setPendingReschedule(null);
    handleReschedule({
      ...pendingReschedule,
      newDate: alternative.date,
      newHour: alternative.hour
    });
  };

  const handleConflictOverride = () => {
    if (!pendingReschedule) {
      return;
    }

    setConflictModalOpen(false);
    setPendingReschedule(null);
    handleReschedule(pendingReschedule, { conflictOverride: true });
  };

  const handleSelectSlot = useCallback(
    ({ hour, trainerId }: { hour: number; trainerId?: string | number }) => {
      if (!canCreateSessions) {
        return;
      }

      const slotDate = new Date(currentDate);
      slotDate.setHours(hour, 0, 0, 0);
      setFormData((prev) => ({
        ...prev,
        sessionDate: slotDate.toISOString().slice(0, 16),
        trainerId
      }));
      setShowCreateDialog(true);
    },
    [canCreateSessions, currentDate]
  );

  // Navigation helpers
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    setDate(newDate);
  };

  // Get week start date
  const getWeekStart = (date: Date) => {
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay());
    return start;
  };

  // Generate week days
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(getWeekStart(currentDate));
    day.setDate(day.getDate() + i);
    return day;
  });

  const trainers = useMemo(() => {
    const trainerMap = new Map<string, { id: string | number; name: string }>();
    sessions.forEach((session) => {
      if (!session.trainerId && !session.trainerName) {
        return;
      }
      const id = session.trainerId ?? session.trainerName ?? 'trainer';
      const key = String(id);
      if (!trainerMap.has(key)) {
        trainerMap.set(key, {
          id,
          name: session.trainerName || `Trainer ${key}`
        });
      }
    });
    return Array.from(trainerMap.values());
  }, [sessions]);

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
          {canManageAvailability && (
            <OutlinedButton onClick={() => {
              // For trainers, use their own ID. For admins, this might need a selector in future,
              // but for now defaulting to current user if they are a trainer, or null (which editor handles)
              const trainerId = mode === 'trainer' ? resolvedUserId : userId;
              setAvailabilityTrainerId(trainerId !== undefined ? trainerId : null);
              setShowAvailabilityEditor(true);
            }}>
              <Calendar size={18} />
              Manage Availability
            </OutlinedButton>
          )}
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
                <>
                  <OutlinedButton onClick={() => setShowPaymentModal(true)}>
                    Apply Payment
                  </OutlinedButton>
                  <PrimaryButton onClick={() => setShowCreateDialog(true)}>
                    <Plus size={18} />
                    Create Session
                  </PrimaryButton>
                </>
              )}
            </>
          )}
        </FlexBox>
      </ScheduleHeader>

      <ViewSelector
        activeView={activeView}
        onViewChange={setView}
        currentDate={currentDate}
        onDateChange={setDate}
      />

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

      {/* Schedule Views */}
      <CalendarContainer>
        {activeView === 'month' && (
          <MonthView
            date={currentDate}
            sessions={sessions}
            onSelectDate={(day) => {
              drillDownToDay(day);
            }}
          />
        )}

        {activeView === 'week' && (
          <>
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
              {weekDays.map((day, index) => {
                const daySessions = sessions.filter(session => {
                  const sessionDate = new Date(session.sessionDate);
                  return sessionDate.toDateString() === day.toDateString();
                });

                return (
                  <DayCard key={index}>
                    <DayCardHeader
                      onClick={() => drillDownToDay(day)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          drillDownToDay(day);
                        }
                      }}
                    >
                      <Caption secondary>
                        {day.toLocaleDateString('en-US', { weekday: 'short' })}
                      </Caption>
                      <PrimaryHeading style={{ fontSize: '1.5rem', margin: '0.5rem 0' }}>
                        {day.getDate()}
                      </PrimaryHeading>
                      <Caption secondary>{daySessions.length} sessions</Caption>
                    </DayCardHeader>

                    {daySessions.map(session => {
                      const isBookable = canQuickBook && session.status === 'available' && !session.isBlocked;

                      return (
                        <WeekSessionItem key={session.id}>
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
                          <SessionCard
                            session={session}
                            onClick={() => {
                              if (isBookable) {
                                openBookingDialog(session);
                                return;
                              }
                              openDetailDialog(session);
                            }}
                          />
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
                        </WeekSessionItem>
                      );
                    })}
                  </DayCard>
                );
              })}
            </GridContainer>
          </>
        )}

        {activeView === 'day' && (
          (canReschedule ? (
            <DragDropManager
              checkConflicts={checkConflicts}
              onDragEnd={(drop) => handleReschedule(drop)}
              onConflict={({ conflicts: nextConflicts, alternatives: nextAlternatives, drop }) => {
                openConflictPanel(nextConflicts, nextAlternatives, drop);
              }}
            >
              <DayView
                date={currentDate}
                sessions={sessions}
                trainers={trainers}
                enableDrag
                onSelectSession={(session) => openDetailDialog(session as unknown as Session)}
                onSelectSlot={handleSelectSlot}
              />
            </DragDropManager>
          ) : (
            <DayView
              date={currentDate}
              sessions={sessions}
              trainers={trainers}
              onSelectSession={(session) => openDetailDialog(session as unknown as Session)}
              onSelectSlot={handleSelectSlot}
            />
          ))
        )}

        {activeView === 'agenda' && (
          <AgendaView
            date={currentDate}
            sessions={sessions}
            onSelectSession={(session) => openDetailDialog(session as unknown as Session)}
            onEdit={(session) => openDetailDialog(session as unknown as Session)}
            onCancel={(session) => openDetailDialog(session as unknown as Session)}
          />
        )}
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
              <Label htmlFor="trainerId">Assign Trainer</Label>
              <CustomSelect
                value={formData.trainerId?.toString() || ''}
                onChange={(value) => setFormData({ ...formData, trainerId: value ? Number(value) : undefined })}
                options={[
                  { value: '', label: '-- Select Trainer --' },
                  ...dbTrainers.map(t => ({
                    value: t.id.toString(),
                    label: `${t.firstName} ${t.lastName}`
                  }))
                ]}
                aria-label="Select trainer"
              />
            </FormField>

            <FormField>
              <Label>Client</Label>
              <CheckboxWrapper style={{ marginBottom: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={useManualClient}
                  onChange={(e) => setUseManualClient(e.target.checked)}
                />
                <span>Enter client name manually</span>
              </CheckboxWrapper>
              {useManualClient ? (
                <StyledInput
                  id="manualClientName"
                  type="text"
                  value={formData.manualClientName || ''}
                  onChange={(e) => setFormData({ ...formData, manualClientName: e.target.value })}
                  placeholder="Enter client name..."
                />
              ) : (
                <CustomSelect
                  value={formData.clientId?.toString() || ''}
                  onChange={(value) => setFormData({ ...formData, clientId: value ? Number(value) : undefined })}
                  options={[
                    { value: '', label: '-- Select Client --' },
                    ...dbClients.map(c => ({
                      value: c.id.toString(),
                      label: `${c.firstName} ${c.lastName}${c.email ? ` (${c.email})` : ''}`
                    }))
                  ]}
                  aria-label="Select client"
                />
              )}
              {dbClients.length === 0 && !useManualClient && (
                <HelperText>No clients found. Check the toggle to enter manually.</HelperText>
              )}
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
      {showAvailabilityEditor && availabilityTrainerId && (
        <Modal isOpen={showAvailabilityEditor} onClose={() => setShowAvailabilityEditor(false)} title="Manage Availability" size="lg">
          <AvailabilityEditor
            trainerId={availabilityTrainerId}
            onClose={() => setShowAvailabilityEditor(false)}
            onSaved={() => {
              setShowAvailabilityEditor(false);
              fetchSessions();
            }}
          />
        </Modal>
      )}
      {showOverrideModal && availabilityTrainerId && (
        <AvailabilityOverrideModal
          trainerId={availabilityTrainerId}
          isOpen={showOverrideModal}
          onClose={() => setShowOverrideModal(false)}
          onCreated={fetchSessions}
        />
      )}
      {mode === 'admin' && (
        <ApplyPaymentModal
          open={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onApplied={fetchSessions}
        />
      )}
      <ConflictPanel
        isOpen={conflictModalOpen}
        conflicts={conflicts}
        alternatives={alternatives}
        onSelectAlternative={handleConflictAlternative}
        onOverride={canOverrideConflicts ? handleConflictOverride : undefined}
        onClose={() => {
          setConflictModalOpen(false);
          setPendingReschedule(null);
          setConflicts([]);
          setAlternatives([]);
        }}
        canOverride={canOverrideConflicts}
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

  /* Tablet */
  @media (max-width: 1024px) {
    height: auto;
    min-height: 100vh;
  }

  /* Mobile */
  @media (max-width: 480px) {
    height: 100dvh; /* Dynamic viewport height for mobile browsers */
  }
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
  flex-wrap: wrap;
  gap: 1rem;

  /* Tablet */
  @media (max-width: 1024px) {
    padding: 1.25rem 1.5rem;
  }

  /* Mobile */
  @media (max-width: 768px) {
    padding: 1rem;
    flex-direction: column;
    gap: 0.75rem;
    align-items: stretch;
  }

  @media (max-width: 480px) {
    padding: 0.75rem;
    gap: 0.5rem;
  }
`;

const StatsPanel = styled.div`
  margin: 1rem 2rem;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  flex-shrink: 0;

  /* Tablet */
  @media (max-width: 1024px) {
    margin: 0.75rem 1.5rem;
    padding: 1.25rem;
  }

  /* Mobile */
  @media (max-width: 768px) {
    margin: 0.5rem 1rem;
    padding: 1rem;
    border-radius: 10px;
  }

  @media (max-width: 480px) {
    margin: 0.5rem;
    padding: 0.75rem;
    border-radius: 8px;
  }
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

  @media (max-width: 480px) {
    padding: 0.625rem 0.75rem;
    gap: 0.5rem;
    font-size: 0.875rem;
    border-radius: 8px;
    margin-bottom: 0.75rem;
  }
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

  @media (max-width: 768px) {
    padding: 1.25rem;

    .stat-value {
      font-size: 1.75rem;
    }
  }

  @media (max-width: 480px) {
    padding: 1rem;

    .stat-value {
      font-size: 1.5rem;
    }
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
  -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */

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

  /* Tablet */
  @media (max-width: 1024px) {
    margin: 0 1.5rem 1.5rem;
    padding: 1.25rem;
  }

  /* Mobile */
  @media (max-width: 768px) {
    margin: 0 1rem 1rem;
    padding: 1rem;
    border-radius: 10px;
  }

  @media (max-width: 480px) {
    margin: 0 0.5rem 0.5rem;
    padding: 0.75rem;
    border-radius: 8px;
    /* Allow horizontal scroll on very small screens for week view */
    overflow-x: auto;
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

  /* Mobile */
  @media (max-width: 768px) {
    justify-content: flex-start;
    gap: 0.5rem 0.75rem;
  }

  @media (max-width: 480px) {
    gap: 0.4rem 0.6rem;
    font-size: 0.75rem;
  }
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
  flex-shrink: 0;
  ${props => props.$striped && `
    background-image: repeating-linear-gradient(
      45deg,
      rgba(255, 255, 255, 0.15),
      rgba(255, 255, 255, 0.15) 4px,
      rgba(0, 0, 0, 0.2) 4px,
      rgba(0, 0, 0, 0.2) 8px
    );
  `}

  @media (max-width: 480px) {
    width: 12px;
    height: 12px;
  }
`;

const DayCard = styled(Card)`
  padding: 1rem;
  text-align: center;
  min-height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: visible;

  /* Tablet */
  @media (max-width: 1024px) {
    min-height: 180px;
    padding: 0.875rem;
  }

  /* Mobile */
  @media (max-width: 768px) {
    min-height: 150px;
    padding: 0.75rem;
  }

  @media (max-width: 480px) {
    min-height: 120px;
    padding: 0.5rem;
  }
`;

const DayCardHeader = styled.div`
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  transition: all 150ms ease-out;
  width: 100%;
  min-height: 44px; /* Minimum touch target */

  &:hover {
    background: rgba(0, 255, 255, 0.1);
  }

  &:focus-visible {
    outline: 2px solid #00ffff;
    outline-offset: 2px;
  }

  /* Active state for touch */
  &:active {
    background: rgba(0, 255, 255, 0.15);
    transform: scale(0.98);
  }

  @media (max-width: 480px) {
    padding: 0.375rem;
  }
`;

const WeekSessionItem = styled.div`
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  width: 100%;
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
  min-height: 36px; /* Better touch target */
  transition: all 150ms ease;

  &:hover {
    background: rgba(37, 99, 235, 0.85);
  }

  &:focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }

  &:active {
    transform: scale(0.97);
    background: rgba(37, 99, 235, 0.95);
  }

  @media (max-width: 480px) {
    min-height: 40px;
    font-size: 0.75rem;
    padding: 0.4rem 0.5rem;
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

  @media (max-width: 480px) {
    padding: 0.75rem;
    border-radius: 8px;
    gap: 0.375rem;
  }
`;

const BookingRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;

  @media (max-width: 480px) {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }
`;

const CreditCard = styled.div`
  background: rgba(56, 189, 248, 0.12);
  border: 1px solid rgba(56, 189, 248, 0.35);
  border-radius: 10px;
  padding: 1rem;
  text-align: center;

  @media (max-width: 480px) {
    padding: 0.75rem;
    border-radius: 8px;
  }
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

  @media (max-width: 768px) {
    padding: 1.5rem;
  }

  @media (max-width: 480px) {
    padding: 1rem;
    height: 100dvh;
  }
`;
