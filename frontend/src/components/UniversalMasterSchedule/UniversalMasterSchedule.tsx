/**
 * 🚀 UNIVERSAL MASTER SCHEDULE - REFACTORED VERSION
 * ================================================
 * Modularized version using custom sub-components and useCalendarData hook.
 * All MUI dependencies removed, fully accessible.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// Services
import { universalMasterScheduleService } from '../../services/universal-master-schedule-service';

// Sub-components
import ScheduleHeader from './components/ScheduleHeader';
import ScheduleDayStrip from './components/ScheduleDayStrip';
import ScheduleLensFrame from './ScheduleLensFrame';
import ErrorNote from '../ui/ErrorNote';
import ScheduleStats from './components/ScheduleStats';
import ScheduleCalendar from './components/ScheduleCalendar';
import ScheduleModals from './components/ScheduleModals';
import ClientTimeline from './components/ClientTimeline';
import BookingDrawer from './components/BookingDrawer';
import ScheduleAiOperatorDock from './ScheduleAiOperatorDock';
import TrainingPlanProjectionLayer from './TrainingPlanProjectionLayer';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import SessionTypeManager from './Config/SessionTypeManager';

// Hooks
import { useCalendarData } from './hooks/useCalendarData';
import { useSchedule } from '../../hooks/useSchedule';
import { useSessionCredits } from './hooks/useSessionCredits';
import { useToast } from '../../hooks/use-toast';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useSessionTemplates } from './hooks/useSessionTemplates';
import { normalizeScheduleOptionalId, parseScheduleUserId } from './UniversalMasterSchedule.logic';
import { buildScheduleTrainerScope } from './utils/trainerScope';
import { isNonDeductingClientSource } from '../DashBoard/workspaces/clients-team/clientSessionSignal';
import { buildScheduleSlotDate } from './utils/scheduleTimeSlots';

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
import { Spinner, Modal } from './ui';

// Types
import { DragDropResult } from './DragDrop/DragDropManager';
import { Alternative, Conflict } from './Conflicts/ConflictPanel';
import { logger } from '@/utils/logger';

interface UniversalMasterScheduleProps {
  adminMobileMenuOpen?: boolean;
  adminDeviceType?: 'mobile' | 'tablet' | 'desktop';
  mobileAdminMode?: boolean;
  mode?: 'admin' | 'trainer' | 'client';
  userId?: string | number;
}

// Responsive Breakpoints (10-point matrix per CLAUDE.md)
const BREAKPOINTS = {
  SMALL_PHONE: '320px',
  PHONE: '375px',
  LARGE_PHONE: '430px',
  MOBILE: '480px',
  TABLET: '768px',
  DESKTOP: '1024px',
  QHD: '2560px',
  UHD: '3840px'
};

const UniversalMasterSchedule: React.FC<UniversalMasterScheduleProps> = ({
  mode: modeProp,
  userId: userIdProp
}) => {
  // Derive mode from auth context when not explicitly passed (route-level safety)
  const { user } = useAuth();
  const mode = modeProp || (
    user?.role === 'admin' ? 'admin' :
    user?.role === 'trainer' ? 'trainer' :
    'client'
  );
  const userId = userIdProp ?? user?.id;

  // Production Data Hook
  const {
    sessions,
    clients,
    trainers,
    loading: dataLoading,
    scheduleError,
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

  // MindBody Parity: Admin View Scope State
  // Defaults to 'my' so admins see only their own sessions first
  // Persisted to localStorage for convenience
  // NOTE: Must be declared before scopedSessions useMemo which depends on it
  const [adminViewScope, setAdminViewScope] = useState<'my' | 'global'>(() => {
    if (typeof window !== 'undefined' && mode === 'admin') {
      return (localStorage.getItem('adminScheduleViewScope') as 'my' | 'global') || 'my';
    }
    return 'my';
  });
  const [selectedTrainerId, setSelectedTrainerId] = useState<number | string | null>(null);

  // KPI card status filter (composes with existing admin scope / trainer filters)
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const handleStatusFilterChange = useCallback((status: string | null) => {
    setStatusFilter(prev => prev === status ? null : status);
  }, []);

  const trainerScope = useMemo(() => buildScheduleTrainerScope({
    mode,
    adminViewScope,
    currentUser: user as any,
    trainers: trainers as any[],
    sessions: sessions as any[],
    selectedTrainerId,
  }), [mode, adminViewScope, user, trainers, sessions, selectedTrainerId]);

  const scopedSessions = trainerScope.displaySessions;

  // Then: apply KPI status filter on top of scoped sessions
  const displaySessions = useMemo(() => {
    if (!statusFilter || statusFilter === 'total') return scopedSessions;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const isUpcoming = (s: any): boolean => {
      const date = s.sessionDate || s.start || s.startTime;
      if (!date) return true;
      return new Date(date) >= startOfToday;
    };
    const KNOWN_STATUSES = ['available', 'scheduled', 'confirmed', 'completed'];
    const filters: Record<string, (s: any) => boolean> = {
      scheduled: (s) => (s.status === 'scheduled' || s.status === 'confirmed') && isUpcoming(s),
      available: (s) => s.status === 'available' && isUpcoming(s),
      other: (s) => !s.status || !KNOWN_STATUSES.includes(s.status),
    };
    const filterFn = filters[statusFilter] || ((s: any) => s.status === statusFilter);
    return scopedSessions.filter(filterFn);
  }, [scopedSessions, statusFilter]);

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

  // Loading states for async operations
  const [, setIsCreatingSession] = useState(false);
  const [, setIsQuickBooking] = useState(false);

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
  const [availabilityTrainerId, setAvailabilityTrainerId] = useState<number | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSessionTypeManager, setShowSessionTypeManager] = useState(false);
  const [showClientRecurringDialog, setShowClientRecurringDialog] = useState(false);
  const [isSlotSelected, setIsSlotSelected] = useState(false);
  const [showQuickBookDrawer, setShowQuickBookDrawer] = useState(false);
  const [quickBookSlot, setQuickBookSlot] = useState<{ date: Date; duration: number; location: string; trainerId?: string | number; trainerName?: string } | null>(null);

  const [formData, setFormData] = useState({
    sessionDate: '',
    duration: 60,
    location: 'Main Studio',
    notes: '',
    notifyClient: true,
    trainerId: undefined as string | number | undefined,
    clientId: undefined as string | number | undefined,
    manualClientName: '',
    sessionTypeId: undefined as string | number | undefined,
    bufferBefore: undefined as number | undefined,
    bufferAfter: undefined as number | undefined
  });
  const [useManualClient, setUseManualClient] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

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
    } else {
      setView('day');
      dispatch(setLayoutMode('columns'));
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
  }, [refreshData, selectedTrainerId, setView, dispatch]);

  // Handle trainer filter change
  const handleTrainerFilterChange = useCallback((trainerId: number | string | null) => {
    setSelectedTrainerId(trainerId);
    setView('day');
    dispatch(setLayoutMode('columns'));
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
  }, [refreshData, adminViewScope, setView, dispatch]);

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
  const resolvedUserId = parseScheduleUserId(userId);
  const canCreateSessions = mode === 'admin';
  const canCreateRecurring = mode === 'admin';
  const canBlockTime = mode === 'admin' || mode === 'trainer';
  const canQuickBook = mode === 'admin';
  const canReschedule = mode === 'admin' || mode === 'trainer';
  const canOverrideConflicts = mode === 'admin';
  const canManageAvailability = mode === 'admin' || mode === 'trainer';
  const canManageSessionTypes = mode === 'admin';
  const sessionsRemaining = credits?.sessionsRemaining;
  const clientSource = credits?.clientSource ?? user?.clientSource ?? null;
  const canUseClientRecurringBooking = mode === 'client' && !isNonDeductingClientSource(clientSource);
  const lowCredits = sessionsRemaining != null && sessionsRemaining < 3;

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
        manualClientName: '',
        sessionTypeId: undefined,
        bufferBefore: undefined,
        bufferAfter: undefined
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

    const trainerIdForPayload = normalizeScheduleOptionalId(formData.trainerId);
    const clientIdForPayload = normalizeScheduleOptionalId(formData.clientId);
    const sessionTypeIdForPayload = normalizeScheduleOptionalId(formData.sessionTypeId);

    if (trainerIdForPayload == null) {
      warning('Select a valid trainer before creating this session.');
      return;
    }

    if (!useManualClient && clientIdForPayload == null) {
      warning('Select a valid client or switch to manual client entry.');
      return;
    }

    if (sessionTypeIdForPayload == null) {
      warning('Select a valid session type before creating this session.');
      return;
    }

    setIsCreatingSession(true);
    try {
      new Date(startDate.getTime() + formData.duration * 60000);

      const result = useManualClient
        ? await universalMasterScheduleService.createAvailableSessions([{
            start: startDate.toISOString(),
            duration: formData.duration,
            trainerId: String(trainerIdForPayload),
            clientName: formData.manualClientName,
            location: formData.location,
            notes: formData.notes,
            sessionTypeId: sessionTypeIdForPayload,
            notifyClient: formData.notifyClient
          }])
        : await universalMasterScheduleService.bookSessionForClient({
            clientId: clientIdForPayload as number,
            sessionDate: startDate.toISOString(),
            duration: formData.duration,
            trainerId: trainerIdForPayload,
            location: formData.location,
            notes: formData.notes,
            sessionTypeId: sessionTypeIdForPayload,
            notifyClient: formData.notifyClient
          });

      if (result) {
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
          manualClientName: '',
          sessionTypeId: undefined,
          bufferBefore: undefined,
          bufferAfter: undefined
        });
        setUseManualClient(false);
        if (statusFilter && statusFilter !== 'total') {
          setStatusFilter(null);
        }
        refreshData(true);
      } else {
        toastError('Session may have been created but could not be confirmed. Please refresh.');
      }
    } catch (error: any) {
      console.error('Error creating session:', error);
      const errorMessage = error?.response?.data?.message
        || error?.message
        || 'Error creating session. Please try again.';
      toastError(errorMessage);
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;
    const template = applyTemplate(templateId);
    if (!template) {
      warning('Template not found. It may have been deleted.');
      logger.warn('[Schedule] Template not found:', templateId);
      return;
    }

    setFormData((prev: typeof formData) => ({
      ...prev,
      duration: template.duration,
      location: template.location,
      notes: template.notes || prev.notes,
      ...(template.sessionTypeId && { sessionTypeId: template.sessionTypeId }),
      ...(template.trainerId && { trainerId: template.trainerId }),
      ...(template.bufferBefore !== undefined && { bufferBefore: template.bufferBefore }),
      ...(template.bufferAfter !== undefined && { bufferAfter: template.bufferAfter }),
    }));

    success(`Template "${template.name}" applied.`);
  };

  const handleSaveTemplate = (name: string) => {
    if (!name) return;
    const templateSessionTypeId = normalizeScheduleOptionalId(formData.sessionTypeId);
    const templateTrainerId = normalizeScheduleOptionalId(formData.trainerId);
    addTemplate({
      name,
      duration: formData.duration,
      location: formData.location,
      notes: formData.notes || undefined,
      ...(templateSessionTypeId ? { sessionTypeId: templateSessionTypeId } : {}),
      ...(templateTrainerId ? { trainerId: templateTrainerId } : {}),
      ...(formData.bufferBefore !== undefined && { bufferBefore: Number(formData.bufferBefore) }),
      ...(formData.bufferAfter !== undefined && { bufferAfter: Number(formData.bufferAfter) }),
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
    newMinute = 0,
    trainerId?: string | number
  ) => {
    const session = sessions.find((item) => String(item.id) === String(sessionId));
    const duration = session?.duration ?? 60;
    const startTime = buildScheduleSlotDate(newDate, newHour, newMinute);
    const endTime = new Date(startTime.getTime() + duration * 60000);

    return universalMasterScheduleService.checkConflicts({
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      trainerId: trainerId ?? session?.trainerId ?? null,
      clientId: session?.userId ?? null,
      excludeSessionId: sessionId
    });
  }, [sessions]);

  const handleReschedule = useCallback(async (
    drop: DragDropResult,
    options: { conflictOverride?: boolean } = {}
  ) => {
    const session = sessions.find((item) => String(item.id) === String(drop.sessionId));
    const duration = session?.duration ?? 60;
    const startTime = buildScheduleSlotDate(drop.newDate, drop.newHour, drop.newMinute ?? 0);
    const endTime = new Date(startTime.getTime() + duration * 60000);

    try {
      const result = await universalMasterScheduleService.rescheduleSession(drop.sessionId, {
        newStartTime: startTime.toISOString(),
        newEndTime: endTime.toISOString(),
        trainerId: drop.trainerId ?? session?.trainerId ?? null,
        notifyClient: session?.notifyClient ?? true,
        conflictOverride: options.conflictOverride === true
      });

      if (result.status === 409) {
        setConflicts(result.conflicts || []);
        setAlternatives(result.alternatives || []);
        setPendingReschedule(drop);
        setConflictModalOpen(true);
        return;
      }

      if (result.success) {
        refreshData(true);
      }
    } catch (error) {
      console.error('Reschedule request failed:', error);
    }
  }, [sessions, refreshData]);

  useCallback(
    ({ date, hour, minute = 0, trainerId }: { date?: Date; hour: number; minute?: number; trainerId?: string | number }) => {
      if (!canCreateSessions) return;

      const slotDate = buildScheduleSlotDate(date ?? currentDate, hour, minute);

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
    [canCreateSessions, currentDate, mode, warning]
  );

  const handleBookingDialog = useCallback((session: any) => {
    setBookingTarget(session);
    setBookingError(null);
    setShowBookingDialog(true);
  }, []);

  // "Swan Glide" Quick-Book: admin/trainer clicks slot -> drawer opens -> pick client -> confirm
  const handleQuickBookSlot = useCallback(
    ({ date, hour, minute = 0, trainerId }: { date?: Date; hour: number; minute?: number; trainerId?: string | number }) => {
      if (!canCreateSessions) return;
      const slotDate = buildScheduleSlotDate(date ?? currentDate, hour, minute);
      const trainer = trainers.find((t: any) => String(t.id) === String(trainerId));
      const trainerName = trainer ? `${trainer.firstName} ${trainer.lastName}` : undefined;
      setQuickBookSlot({ date: slotDate, duration: 60, location: 'Main Studio', trainerId, trainerName });
      setShowQuickBookDrawer(true);
    },
    [canCreateSessions, currentDate, trainers]
  );

  const handleQuickBookConfirm = useCallback(async (clientId: string | number) => {
    if (!quickBookSlot) return;
    const quickBookClientId = normalizeScheduleOptionalId(clientId);
    const quickBookTrainerId = normalizeScheduleOptionalId(quickBookSlot.trainerId);

    if (quickBookClientId == null) {
      toastError('Select a valid client before booking this session.');
      return;
    }

    if (quickBookTrainerId == null) {
      toastError('Select a valid trainer before booking this session.');
      return;
    }

    setIsQuickBooking(true);
    try {
      const slotDate = quickBookSlot.date;
      await universalMasterScheduleService.bookSessionForClient({
        clientId: quickBookClientId,
        sessionDate: slotDate.toISOString(),
        duration: quickBookSlot.duration,
        trainerId: quickBookTrainerId,
        location: quickBookSlot.location,
        notifyClient: true,
      });
      success('Session booked!');
      setShowQuickBookDrawer(false);
      setQuickBookSlot(null);
      refreshData(true);
      if (mode === 'client') refetchCredits();
    } catch (error: any) {
      console.error('Quick book failed:', error);
      toastError(error?.response?.data?.message || error?.message || 'Failed to book session.');
    } finally {
      setIsQuickBooking(false);
    }
  }, [quickBookSlot, refreshData, mode, refetchCredits, success, toastError]);

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
    : (sessionsRemaining ?? '--');

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
    <ScheduleLensFrame>
    <ScheduleContainer role="application" aria-label="Universal Master Schedule">
      {/* Honest-state: fetch failures never masquerade as an empty OR fresh calendar. */}
      {scheduleError && (
        <ErrorNote onRetry={() => refreshData(true)}>
          {sessions.length === 0
            ? `Couldn't load the schedule: ${scheduleError}`
            : 'Schedule may be out of date — the last refresh failed. Showing last-loaded sessions.'}
        </ErrorNote>
      )}
      <ScheduleMotionContent
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
      <ScheduleHeader
        mode={mode}
        activeView={activeView}
        currentDate={currentDate}
        onViewChange={setView}
        onDateChange={setDate}
        onRefresh={() => refreshData(true)}
        onOpenNotifications={() => setShowNotificationDialog(true)}
        onOpenAvailability={() => {
          const tId = resolvedUserId;
          setAvailabilityTrainerId(tId);
          if (tId) {
            setShowAvailabilityEditor(true);
          }
        }}
        onOpenBlocked={() => setShowBlockedDialog(true)}
        onOpenRecurring={() => setShowRecurringDialog(true)}
        onOpenPayment={() => setShowPaymentModal(true)}
        onOpenSessionTypes={() => setShowSessionTypeManager(true)}
        onOpenClientRecurring={canUseClientRecurringBooking ? () => setShowClientRecurringDialog(true) : undefined}
        onOpenCreate={() => {
          setFormData({
            sessionDate: '',
            duration: 60,
            location: 'Main Studio',
            notes: '',
            notifyClient: true,
            trainerId: undefined,
            clientId: undefined,
            manualClientName: '',
            sessionTypeId: undefined,
            bufferBefore: undefined,
            bufferAfter: undefined
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
        currentUser={user ? { firstName: user.firstName || '', lastName: user.lastName || '', profileImageUrl: (user as any).profileImageUrl } : undefined}
        headerTitle={trainerScope.headerTitle}
        headerSubtitle={trainerScope.headerSubtitle}
        headerImageUrl={trainerScope.headerImageUrl}
      />

      <ScheduleStats
        mode={mode}
        sessions={displaySessions}
        creditsDisplay={creditsDisplay}
        sessionsRemaining={sessionsRemaining}
        clientSource={clientSource}
        lowCredits={lowCredits}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
      />

      <ScheduleAiOperatorDock
        mode={mode}
        activeView={activeView}
        currentDate={currentDate}
        sessions={displaySessions as Array<Record<string, unknown>>}
        selectedTrainerId={selectedTrainerId}
        adminViewScope={adminViewScope}
      />
      <TrainingPlanProjectionLayer
        mode={mode}
        activeView={activeView}
        currentDate={currentDate}
        clients={clients}
        sessions={displaySessions}
        clientRosterLoading={dataLoading.clients}
        trainerFilterId={
          mode === 'admin'
            ? adminViewScope === 'my' ? resolvedUserId : selectedTrainerId
            : null
        }
      />
      {mode === 'client' ? (
        <ClientTimeline
          sessions={displaySessions as any}
          onBook={handleBookingDialog}
          onSelect={handleSelectSession}
          creditsDisplay={creditsDisplay}
        />
      ) : (
        <>
        <ScheduleDayStrip
          currentDate={currentDate}
          sessions={displaySessions}
          onSelectDay={drillDownToDay}
        />
        <ScheduleCalendar
          activeView={activeView}
          currentDate={currentDate}
          sessions={displaySessions}
          trainers={trainerScope.calendarTrainers}
          canReschedule={canReschedule}
          canQuickBook={canQuickBook}
          isAdmin={mode === 'admin'}
          onDrillDown={drillDownToDay}
          onSelectSession={handleSelectSession}
          onSelectSlot={handleQuickBookSlot}
          onBookingDialog={handleBookingDialog}
          checkConflicts={checkConflicts}
          handleReschedule={handleReschedule}
          openConflictPanel={handleOpenConflictPanel}
          layoutMode={layoutMode}
          density={density}
          expandedTrainerIds={expandedTrainerIds}
          onToggleTrainerExpand={handleToggleTrainerExpand}
        />
        </>
      )}

      <BookingDrawer
        isOpen={showQuickBookDrawer}
        onClose={() => { setShowQuickBookDrawer(false); setQuickBookSlot(null); }}
        onConfirm={handleQuickBookConfirm}
        slotDate={quickBookSlot?.date ?? null}
        slotDuration={quickBookSlot?.duration ?? 60}
        onDurationChange={(d) => setQuickBookSlot(prev => prev ? { ...prev, duration: d } : prev)}
        slotLocation={quickBookSlot?.location ?? 'Main Studio'}
        trainerName={quickBookSlot?.trainerName}
        clients={clients}
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
        clientSource={clientSource}
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
      </ScheduleMotionContent>
    </ScheduleContainer>
    </ScheduleLensFrame>
    </ErrorBoundary>
  );
};

export default UniversalMasterSchedule;


const ScheduleMotionContent = styled(motion.div)`
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
`;

const ScheduleContainer = styled.div`
  --shell-chrome: 80px;
  display: flex;
  flex-direction: column;

  /* Theme-synced depth background.
     NOTE: background-attachment: fixed was removed — inside a scroller iOS
     repaints these gradients on every scrolled frame (gummy scroll). */
  background-color: var(--bg-base, #0A0A0F);
  background-image:
    radial-gradient(circle at 85% 15%, color-mix(in srgb, var(--accent-secondary, #8B5CF6) 16%, transparent) 0%, transparent 40%),
    radial-gradient(circle at 15% 85%, color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent) 0%, transparent 40%);
  color: var(--text-primary, #E0ECF4);

  overflow-x: hidden;
  overflow-x: clip;

  /* Phones/tablets: flow naturally — the DOCUMENT scrolls (no nested scroller
     swallowing touch gestures; that was the "pull, then finally scrolls" bug).
     Desktop keeps the app-like fixed-height calendar with its own scroll. */
  min-height: calc(100dvh - var(--shell-chrome));

  @media (min-width: 1025px) {
    height: calc(100dvh - var(--shell-chrome));
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior-y: auto;
  }

  /* Premium Custom Scrollbar — Crystalline Swan palette */
  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }
  &::-webkit-scrollbar-track {
    background: color-mix(in srgb, var(--bg-base, #0A0A0F) 86%, transparent);
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, var(--bg-surface, #1A1A24) 88%, var(--accent-primary, #60C0F0) 12%);
    border-radius: 4px;
    border: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 12%, transparent);
  }
  &::-webkit-scrollbar-thumb:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 50%, transparent);
  }

  /* 10-Point Responsive Shell Chrome */
  @media (max-width: ${BREAKPOINTS.TABLET}) {
    --shell-chrome: 72px;
  }
  @media (max-width: ${BREAKPOINTS.MOBILE}) {
    --shell-chrome: 64px;
  }
  @media (max-width: ${BREAKPOINTS.LARGE_PHONE}) {
    --shell-chrome: 60px;
  }
  @media (max-width: ${BREAKPOINTS.SMALL_PHONE}) {
    --shell-chrome: 56px;
  }
  @media (min-width: ${BREAKPOINTS.QHD}) {
    font-size: 1.1rem;
  }
  @media (min-width: ${BREAKPOINTS.UHD}) {
    font-size: 1.25rem;
  }
`;
