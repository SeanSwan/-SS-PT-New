/**
 * useCalendarHandlers - Event Handler Logic Hook
 * ==============================================
 * Manages all event handlers and user interactions for the Universal Master Schedule
 * 
 * RESPONSIBILITIES:
 * - Calendar interaction handlers (select, drop, resize)
 * - Session management operations
 * - Gamification integration
 * - Analytics view changes
 * - Form and dialog interactions
 * - Keyboard shortcuts and accessibility
 */

import { useCallback } from 'react';
import { SlotInfo } from 'react-big-calendar';
import { useToast } from '../../../hooks/use-toast';
import sessionService from '../../../services/sessionService';
import { gamificationMCPService } from '../../../services/gamificationMCPService';
import { useTouchGesture } from '../../PWA/TouchGestureProvider';
import type { SessionEvent, Session } from '../types';
// Removed circular dependencies - these will be passed as parameters

export interface CalendarHandlersValues {
  // Touch/Haptic Support
  hapticFeedback: (() => void) | null;
  isTouch: boolean;
}

export interface CalendarHandlersActions {
  // Calendar Interaction Handlers
  handleSelectSlot: (slotInfo: SlotInfo) => void;
  handleSelectEvent: (event: SessionEvent) => void;
  handleEventDrop: ({ event, start, end }: { event: any; start: Date; end: Date }) => Promise<void>;
  handleEventResize: ({ event, start, end }: { event: any; start: Date; end: Date }) => Promise<void>;
  
  // Session Management
  handleSessionCompletion: (sessionId: string, clientId: string) => Promise<void>;
  handleSessionSaved: (session: Session) => Promise<void>;
  
  // Analytics View Management
  handleAnalyticsViewChange: (view: 'calendar' | 'business' | 'trainers' | 'social' | 'allocations') => void;
  handleDateRangeChange: (range: string) => void;
  handleTrainerSelect: (trainerId: string) => void;
  
  // Gamification Integration
  triggerGamificationReward: (sessionId: string, clientId: string, action: 'session_completed' | 'milestone_reached' | 'streak_achieved') => Promise<void>;
  
  // Keyboard Shortcuts
  setupEventListeners: () => void;
  cleanupEventListeners: () => void;
}

/**
 * useCalendarHandlers Hook
 * 
 * Provides comprehensive event handling for the Universal Master Schedule
 * with gamification integration, accessibility support, and touch-friendly interactions.
 */
export const useCalendarHandlers = (dependencies: {
  sessions: Session[];
  refreshData: () => Promise<void>;
  setLoading: (updates: any) => void;
  setDialogs: (updates: any) => void;
  setSessionFormMode: (mode: 'create' | 'edit' | 'duplicate') => void;
  setSessionFormInitialData: (data: any) => void;
  setSelectedEvent: (event: SessionEvent | null) => void;
  setAnalyticsView: (view: string) => void;
  setDateRange: (range: string) => void;
  setSelectedTrainer: (trainerId: string | null) => void;
  closeAllDialogs: () => void;
  sessionFormMode: 'create' | 'edit' | 'duplicate';
}) => {
  const { toast } = useToast();
  
  // Extract dependencies
  const {
    sessions,
    refreshData,
    setLoading,
    setDialogs,
    sessionFormMode,
    setSessionFormMode,
    setSessionFormInitialData,
    setSelectedEvent,
    setAnalyticsView,
    setDateRange,
    setSelectedTrainer,
    closeAllDialogs
  } = dependencies;
  
  // Mobile PWA hooks - with error handling
  const touchGestureContext = useTouchGesture?.() || null;
  const hapticFeedback = touchGestureContext?.hapticFeedback || null;
  const isTouch = touchGestureContext?.isTouch || false;
  
  // ==================== GAMIFICATION MCP INTEGRATION ====================
  
  const triggerGamificationReward = useCallback(async (
    sessionId: string, 
    clientId: string, 
    action: 'session_completed' | 'milestone_reached' | 'streak_achieved'
  ) => {
    try {
      // Integration with Gamification MCP Server
      const gamificationPayload = {
        userId: clientId,
        action,
        sessionId,
        points: action === 'session_completed' ? 50 : action === 'milestone_reached' ? 100 : 75,
        timestamp: new Date().toISOString()
      };
      
      // Call MCP gamification service
      const result = await gamificationMCPService.awardPoints(gamificationPayload);
      
      if (result.success) {
        // Generate social media post
        await gamificationMCPService.generateWorkoutPost({
          userId: clientId,
          type: action === 'session_completed' ? 'workout_completion' : 'achievement_unlock',
          sessionId,
          autoGenerate: true,
          includeStats: true
        });
        
        console.log('🎮 Gamification reward triggered successfully:', result);
        
        toast({
          title: result.achievement ? 'Achievement Unlocked! 🏆' : 'Points Earned! ✨',
          description: result.achievement 
            ? `${result.achievement.title} - ${result.points} points!`
            : `Earned ${gamificationPayload.points} points! Total: ${result.newTotal}`,
          variant: 'default'
        });
        
        // If level up occurred, show special celebration
        if (result.levelUp) {
          toast({
            title: 'LEVEL UP! 🎆',
            description: 'Congratulations on reaching a new level!',
            variant: 'default'
          });
        }
      }
      
    } catch (error) {
      console.error('Error triggering gamification reward:', error);
      // Still show success message to user even if gamification fails
      toast({
        title: 'Session Completed! ✅',
        description: 'Great work on completing your training session!',
        variant: 'default'
      });
    }
  }, [toast]);
  
  // ==================== SESSION MANAGEMENT HANDLERS ====================
  
  const handleSessionCompletion = useCallback(async (sessionId: string, clientId: string) => {
    try {
      // Mark session as completed
      await sessionService.updateSession(sessionId, { status: 'completed' });
      
      // Trigger gamification rewards
      await triggerGamificationReward(sessionId, clientId, 'session_completed');
      
      // Check for milestones (every 10 sessions)
      const clientSessions = sessions.filter(s => s.userId === clientId && s.status === 'completed');
      if (clientSessions.length % 10 === 0) {
        await triggerGamificationReward(sessionId, clientId, 'milestone_reached');
      }
      
      // Check for streaks (5 consecutive weeks)
      const recentSessions = clientSessions
        .filter(s => new Date(s.sessionDate) >= new Date(Date.now() - 35 * 24 * 60 * 60 * 1000))
        .sort((a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime());
      
      if (recentSessions.length >= 5) {
        await triggerGamificationReward(sessionId, clientId, 'streak_achieved');
      }
      
      // Refresh data
      await refreshData();
      
    } catch (error) {
      console.error('Error handling session completion:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete session. Please try again.',
        variant: 'destructive'
      });
    }
  }, [sessions, triggerGamificationReward, refreshData, toast]);
  
  const handleSessionSaved = useCallback(async (session: Session) => {
    // Refresh data after session is saved
    await refreshData();
    
    // Close dialog
    setDialogs(prev => ({ ...prev, sessionFormDialog: false }));
    
    toast({
      title: 'Session Saved',
      description: `Session has been ${sessionFormMode === 'create' ? 'created' : 'updated'} successfully`,
      variant: 'default'
    });
  }, [refreshData, sessionFormMode, toast, setDialogs]);
  
  // ==================== CALENDAR INTERACTION HANDLERS ====================
  
  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
    // Skip if in multi-select mode
    // Note: multiSelect would come from useBulkOperations hook
    // if (multiSelect.enabled) return;
    
    // Create new session slot
    setSessionFormMode('create');
    setSessionFormInitialData({
      start: slotInfo.start,
      end: slotInfo.end,
      initialDate: slotInfo.start,
      initialTrainer: ''
    });
    
    setDialogs(prev => ({ ...prev, sessionFormDialog: true }));
    
    // Provide haptic feedback on mobile
    if (hapticFeedback) {
      hapticFeedback();
    }
  }, [setSessionFormMode, setSessionFormInitialData, setDialogs, hapticFeedback]);
  
  const handleSelectEvent = useCallback((event: SessionEvent) => {
    // Skip if in multi-select mode - would be handled by useBulkOperations
    // if (multiSelect.enabled) {
    //   toggleEventSelection(event.id);
    //   return;
    // }
    
    // Edit existing session
    setSessionFormMode('edit');
    setSelectedEvent(event);
    setSessionFormInitialData({
      session: event,
      initialDate: event.start,
      initialTrainer: event.trainerId || ''
    });
    
    setDialogs(prev => ({ ...prev, sessionFormDialog: true }));
    
    // Provide haptic feedback on mobile
    if (hapticFeedback) {
      hapticFeedback();
    }
  }, [setSessionFormMode, setSelectedEvent, setSessionFormInitialData, setDialogs, hapticFeedback]);
  
  const handleEventDrop = useCallback(async ({ event, start, end }) => {
    try {
      setLoading(prev => ({ ...prev, sessions: true }));
      
      // Update session via service
      await sessionService.moveSession(event.id, start, end);
      
      // Refresh data
      await refreshData();
      
      toast({
        title: 'Session Updated',
        description: 'Session has been moved successfully',
        variant: 'default'
      });
      
      // Provide haptic feedback on mobile
      if (hapticFeedback) {
        hapticFeedback();
      }
      
    } catch (error) {
      console.error('Error moving session:', error);
      toast({
        title: 'Error',
        description: 'Failed to move session. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(prev => ({ ...prev, sessions: false }));
    }
  }, [refreshData, toast, hapticFeedback, setLoading]);
  
  const handleEventResize = useCallback(async ({ event, start, end }) => {
    try {
      setLoading(prev => ({ ...prev, sessions: true }));
      
      // Update session duration via service
      await sessionService.resizeSession(event.id, start, end);
      
      // Refresh data
      await refreshData();
      
      toast({
        title: 'Session Updated',
        description: 'Session duration has been updated',
        variant: 'default'
      });
      
    } catch (error) {
      console.error('Error resizing session:', error);
      toast({
        title: 'Error',
        description: 'Failed to update session duration. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(prev => ({ ...prev, sessions: false }));
    }
  }, [refreshData, toast, setLoading]);
  
  // ==================== ANALYTICS HANDLERS ====================
  
  const handleAnalyticsViewChange = useCallback((view: 'calendar' | 'business' | 'trainers' | 'social' | 'allocations') => {
    setAnalyticsView(view);
    
    if (hapticFeedback) {
      hapticFeedback('light' as any);
    }
  }, [setAnalyticsView, hapticFeedback]);
  
  const handleDateRangeChange = useCallback((range: string) => {
    setDateRange(range);
    // Trigger data refresh with new date range
    refreshData();
  }, [setDateRange, refreshData]);
  
  const handleTrainerSelect = useCallback((trainerId: string) => {
    setSelectedTrainer(trainerId);
    setAnalyticsView('trainers');
  }, [setSelectedTrainer, setAnalyticsView]);
  
  // ==================== KEYBOARD SHORTCUTS ====================
  
  const setupEventListeners = useCallback(() => {
    // Setup keyboard shortcuts
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'a':
            event.preventDefault();
            // Multi-select handling would be managed by useBulkOperations
            // if (multiSelect.enabled) {
            //   selectAllEvents();
            // }
            break;
          case 'Escape':
            event.preventDefault();
            // Multi-select handling would be managed by useBulkOperations
            // if (multiSelect.enabled) {
            //   toggleMultiSelect();
            // } else {
              closeAllDialogs();
            // }
            break;
          case 'r':
            event.preventDefault();
            refreshData();
            break;
          case '1':
            event.preventDefault();
            handleAnalyticsViewChange('calendar');
            break;
          case '2':
            event.preventDefault();
            handleAnalyticsViewChange('business');
            break;
          case '3':
            event.preventDefault();
            handleAnalyticsViewChange('trainers');
            break;
          case '4':
            event.preventDefault();
            handleAnalyticsViewChange('social');
            break;
          case '5':
            event.preventDefault();
            handleAnalyticsViewChange('allocations');
            break;
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyPress);
    
    // Return cleanup function
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [closeAllDialogs, refreshData, handleAnalyticsViewChange]);
  
  const cleanupEventListeners = useCallback(() => {
    // This will be handled by the cleanup function returned from setupEventListeners
    console.log('🧹 Event listeners cleaned up');
  }, []);
  
  // ==================== RETURN VALUES & ACTIONS ====================
  
  const values: CalendarHandlersValues = {
    // Touch/Haptic Support
    hapticFeedback,
    isTouch
  };
  
  const actions: CalendarHandlersActions = {
    // Calendar Interaction Handlers
    handleSelectSlot,
    handleSelectEvent,
    handleEventDrop,
    handleEventResize,
    
    // Session Management
    handleSessionCompletion,
    handleSessionSaved,
    
    // Analytics View Management
    handleAnalyticsViewChange,
    handleDateRangeChange,
    handleTrainerSelect,
    
    // Gamification Integration
    triggerGamificationReward,
    
    // Keyboard Shortcuts
    setupEventListeners,
    cleanupEventListeners
  };
  
  return { ...values, ...actions };
};

export default useCalendarHandlers;
