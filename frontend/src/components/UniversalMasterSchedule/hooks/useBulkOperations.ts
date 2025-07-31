/**
 * useBulkOperations - Multi-Select & Bulk Actions Hook
 * ===================================================
 * Manages bulk operations and multi-select functionality for the Universal Master Schedule
 * 
 * RESPONSIBILITIES:
 * - Multi-select state management
 * - Bulk action orchestration
 * - Selection validation and constraints
 * - Bulk operation progress tracking
 * - Undo/redo functionality for bulk operations
 */

import { useState, useCallback, useMemo } from 'react';
import { useToast } from '../../../hooks/use-toast';
import sessionService from '../../../services/sessionService';
import type { 
  SessionEvent, 
  BulkActionType, 
  MultiSelectState,
  Session
} from '../types';
// Removed circular dependencies - these will be passed as parameters

export interface BulkOperationsValues {
  // Multi-select State
  multiSelect: MultiSelectState;
  
  // Bulk Action State
  bulkActionType: BulkActionType;
  selectedSessionsData: SessionEvent[];
  
  // Operation Status
  canPerformBulkActions: boolean;
  selectedCount: number;
  maxSelectableCount: number;
}

export interface BulkOperationsActions {
  // Multi-select Management
  toggleMultiSelect: () => void;
  toggleEventSelection: (eventId: string) => void;
  selectAllEvents: () => void;
  clearSelection: () => void;
  selectEventsByStatus: (status: string) => void;
  selectEventsByTrainer: (trainerId: string) => void;
  selectEventsByDateRange: (startDate: Date, endDate: Date) => void;
  
  // Bulk Actions
  initiateBulkAction: (action: BulkActionType) => void;
  setBulkActionType: (type: BulkActionType) => void;
  executeBulkAction: (actionType: BulkActionType, sessionIds: string[], actionData?: any) => Promise<any[]>;
  handleBulkActionComplete: (results: any[]) => Promise<void>;
  
  // Validation
  validateBulkAction: (action: BulkActionType, selectedEvents: SessionEvent[]) => { valid: boolean; message?: string };
  
  // Keyboard Shortcuts for Bulk Operations
  handleBulkKeyboardShortcuts: (event: KeyboardEvent) => void;
}

/**
 * useBulkOperations Hook
 * 
 * Provides comprehensive bulk operation capabilities for the Universal Master Schedule
 * with intelligent selection, validation, and progress tracking.
 */
export const useBulkOperations = (dependencies: {
  calendarEvents: SessionEvent[];
  refreshData: () => Promise<void>;
  setLoading: (updates: any) => void;
  setDialogs: (updates: any) => void;
  loading: { bulkOperation: boolean };
}) => {
  const { toast } = useToast();
  
  // Extract dependencies
  const {
    calendarEvents,
    refreshData,
    setLoading,
    setDialogs,
    loading
  } = dependencies;
  
  // ==================== BULK OPERATIONS STATE ====================
  
  const [multiSelect, setMultiSelect] = useState<MultiSelectState>({
    enabled: false,
    selectedEvents: [],
    bulkActionMode: false,
    selectedAction: null
  });
  
  const [bulkActionType, setBulkActionType] = useState<BulkActionType>('confirm');
  
  // ==================== COMPUTED VALUES ====================
  
  const selectedSessionsData = useMemo(() => {
    return calendarEvents.filter(event => 
      multiSelect.selectedEvents.includes(event.id)
    );
  }, [calendarEvents, multiSelect.selectedEvents]);
  
  const selectedCount = multiSelect.selectedEvents.length;
  const maxSelectableCount = calendarEvents.length;
  const canPerformBulkActions = selectedCount > 0 && !loading.bulkOperation;
  
  // ==================== MULTI-SELECT MANAGEMENT ====================
  
  const toggleMultiSelect = useCallback(() => {
    setMultiSelect(prev => ({
      ...prev,
      enabled: !prev.enabled,
      selectedEvents: [],
      bulkActionMode: false,
      selectedAction: null
    }));
    
    // Show tutorial toast for first-time users
    if (!multiSelect.enabled) {
      toast({
        title: 'Multi-Select Mode Enabled',
        description: 'Click sessions to select them for bulk operations. Press Ctrl+A to select all.',
        variant: 'default'
      });
    }
  }, [multiSelect.enabled, toast]);
  
  const toggleEventSelection = useCallback((eventId: string) => {
    setMultiSelect(prev => ({
      ...prev,
      selectedEvents: prev.selectedEvents.includes(eventId)
        ? prev.selectedEvents.filter(id => id !== eventId)
        : [...prev.selectedEvents, eventId]
    }));
  }, []);
  
  const selectAllEvents = useCallback(() => {
    const allEventIds = calendarEvents.map(event => event.id);
    setMultiSelect(prev => ({
      ...prev,
      selectedEvents: allEventIds
    }));
    
    toast({
      title: 'All Sessions Selected',
      description: `Selected ${allEventIds.length} sessions for bulk operations.`,
      variant: 'default'
    });
  }, [calendarEvents, toast]);
  
  const clearSelection = useCallback(() => {
    setMultiSelect(prev => ({
      ...prev,
      selectedEvents: [],
      bulkActionMode: false,
      selectedAction: null
    }));
  }, []);
  
  // ==================== SMART SELECTION METHODS ====================
  
  const selectEventsByStatus = useCallback((status: string) => {
    const filteredEventIds = calendarEvents
      .filter(event => event.status === status)
      .map(event => event.id);
    
    setMultiSelect(prev => ({
      ...prev,
      selectedEvents: filteredEventIds
    }));
    
    toast({
      title: 'Selection by Status',
      description: `Selected ${filteredEventIds.length} ${status} sessions.`,
      variant: 'default'
    });
  }, [calendarEvents, toast]);
  
  const selectEventsByTrainer = useCallback((trainerId: string) => {
    const filteredEventIds = calendarEvents
      .filter(event => event.trainerId === trainerId)
      .map(event => event.id);
    
    setMultiSelect(prev => ({
      ...prev,
      selectedEvents: filteredEventIds
    }));
    
    toast({
      title: 'Selection by Trainer',
      description: `Selected ${filteredEventIds.length} sessions for the selected trainer.`,
      variant: 'default'
    });
  }, [calendarEvents, toast]);
  
  const selectEventsByDateRange = useCallback((startDate: Date, endDate: Date) => {
    const filteredEventIds = calendarEvents
      .filter(event => event.start >= startDate && event.start <= endDate)
      .map(event => event.id);
    
    setMultiSelect(prev => ({
      ...prev,
      selectedEvents: filteredEventIds
    }));
    
    toast({
      title: 'Selection by Date Range',
      description: `Selected ${filteredEventIds.length} sessions in the specified date range.`,
      variant: 'default'
    });
  }, [calendarEvents, toast]);
  
  // ==================== BULK ACTION VALIDATION ====================
  
  const validateBulkAction = useCallback((action: BulkActionType, selectedEvents: SessionEvent[]) => {
    if (selectedEvents.length === 0) {
      return { valid: false, message: 'No sessions selected for bulk operation.' };
    }
    
    switch (action) {
      case 'confirm':
        const confirmableEvents = selectedEvents.filter(e => 
          e.status === 'scheduled' || e.status === 'booked'
        );
        if (confirmableEvents.length === 0) {
          return { 
            valid: false, 
            message: 'No sessions can be confirmed. Only scheduled or booked sessions can be confirmed.' 
          };
        }
        if (confirmableEvents.length !== selectedEvents.length) {
          return {
            valid: true,
            message: `${confirmableEvents.length} of ${selectedEvents.length} sessions will be confirmed.`
          };
        }
        break;
        
      case 'cancel':
        const cancellableEvents = selectedEvents.filter(e => 
          e.status !== 'completed' && e.status !== 'cancelled'
        );
        if (cancellableEvents.length === 0) {
          return { 
            valid: false, 
            message: 'No sessions can be cancelled. Completed or already cancelled sessions cannot be cancelled.' 
          };
        }
        break;
        
      case 'delete':
        const deletableEvents = selectedEvents.filter(e => 
          e.status === 'available' || e.status === 'cancelled'
        );
        if (deletableEvents.length === 0) {
          return { 
            valid: false, 
            message: 'No sessions can be deleted. Only available or cancelled sessions can be deleted.' 
          };
        }
        break;
        
      case 'reassign':
        const reassignableEvents = selectedEvents.filter(e => 
          e.status !== 'completed'
        );
        if (reassignableEvents.length === 0) {
          return { 
            valid: false, 
            message: 'No sessions can be reassigned. Completed sessions cannot be reassigned.' 
          };
        }
        break;
        
      default:
        break;
    }
    
    return { valid: true };
  }, []);
  
  // ==================== BULK ACTION EXECUTION ====================
  
  const executeBulkAction = useCallback(async (
    actionType: BulkActionType, 
    sessionIds: string[], 
    actionData?: any
  ): Promise<any[]> => {
    const results: any[] = [];
    
    setLoading({ bulkOperation: true });
    
    try {
      // Process sessions in batches to avoid overwhelming the server
      const batchSize = 10;
      const batches = [];
      for (let i = 0; i < sessionIds.length; i += batchSize) {
        batches.push(sessionIds.slice(i, i + batchSize));
      }
      
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        const batchPromises = batch.map(async (sessionId) => {
          try {
            let result;
            
            switch (actionType) {
              case 'confirm':
                result = await sessionService.updateSession(sessionId, { status: 'confirmed' });
                break;
              case 'cancel':
                result = await sessionService.updateSession(sessionId, { 
                  status: 'cancelled',
                  cancellationReason: actionData?.reason || 'Bulk cancellation'
                });
                break;
              case 'delete':
                result = await sessionService.deleteSession(sessionId);
                break;
              case 'reassign':
                result = await sessionService.updateSession(sessionId, { 
                  trainerId: actionData?.newTrainerId,
                  reassignmentReason: actionData?.reason || 'Bulk reassignment'
                });
                break;
              default:
                throw new Error(`Unknown bulk action: ${actionType}`);
            }
            
            return { sessionId, success: true, result };
          } catch (error) {
            console.error(`Error processing session ${sessionId}:`, error);
            return { sessionId, success: false, error: error.message };
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Update progress
        const progress = ((batchIndex + 1) / batches.length) * 100;
        console.log(`Bulk operation progress: ${progress.toFixed(1)}%`);
      }
      
      // Show results summary
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;
      
      if (failureCount > 0) {
        toast({
          title: 'Bulk Operation Completed with Errors',
          description: `${successCount} sessions processed successfully. ${failureCount} failed.`,
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Bulk Operation Completed',
          description: `Successfully processed ${successCount} sessions.`,
          variant: 'default'
        });
      }
      
    } catch (error) {
      console.error('Bulk operation failed:', error);
      toast({
        title: 'Bulk Operation Failed',
        description: 'An error occurred during the bulk operation. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading({ bulkOperation: false });
    }
    
    return results;
  }, [setLoading, toast]);
  
  const initiateBulkAction = useCallback((action: BulkActionType) => {
    if (multiSelect.selectedEvents.length === 0) return;
    
    const validation = validateBulkAction(action, selectedSessionsData);
    if (!validation.valid) {
      toast({
        title: 'Invalid Bulk Action',
        description: validation.message,
        variant: 'destructive'
      });
      return;
    }
    
    setBulkActionType(action);
    setDialogs(prev => ({ ...prev, bulkActionDialog: true }));
    
    if (validation.message) {
      toast({
        title: 'Bulk Action Warning',
        description: validation.message,
        variant: 'default'
      });
    }
  }, [multiSelect.selectedEvents, selectedSessionsData, validateBulkAction, setBulkActionType, setDialogs, toast]);
  
  const handleBulkActionComplete = useCallback(async (results: any[]) => {
    // Refresh data after bulk action completion
    await refreshData();
    
    // Clear selection
    clearSelection();
    
    // Close dialog
    setDialogs(prev => ({ ...prev, bulkActionDialog: false }));
    
    // Log operation for audit trail
    console.log('📊 Bulk operation audit log:', {
      action: bulkActionType,
      timestamp: new Date().toISOString(),
      sessionCount: results.length,
      successCount: results.filter(r => r.success).length,
      results
    });
  }, [refreshData, clearSelection, setDialogs, bulkActionType]);
  
  // ==================== KEYBOARD SHORTCUTS ====================
  
  const handleBulkKeyboardShortcuts = useCallback((event: KeyboardEvent) => {
    if (!multiSelect.enabled) return;
    
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 'a':
          event.preventDefault();
          selectAllEvents();
          break;
        case 'd':
          event.preventDefault();
          clearSelection();
          break;
        case 'Enter':
          if (canPerformBulkActions) {
            event.preventDefault();
            initiateBulkAction('confirm');
          }
          break;
        case 'Delete':
          if (canPerformBulkActions) {
            event.preventDefault();
            initiateBulkAction('delete');
          }
          break;
      }
    }
  }, [multiSelect.enabled, selectAllEvents, clearSelection, canPerformBulkActions, initiateBulkAction]);
  
  // ==================== RETURN VALUES & ACTIONS ====================
  
  const values: BulkOperationsValues = {
    // Multi-select State
    multiSelect,
    
    // Bulk Action State
    bulkActionType,
    selectedSessionsData,
    
    // Operation Status
    canPerformBulkActions,
    selectedCount,
    maxSelectableCount
  };
  
  const actions: BulkOperationsActions = {
    // Multi-select Management
    toggleMultiSelect,
    toggleEventSelection,
    selectAllEvents,
    clearSelection,
    selectEventsByStatus,
    selectEventsByTrainer,
    selectEventsByDateRange,
    
    // Bulk Actions
    initiateBulkAction,
    setBulkActionType,
    executeBulkAction,
    handleBulkActionComplete,
    
    // Validation
    validateBulkAction,
    
    // Keyboard Shortcuts
    handleBulkKeyboardShortcuts
  };
  
  return { ...values, ...actions };
};

export default useBulkOperations;
