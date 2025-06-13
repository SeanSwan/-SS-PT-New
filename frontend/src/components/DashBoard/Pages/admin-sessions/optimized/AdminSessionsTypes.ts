/**
 * AdminSessionsTypes.ts
 * =====================
 * 
 * Shared TypeScript interfaces and types for Admin Sessions components
 * Part of the Admin Sessions optimization following proven Trainer Dashboard methodology
 * 
 * Features:
 * - Centralized type definitions for consistency
 * - Clean interfaces for all session-related data
 * - Type safety across modular components
 * - Performance-optimized with proper typing
 */

// ===== CORE ENTITY INTERFACES =====

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  photo?: string;
  availableSessions: number;
}

export interface Trainer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  photo?: string;
  specialties?: string;
}

export interface Session {
  id: string;
  sessionDate: string;
  duration: number;
  userId: string | null;
  trainerId: string | null;
  location?: string;
  notes?: string;
  status: 'available' | 'requested' | 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  client?: Client | null;
  trainer?: Trainer | null;
}

// ===== STATISTICS INTERFACES =====

export interface SessionStats {
  todaySessions: number;
  completedHours: number;
  activeTrainers: number;
  completionRate: number;
}

export interface StatsCardData {
  value: string | number;
  label: string;
  icon: React.ComponentType<any>;
  variant: 'primary' | 'success' | 'info' | 'warning';
}

// ===== UI STATE INTERFACES =====

export interface FilterState {
  searchTerm: string;
  statusFilter: string;
}

export interface PaginationState {
  page: number;
  rowsPerPage: number;
}

export interface ViewState {
  viewMode: 'table' | 'calendar';
  loading: boolean;
  error: string | null;
}

// ===== DIALOG INTERFACES =====

export interface DialogStates {
  openViewDialog: boolean;
  openEditDialog: boolean;
  openNewDialog: boolean;
  openAddSessionsDialog: boolean;
  selectedSession: Session | null;
}

export interface EditSessionForm {
  editSessionDate: string;
  editSessionTime: string;
  editSessionDuration: number;
  editSessionLocation: string;
  editSessionNotes: string;
  editSessionStatus: Session['status'];
  editSessionClient: string;
  editSessionTrainer: string;
}

export interface NewSessionForm {
  newSessionDate: string;
  newSessionTime: string;
  newSessionDuration: number;
  newSessionLocation: string;
  newSessionNotes: string;
  newSessionClient: string;
  newSessionTrainer: string;
}

export interface AddSessionsForm {
  selectedClient: string;
  sessionsToAdd: number;
  addSessionsNote: string;
}

// ===== API RESPONSE INTERFACES =====

export interface SessionApiResponse {
  success: boolean;
  data?: Session[];
  message?: string;
}

export interface ClientApiResponse {
  success: boolean;
  data?: Client[];
  message?: string;
}

export interface TrainerApiResponse {
  success: boolean;
  data?: Trainer[];
  message?: string;
}

// ===== COMPONENT PROPS INTERFACES =====

export interface AdminSessionsOverviewProps {
  statsData: SessionStats;
  loading: boolean;
  viewMode: 'table' | 'calendar';
  onViewModeChange: (mode: 'table' | 'calendar') => void;
  onRefresh: () => void;
  onOpenAddSessions: () => void;
  loadingClients: boolean;
}

export interface AdminSessionsTableProps {
  sessions: Session[];
  filteredSessions: Session[];
  loading: boolean;
  error: string | null;
  pagination: PaginationState;
  onPaginationChange: (field: keyof PaginationState, value: number) => void;
  onViewSession: (session: Session) => void;
  onEditSession: (session: Session) => void;
  onRefresh: () => void;
}

export interface AdminSessionsFilteringProps {
  filterState: FilterState;
  onFilterChange: (field: keyof FilterState, value: string) => void;
  sessionCount: number;
}

export interface AdminSessionsDialogsProps {
  dialogStates: DialogStates;
  editForm: EditSessionForm;
  newForm: NewSessionForm;
  clients: Client[];
  trainers: Trainer[];
  loadingClients: boolean;
  loadingTrainers: boolean;
  onDialogChange: (dialog: keyof DialogStates, open: boolean) => void;
  onEditFormChange: (field: keyof EditSessionForm, value: string | number) => void;
  onNewFormChange: (field: keyof NewSessionForm, value: string | number) => void;
  onSaveEdit: () => Promise<void>;
  onCreateNew: () => Promise<void>;
}

export interface AdminSessionsCalendarProps {
  sessions: Session[];
  loading: boolean;
}

export interface AdminSessionsActionsProps {
  addSessionsForm: AddSessionsForm;
  clients: Client[];
  loadingClients: boolean;
  open: boolean;
  onClose: () => void;
  onFormChange: (field: keyof AddSessionsForm, value: string | number) => void;
  onAddSessions: () => Promise<void>;
  onExportSessions: () => void;
  onCreateNewSession: () => void;
}

// ===== UTILITY TYPE DEFINITIONS =====

export type SessionStatus = Session['status'];

export type SessionSortField = 'sessionDate' | 'status' | 'client' | 'trainer' | 'duration';

export type SessionSortDirection = 'asc' | 'desc';

export interface SessionSort {
  field: SessionSortField;
  direction: SessionSortDirection;
}

// ===== WEBSOCKET MESSAGE TYPES =====

export interface WebSocketMessage {
  type: string;
  data?: any;
}

export interface PurchaseMessage extends WebSocketMessage {
  type: 'purchase' | 'dashboard:update';
  data: {
    userName: string;
    sessionsPurchased: number;
    type?: string;
  };
}

// ===== FORM VALIDATION TYPES =====

export interface FormValidation {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface SessionFormData {
  sessionDate: string;
  sessionTime: string;
  duration: number;
  location: string;
  notes: string;
  clientId: string;
  trainerId: string;
  status?: SessionStatus;
}

// ===== CONSTANTS =====

export const SESSION_STATUSES = [
  'all',
  'available', 
  'requested', 
  'scheduled', 
  'confirmed', 
  'completed', 
  'cancelled'
] as const;

export const ROWS_PER_PAGE_OPTIONS = [5, 10, 25, 50] as const;

export const DEFAULT_SESSION_DURATION = 60;

export const DEFAULT_LOCATION = 'Main Studio';

// ===== UTILITY FUNCTIONS =====

export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  try {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  } catch (e) {
    console.error("Error formatting date:", dateString, e);
    return "Invalid Date";
  }
};

export const formatTime = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    console.error("Error formatting time:", dateString, e);
    return "Invalid Time";
  }
};

export const getInitials = (firstName?: string, lastName?: string): string => {
  const first = firstName?.[0] || '';
  const last = lastName?.[0] || '';
  return `${first}${last}`.toUpperCase();
};

export const validateSessionDateTime = (date: string, time: string): FormValidation => {
  const errors: Record<string, string> = {};
  
  if (!date) errors.date = 'Date is required';
  if (!time) errors.time = 'Time is required';
  
  if (date && time) {
    const sessionDateTime = new Date(`${date}T${time}`);
    if (isNaN(sessionDateTime.getTime())) {
      errors.datetime = 'Invalid date/time format';
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// ===== ERROR HANDLING =====

export class SessionError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'SessionError';
  }
}

export const handleApiError = (error: any): string => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};
