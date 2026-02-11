/**
 * 🚀 UNIVERSAL MASTER SCHEDULE - REFACTORED VERSION
 * ================================================
 * Modularized version using custom sub-components and useCalendarData hook.
 * All MUI dependencies removed, fully accessible.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

// Services
import { universalMasterScheduleService } from '../../services/universal-master-schedule-service';

// Sub-components
import ScheduleHeader from './components/ScheduleHeader';
import ScheduleStats from './components/ScheduleStats';
import ScheduleCalendar from './components/ScheduleCalendar';
import ScheduleModals from './components/ScheduleModals';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import SessionTypeManager from './Config/SessionTypeManager';

// Hooks
import { useCalendarData } from './hooks/useCalendarData';
import { useSchedule } from '../../hooks/useSchedule';
import { useSessionCredits } from './hooks/useSessionCredits';
import { useToast } from '../../hooks/use-toast';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useSessionTemplates } from './hooks/useSessionTemplates';

// Redux: Layout & Density state
import { useDispatch, useSelector } from 'react-redux';
import {
  selectLayoutMode,
  selectDensity,
  selectExpandedTrainerIds,
  setLayoutMode,
  setDensity,
  toggleTrainerExpand
} from '../../redux/slices/scheduleSlice';
import type { LayoutMode, DensityMode } from './types';
import { useResponsiveLayout } from './hooks/useResponsiveLayout';

// UI Components
import {
  Spinner,
  BodyText,
  PrimaryHeading,
  Box,
  Modal
} from './ui';

// Types
import { DragDropResult } from './DragDrop/DragDropManager';
import { Alternative, Conflict } from './Conflicts/ConflictPanel';

interface UniversalMasterScheduleProps {
  adminMobileMenuOpen?: boolean;
  adminDeviceType?: 'mobile' | 'tablet' | 'desktop';
  mobileAdminMode?: boolean;
  mode?: 'admin' | 'trainer' | 'client';
  userId?: string | number;
}

// Mobile-First Breakpoints (Consistent with Theme)
const BREAKPOINTS = {
  MOBILE: '480px',
  TABLET: '768px',
  DESKTOP: '1024px'
};

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000';

const UniversalMasterSchedule: React.FC<UniversalMasterScheduleProps> = ({
  mode = 'admin',
  userId
}) => {
  // Production Data Hook
  const {
    sessions,
    clients,
    trainers,
    loading: dataLoading,
    initializeComponent,
    refreshData
  } = useCalendarData();

  // View State Hook
  const {
    activeView,
    currentDate,
    setView,
    setDate,
    drillDownToDay
  } = useSchedule();

  // Credits Hook
  const {
    data: credits,
    isLoading: creditsLoading,
    refetch: refetchCredits
  } = useSessionCredits(mode === 'client');

  const { success, error: toastError, warning } = useToast();
  const { templates, addTemplate, removeTemplate, applyTemplate } = useSessionTemplates();

  // Redux: Layout & Density
  const dispatch = useDispatch();
  const layoutMode = useSelector(selectLayoutMode);
  const density = useSelector(selectDensity);
  const expandedTrainerIds = useSelector(selectExpandedTrainerIds);

  // Auto-switch layout on mobile (only if user hasn't set a preference)
  const { suggestedLayout, suggestedDensity, isMobile } = useResponsiveLayout();
  useEffect(() => {
    // Only auto-switch if no saved preference in localStorage
    const savedLayout = localStorage.getItem('scheduleLayoutMode');
    if (!savedLayout && isMobile) {
      dispatch(setLayoutMode(suggestedLayout));
      dispatch(setDensity(suggestedDensity));
    }
  }, [isMobile, suggestedLayout, suggestedDensity, dispatch]);

  const handleLayoutModeChange = useCallback((mode: LayoutMode) => {
    dispatch(setLayoutMode(mode));
  }, [dispatch]);

  const handleDensityChange = useCallback((d: DensityMode) => {
    dispatch(setDensity(d));
  }, [dispatch]);

  const handleToggleTrainerExpand = useCallback((trainerId: string | number) => {
    dispatch(toggleTrainerExpand(trainerId));
  }, [dispatch]);

  // Local UI State
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRecurringDialog, setShowRecurringDialog] = useState(false);
  const [showBlockedDialog, setShowBlockedDialog] = useState(false);
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [detailSession, setDetailSession] = useState<any | null>(null);
  const [showSeriesDialog, setShowSeriesDialog] = useState(false);
  const [activeSeriesGroupId, setActiveSeriesGroupId] = useState<string | null>(null);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);
  const [pendingReschedule, setPendingReschedule] = useState<DragDropResult | null>(null);
  const [bookingTarget, setBookingTarget] = useState<any | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [showAvailabilityEditor, setShowAvailabilityEditor] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [availabilityTrainerId, setAvailabilityTrainerId] = useState<number | string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSessionTypeManager, setShowSessionTypeManager] = useState(false);
  const [showClientRecurringDialog, setShowClientRecurringDialog] = useState(false);
  const [isSlotSelected, setIsSlotSelected] = useState(false);

  const [formData, setFormData] = useState({
    sessionDate: '',
    duration: 60,
    location: 'Main Studio',
    notes: '',
    notifyClient: true,
    trainerId: undefined as string | number | undefined,
    clientId: undefined as string | number | undefined,
    manualClientName: ''
  });
  const [useManualClient, setUseManualClient] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  // MindBody Parity: Admin View Scope State
  // Persisted to localStorage for convenience
  const [adminViewScope, setAdminViewScope] = useState<'my' | 'global'>(() => {
    if (typeof window !== 'undefined' && mode === 'admin') {
      return (localStorage.getItem('adminScheduleViewScope') as 'my' | 'global') || 'global';
    }
    return 'global';
  });
  const [selectedTrainerId, setSelectedTrainerId] = useState<number | string | null>(null);

  // Handle admin scope change with localStorage persistence
  const handleAdminScopeChange = useCallback((scope: 'my' | 'global') => {
    setAdminViewScope(scope);
    if (typeof window !== 'undefined') {
      localStorage.setItem('adminScheduleViewScope', scope);
    }
    // Reset trainer filter when switching to 'my' mode
    const newTrainerId = scope === 'my' ? null : selectedTrainerId;
    if (scope === 'my') {
      setSelectedTrainerId(null);
    }
    // Trigger data refresh with new scope - pass filter options directly
    refreshData(false, {
      adminScope: scope,
      trainerId: newTrainerId?.toString() || '',
      clientId: '',
      status: 'all',
      dateRange: 'all',
      location: '',
      searchTerm: ''
    });
  }, [refreshData, selectedTrainerId]);

  // Handle trainer filter change
  const handleTrainerFilterChange = useCallback((trainerId: number | string | null) => {
    setSelectedTrainerId(trainerId);
    // Refresh data with new trainer filter - pass filter options directly
    refreshData(false, {
      adminScope: adminViewScope,
      trainerId: trainerId?.toString() || '',
      clientId: '',
      status: 'all',
      dateRange: 'all',
      location: '',
      searchTerm: ''
    });
  }, [refreshData, adminViewScope]);

  const isAnyModalOpen = [
    showCreateDialog,
    showRecurringDialog,
    showBlockedDialog,
    showNotificationDialog,
    showBookingDialog,
    showDetailDialog,
    showSeriesDialog,
    showAvailabilityEditor,
    showOverrideModal,
    showPaymentModal,
    showSessionTypeManager,
    showClientRecurringDialog,
    conflictModalOpen
  ].some(Boolean);

  // Permissions
  const resolvedUserId = userId
    ? (typeof userId === 'string' ? parseInt(userId, 10) || null : userId)
    : null;
  const canCreateSessions = mode === 'admin';
  const canCreateRecurring = mode === 'admin';
  const canBlockTime = mode === 'admin' || mode === 'trainer';
  const canQuickBook = mode === 'client';
  const canReschedule = mode === 'admin' || mode === 'trainer';
  const canOverrideConflicts = mode === 'admin';
  const canManageAvailability = mode === 'admin' || mode === 'trainer';
  const canManageSessionTypes = mode === 'admin';
  const sessionsRemaining = credits?.sessionsRemaining;
  const lowCredits = typeof sessionsRemaining === 'number' && sessionsRemaining < 3;

  // Initialization
  useEffect(() => {
    initializeComponent({ realTimeEnabled: true });
  }, [initializeComponent]);

  useKeyboardShortcuts({
    onCreateSession: () => {
      if (!canCreateSessions) return;
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
      setIsSlotSelected(false);
      setShowCreateDialog(true);
    },
    onToday: () => setDate(new Date()),
    onPrevious: () => {
      const prev = new Date(currentDate);
      const delta = activeView === 'month' ? 1 : activeView === 'day' ? 1 : 7;
      if (activeView === 'month') {
        prev.setMonth(prev.getMonth() - 1);
      } else {
        prev.setDate(prev.getDate() - delta);
      }
      setDate(prev);
    },
    onNext: () => {
      const next = new Date(currentDate);
      const delta = activeView === 'month' ? 1 : activeView === 'day' ? 1 : 7;
      if (activeView === 'month') {
        next.setMonth(next.getMonth() + 1);
      } else {
        next.setDate(next.getDate() + delta);
      }
      setDate(next);
    },
    onCloseModal: () => {
      setShowCreateDialog(false);
      setShowRecurringDialog(false);
      setShowBlockedDialog(false);
      setShowNotificationDialog(false);
      setShowBookingDialog(false);
      setShowDetailDialog(false);
      setShowSeriesDialog(false);
      setShowAvailabilityEditor(false);
      setShowOverrideModal(false);
      setShowPaymentModal(false);
      setShowSessionTypeManager(false);
      setConflictModalOpen(false);
    },
    isModalOpen: isAnyModalOpen
  });

  // Handlers
  const handleCreateSession = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        warning('Please log in to create sessions.');
        return;
      }

      if (!formData.sessionDate) {
        warning('Please select a date and time.');
        return;
      }

      const startDate = new Date(formData.sessionDate);

      // Validate date is in the future (admin can bypass this check)
      const now = new Date();
      if (startDate < now && mode !== 'admin') {
        warning('Cannot create sessions in the past. Please select a future date and time.');
        return;
      }

      const endDate = new Date(startDate.getTime() + formData.duration * 60000);

      const sessionData = {
        sessionDate: startDate.toISOString(),
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        duration: formData.duration,
        location: formData.location,
        notes: formData.notes,
        trainerId: formData.trainerId || null,
        userId: formData.clientId || null,
        clientName: useManualClient ? formData.manualClientName : undefined,
        notifyClient: formData.notifyClient,
        status: 'available'
      };

      const result = await universalMasterScheduleService.createAvailableSessions([{
        start: sessionData.startTime,
        duration: sessionData.duration,
        trainerId: sessionData.trainerId?.toString(),
        userId: formData.clientId?.toString(),
        clientName: useManualClient ? formData.manualClientName : undefined,
        location: sessionData.location,
        notes: sessionData.notes,
        notifyClient: formData.notifyClient
      }]);

      // Check for sessions array OR data object (backend returns both now)
      if (result.sessions || result) {
        success('Session created successfully!');
        setShowCreateDialog(false);
        setIsSlotSelected(false);
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
        refreshData(true);
      } else {
        toastError('Session may have been created but could not be confirmed. Please refresh.');
      }
    } catch (error: any) {
      console.error('Error creating session:', error);
      // Show actual server error message if available
      const errorMessage = error?.response?.data?.message
        || error?.message
        || 'Error creating session. Please try again.';
      toastError(errorMessage);
    }
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;
    const template = applyTemplate(templateId);
    if (!template) return;
    setFormData((prev) => ({
      ...prev,
      duration: template.duration,
      location: template.location,
      notes: template.notes || prev.notes
    }));
  };

  const handleSaveTemplate = (name: string) => {
    if (!name) return;
    addTemplate({
      name,
      duration: formData.duration,
      location: formData.location,
      notes: formData.notes || undefined
    });
    success('Template saved.');
  };

  const handleDeleteTemplate = (id: string) => {
    removeTemplate(id);
    if (selectedTemplateId === id) {
      setSelectedTemplateId('');
    }
    success('Template deleted.');
  };

  const handleBookSession = async () => {
    if (!bookingTarget) return;

    setBookingError(null);
    setBookingLoading(true);

    const token = localStorage.getItem('token');
    if (!token) {
      setBookingError('Please log in to book sessions.');
      setBookingLoading(false);
      return;
    }

    try {
      const result = await universalMasterScheduleService.bookSession(bookingTarget.id.toString());

      if (!result.success) {
        setBookingError(result.message || 'Failed to book session.');
        setBookingLoading(false);
        return;
      }

      setShowBookingDialog(false);
      setBookingTarget(null);
      refreshData(true);
      if (mode === 'client') {
        refetchCredits();
      }
    } catch (error: any) {
      console.error('Error booking session:', error);
      setBookingError('Failed to book session. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  const checkConflicts = useCallback(async (
    sessionId: string | number,
    newDate: Date,
    newHour: number,
    trainerId?: string | number
  ) => {
    const token = localStorage.getItem('token');
    if (!token) return { conflicts: [], alternatives: [] };

    const session = sessions.find((item) => String(item.id) === String(sessionId));
    const duration = session?.duration ?? 60;
    const startTime = new Date(newDate);
    startTime.setHours(newHour, 0, 0, 0);
    const endTime = new Date(startTime.getTime() + duration * 60000);

    try {
      // Note: universalMasterScheduleService doesn't have checkConflicts yet,
      // but we can use the api instance from it or keep fetch for now if it's a custom endpoint.
      // Given the goal is production readiness, I'll keep the fetch but use the token from service if possible.
      const response = await fetch(`${API_BASE_URL}/api/sessions/check-conflicts`, {
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
      if (!response.ok) return { conflicts: [], alternatives: [] };

      return {
        conflicts: result?.conflicts || [],
        alternatives: (result?.alternatives || []).map((alt: any) => ({
          ...alt,
          date: new Date(alt.date)
        }))
      };
    } catch (error) {
      console.error('Conflict check failed:', error);
      return { conflicts: [], alternatives: [] };
    }
  }, [sessions]);

  const handleReschedule = useCallback(async (
    drop: DragDropResult,
    options: { conflictOverride?: boolean } = {}
  ) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const session = sessions.find((item) => String(item.id) === String(drop.sessionId));
    const duration = session?.duration ?? 60;
    const startTime = new Date(drop.newDate);
    startTime.setHours(drop.newHour, 0, 0, 0);
    const endTime = new Date(startTime.getTime() + duration * 60000);

    try {
      // Note: universalMasterScheduleService doesn't have reschedule yet,
      // keeping fetch for now but ensuring it's consistent.
      const response = await fetch(`${API_BASE_URL}/api/sessions/${drop.sessionId}/reschedule`, {
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
        setConflicts(result?.conflicts || []);
        setAlternatives((result?.alternatives || []).map((alt: any) => ({
          ...alt,
          date: new Date(alt.date)
        })));
        setPendingReschedule(drop);
        setConflictModalOpen(true);
        return;
      }

      if (response.ok) {
        refreshData(true);
      }
    } catch (error) {
      console.error('Reschedule request failed:', error);
    }
  }, [sessions, refreshData]);

  const handleSelectSlot = useCallback(
    ({ hour, trainerId }: { hour: number; trainerId?: string | number }) => {
      if (!canCreateSessions) return;

      const slotDate = new Date(currentDate);
      slotDate.setHours(hour, 0, 0, 0);

      // Prevent creating sessions in the past (admin can bypass this check)
      const now = new Date();
      if (slotDate < now && mode !== 'admin') {
        warning('Cannot create sessions in the past. Please select a future time slot.');
        return;
      }

      const toDateTimeLocal = (date: Date) => {
        const pad = (num: number) => String(num).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
      };

      setFormData((prev) => ({
        ...prev,
        sessionDate: toDateTimeLocal(slotDate),
        trainerId
      }));
      setIsSlotSelected(true);
      setShowCreateDialog(true);
    },
    [canCreateSessions, currentDate]
  );

  const handleBookingDialog = useCallback((session: any) => {
    setBookingTarget(session);
    setBookingError(null);
    setShowBookingDialog(true);
  }, []);

  const handleOpenConflictPanel = useCallback((
    nextConflicts: Conflict[],
    nextAlternatives: Alternative[],
    drop: DragDropResult
  ) => {
    setConflicts(nextConflicts);
    setAlternatives(nextAlternatives);
    setPendingReschedule(drop);
    setConflictModalOpen(true);
  }, []);

  // Memoized handler for selecting a session (opens detail dialog)
  const handleSelectSession = useCallback((session: any) => {
    setDetailSession(session);
    setShowDetailDialog(true);
  }, []);

  // Memoized handler for opening series dialog
  const openSeriesDialog = useCallback((groupId: string) => {
    setActiveSeriesGroupId(groupId);
    setShowSeriesDialog(true);
  }, []);

  const creditsDisplay = creditsLoading
    ? '...'
    : (typeof sessionsRemaining === 'number' ? sessionsRemaining : '--');

  const seriesSessions = activeSeriesGroupId
    ? sessions.filter((session) => session.recurringGroupId === activeSeriesGroupId)
    : [];

  // Filter available sessions for client recurring booking modal
  const availableSessions = useMemo(() =>
    sessions.filter((session: any) => session.status === 'available'),
    [sessions]
  );

  if (dataLoading.sessions && sessions.length === 0) {
    return <Spinner size={60} text="Loading Schedule..." fullscreen />;
  }

  return (
    <ErrorBoundary>
    <ScheduleContainer role="application" aria-label="Universal Master Schedule">
      <ScheduleHeader
        mode={mode}
        activeView={activeView}
        currentDate={currentDate}
        onViewChange={setView}
        onDateChange={setDate}
        onRefresh={() => refreshData(true)}
        onOpenNotifications={() => setShowNotificationDialog(true)}
        onOpenAvailability={() => {
          const tId = mode === 'trainer' ? resolvedUserId : (userId ?? null);
          setAvailabilityTrainerId(tId);
          setShowAvailabilityEditor(true);
        }}
        onOpenBlocked={() => setShowBlockedDialog(true)}
        onOpenRecurring={() => setShowRecurringDialog(true)}
        onOpenPayment={() => setShowPaymentModal(true)}
        onOpenSessionTypes={() => setShowSessionTypeManager(true)}
        onOpenClientRecurring={() => setShowClientRecurringDialog(true)}
        onOpenCreate={() => {
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
          setIsSlotSelected(false);
          setSelectedTemplateId('');
          setShowCreateDialog(true);
        }}
        canManageAvailability={canManageAvailability}
        canBlockTime={canBlockTime}
        canCreateRecurring={canCreateRecurring}
        canCreateSessions={canCreateSessions}
        canManageSessionTypes={canManageSessionTypes}
        // MindBody Parity: Admin View Scope
        adminViewScope={adminViewScope}
        onAdminViewScopeChange={handleAdminScopeChange}
        trainers={trainers}
        selectedTrainerId={selectedTrainerId}
        onTrainerFilterChange={handleTrainerFilterChange}
        // Layout & Density toggles
        layoutMode={layoutMode}
        onLayoutModeChange={handleLayoutModeChange}
        density={density}
        onDensityChange={handleDensityChange}
      />

      <ScheduleStats
        mode={mode}
        sessions={sessions}
        creditsDisplay={creditsDisplay}
        lowCredits={lowCredits}
      />

      <ScheduleCalendar
        activeView={activeView}
        currentDate={currentDate}
        sessions={sessions}
        trainers={trainers}
        canReschedule={canReschedule}
        canQuickBook={canQuickBook}
        isAdmin={mode === 'admin'}
        onDrillDown={drillDownToDay}
        onSelectSession={handleSelectSession}
        onSelectSlot={handleSelectSlot}
        onBookingDialog={handleBookingDialog}
        checkConflicts={checkConflicts}
        handleReschedule={handleReschedule}
        openConflictPanel={handleOpenConflictPanel}
        // Stacked view props
        layoutMode={layoutMode}
        density={density}
        expandedTrainerIds={expandedTrainerIds}
        onToggleTrainerExpand={handleToggleTrainerExpand}
      />

      <ScheduleModals
        mode={mode}
        showCreateDialog={showCreateDialog}
        setShowCreateDialog={setShowCreateDialog}
        showRecurringDialog={showRecurringDialog}
        setShowRecurringDialog={setShowRecurringDialog}
        showBlockedDialog={showBlockedDialog}
        setShowBlockedDialog={setShowBlockedDialog}
        showNotificationDialog={showNotificationDialog}
        setShowNotificationDialog={setShowNotificationDialog}
        showBookingDialog={showBookingDialog}
        setShowBookingDialog={setShowBookingDialog}
        showDetailDialog={showDetailDialog}
        setShowDetailDialog={setShowDetailDialog}
        showSeriesDialog={showSeriesDialog}
        setShowSeriesDialog={setShowSeriesDialog}
        showAvailabilityEditor={showAvailabilityEditor}
        setShowAvailabilityEditor={setShowAvailabilityEditor}
        showOverrideModal={showOverrideModal}
        setShowOverrideModal={setShowOverrideModal}
        showPaymentModal={showPaymentModal}
        setShowPaymentModal={setShowPaymentModal}
        conflictModalOpen={conflictModalOpen}
        setConflictModalOpen={setConflictModalOpen}
        showClientRecurringDialog={showClientRecurringDialog}
        setShowClientRecurringDialog={setShowClientRecurringDialog}
        formData={formData}
        setFormData={setFormData}
        dbTrainers={trainers}
        dbClients={clients}
        useManualClient={useManualClient}
        setUseManualClient={setUseManualClient}
        templates={templates}
        selectedTemplateId={selectedTemplateId}
        onTemplateChange={handleTemplateChange}
        onSaveTemplate={handleSaveTemplate}
        onDeleteTemplate={handleDeleteTemplate}
        isSlotSelected={isSlotSelected}
        bookingTarget={bookingTarget}
        bookingLoading={bookingLoading}
        bookingError={bookingError}
        creditsDisplay={creditsDisplay}
        sessionsRemaining={sessionsRemaining}
        availableSessions={availableSessions}
        detailSession={detailSession}
        activeSeriesGroupId={activeSeriesGroupId}
        seriesSessions={seriesSessions}
        availabilityTrainerId={availabilityTrainerId}
        conflicts={conflicts}
        setConflicts={setConflicts}
        alternatives={alternatives}
        canOverrideConflicts={canOverrideConflicts}
        handleCreateSession={handleCreateSession}
        handleBookSession={handleBookSession}
        handleConflictAlternative={(alt) => {
          if (!pendingReschedule) return;
          setConflictModalOpen(false);
          setPendingReschedule(null);
          handleReschedule({ ...pendingReschedule, newDate: alt.date, newHour: alt.hour });
        }}
        handleConflictOverride={() => {
          if (!pendingReschedule) return;
          setConflictModalOpen(false);
          setPendingReschedule(null);
          handleReschedule(pendingReschedule, { conflictOverride: true });
        }}
        fetchSessions={() => refreshData(true)}
        openSeriesDialog={openSeriesDialog}
      />

      {showSessionTypeManager && (
        <Modal
          isOpen={showSessionTypeManager}
          onClose={() => setShowSessionTypeManager(false)}
          title="Session Types"
          size="lg"
        >
          <SessionTypeManager />
        </Modal>
      )}
    </ScheduleContainer>
    </ErrorBoundary>
  );
};

export default UniversalMasterSchedule;

const ScheduleContainer = styled.div`
  /* Fit within parent container - parent controls viewport height */
  height: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
  color: white;
  /* Allow overflow on Y for scrollable content */
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  /* Prevent scroll chaining to parent - fixes "gummy" feel on mobile */
  overscroll-behavior: contain;
  /* GPU layer promotion for smooth scrolling */
  transform: translateZ(0);

  @media (max-width: ${BREAKPOINTS.TABLET}) {
    /* Use simpler background on mobile */
    background: #0f172a;
    /* On tablet/mobile, allow content to determine height */
    height: auto;
    min-height: 100%;
  }

  @media (max-width: ${BREAKPOINTS.MOBILE}) {
    /* On mobile, let content flow naturally */
    height: auto;
    min-height: auto;
  }
`;
