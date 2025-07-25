/**
 * Dialogs Module Index
 * ===================
 * 
 * Central export point for all Universal Master Schedule dialog components.
 * Provides comprehensive dialog functionality for session management.
 */

export { default as SessionFormDialog } from './SessionFormDialog';
export { default as BulkActionsConfirmationDialog } from './BulkActionsConfirmationDialog';
export { default as AdvancedFilterDialog } from './AdvancedFilterDialog';

// Dialog types and interfaces
export interface DialogProps {
  open: boolean;
  onClose: () => void;
}

export interface SessionDialogProps extends DialogProps {
  session?: any;
  mode?: 'create' | 'edit' | 'duplicate';
  onSessionSaved: (session: any) => void;
}

export interface BulkActionDialogProps extends DialogProps {
  action: string;
  selectedSessions: any[];
  onActionComplete: (results: any[]) => void;
}

export interface FilterDialogProps extends DialogProps {
  currentFilters: any;
  onFiltersChange: (filters: any) => void;
  sessions: any[];
  clients: any[];
  trainers: any[];
}

// Dialog configuration
export const DIALOG_DEFAULTS = {
  maxWidth: 'md' as const,
  fullWidth: true,
  disableEscapeKeyDown: false,
  disableBackdropClick: false
};

// Dialog animations
export const dialogAnimations = {
  enter: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease: 'easeOut' }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.2, ease: 'easeIn' }
  }
};

// Dialog themes
export const dialogTheme = {
  background: 'linear-gradient(135deg, #0a0a0f, #1e1e3f)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  color: 'white',
  backdropFilter: 'blur(10px)',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
};

// Common dialog utilities
export const dialogUtils = {
  // Create dialog ID
  createId: (prefix: string) => `${prefix}-dialog-${Date.now()}`,
  
  // Validate dialog props
  validateProps: (props: any) => {
    const required = ['open', 'onClose'];
    return required.every(prop => prop in props);
  },
  
  // Handle dialog errors
  handleError: (error: Error, context: string) => {
    console.error(`Dialog error in ${context}:`, error);
    return {
      title: 'Dialog Error',
      message: error.message || 'An unexpected error occurred',
      variant: 'destructive' as const
    };
  },
  
  // Format dialog title
  formatTitle: (action: string, count?: number) => {
    const titles = {
      create: 'Create New Session',
      edit: 'Edit Session',
      duplicate: 'Duplicate Session',
      confirm: `Confirm ${count || ''} Sessions`,
      cancel: `Cancel ${count || ''} Sessions`,
      delete: `Delete ${count || ''} Sessions`,
      filter: 'Advanced Filters'
    };
    return titles[action as keyof typeof titles] || action;
  }
};

// Dialog state management
export interface DialogState {
  sessionFormDialog: boolean;
  bulkActionDialog: boolean;
  filterDialog: boolean;
  assignmentDialog: boolean;
  exportDialog: boolean;
  settingsDialog: boolean;
}

export const initialDialogState: DialogState = {
  sessionFormDialog: false,
  bulkActionDialog: false,
  filterDialog: false,
  assignmentDialog: false,
  exportDialog: false,
  settingsDialog: false
};

// Dialog action types
export type DialogAction = 
  | { type: 'OPEN_DIALOG'; dialogName: keyof DialogState }
  | { type: 'CLOSE_DIALOG'; dialogName: keyof DialogState }
  | { type: 'CLOSE_ALL_DIALOGS' }
  | { type: 'TOGGLE_DIALOG'; dialogName: keyof DialogState };

// Dialog reducer
export const dialogReducer = (state: DialogState, action: DialogAction): DialogState => {
  switch (action.type) {
    case 'OPEN_DIALOG':
      return { ...state, [action.dialogName]: true };
    case 'CLOSE_DIALOG':
      return { ...state, [action.dialogName]: false };
    case 'CLOSE_ALL_DIALOGS':
      return initialDialogState;
    case 'TOGGLE_DIALOG':
      return { ...state, [action.dialogName]: !state[action.dialogName] };
    default:
      return state;
  }
};

// Dialog hook
export const useDialogs = () => {
  const [state, dispatch] = React.useReducer(dialogReducer, initialDialogState);
  
  const openDialog = (dialogName: keyof DialogState) => {
    dispatch({ type: 'OPEN_DIALOG', dialogName });
  };
  
  const closeDialog = (dialogName: keyof DialogState) => {
    dispatch({ type: 'CLOSE_DIALOG', dialogName });
  };
  
  const closeAllDialogs = () => {
    dispatch({ type: 'CLOSE_ALL_DIALOGS' });
  };
  
  const toggleDialog = (dialogName: keyof DialogState) => {
    dispatch({ type: 'TOGGLE_DIALOG', dialogName });
  };
  
  return {
    dialogs: state,
    openDialog,
    closeDialog,
    closeAllDialogs,
    toggleDialog
  };
};

// Export React for the hook
import React from 'react';