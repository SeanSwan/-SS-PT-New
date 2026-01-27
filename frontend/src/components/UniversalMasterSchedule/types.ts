/**
 * Universal Master Schedule - Type Definitions
 * ==========================================
 * TypeScript interfaces and types for the Universal Master Schedule system
 * 
 * These types align with the Grand Unifying Blueprint v43.2 and provide
 * type safety for the enhanced scheduling system with drag-and-drop,
 * client-trainer assignments, and real-time collaboration features.
 */

// ==================== CORE ENTITY TYPES ====================

/**
 * Session entity - represents a training session slot
 */
export interface Session {
  id: string;
  sessionDate: string;
  duration: number;
  userId: string | null;
  trainerId: string | null;
  location?: string;
  notes?: string;
  status: 'available' | 'requested' | 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'blocked';
  notifyClient?: boolean;
  recurringGroupId?: string | null;
  isBlocked?: boolean;
  isRecurring?: boolean;
  client?: Client | null;
  trainer?: Trainer | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Client entity - represents a client user
 */
export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  photo?: string;
  availableSessions: number;
  role: 'client';
  createdAt: string;
  updatedAt: string;
}

/**
 * Trainer entity - represents a trainer user
 */
export interface Trainer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  photo?: string;
  specialties?: string;
  role: 'trainer';
  createdAt: string;
  updatedAt: string;
}

/**
 * ClientTrainerAssignment entity - represents the assignment relationship
 */
export interface ClientTrainerAssignment {
  id: string;
  clientId: string;
  trainerId: string;
  assignedBy: string;
  assignedAt: string;
  isActive: boolean;
  notes?: string;
  client?: Client;
  trainer?: Trainer;
  assignedByUser?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  updatedAt: string;
}

// ==================== CALENDAR EVENT TYPES ====================

/**
 * Calendar event - represents a session in the calendar view
 */
export interface SessionEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  status: Session['status'];
  userId?: string | null;
  trainerId?: string | null;
  client?: Client | null;
  trainer?: Trainer | null;
  location?: string;
  notes?: string;
  duration?: number;
  resource?: Session; // Full session data
}

/**
 * Drag and drop event data
 */
export interface DragDropEventData {
  event: SessionEvent;
  start: Date;
  end: Date;
  isAllDay?: boolean;
}

/**
 * Calendar slot selection data
 */
export interface SlotSelectionData {
  start: Date;
  end: Date;
  slots: Date[];
  action: 'select' | 'click' | 'doubleClick';
  bounds: {
    x: number;
    y: number;
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  box: {
    clientX: number;
    clientY: number;
    x: number;
    y: number;
  };
}

// ==================== FILTER AND SEARCH TYPES ====================

/**
 * Filter options for the schedule view
 */
export interface FilterOptions {
  trainerId: string;
  clientId: string;
  status: 'all' | Session['status'];
  dateRange: 'all' | 'today' | 'week' | 'month' | 'custom';
  location: string;
  searchTerm: string;
  customDateStart?: string;
  customDateEnd?: string;
}

/**
 * Advanced filter options
 */
export interface AdvancedFilterOptions extends FilterOptions {
  showOnlyAssigned: boolean;
  showOnlyUnassigned: boolean;
  minDuration: number;
  maxDuration: number;
  hasNotes: boolean;
  createdBy: string;
  lastModified: 'today' | 'week' | 'month' | 'all';
}

// ==================== STATISTICS TYPES ====================

/**
 * Schedule statistics for dashboard display
 */
export interface ScheduleStats {
  totalSessions: number;
  availableSessions: number;
  bookedSessions: number;
  completedSessions: number;
  cancelledSessions: number;
  revenue: number;
  utilizationRate: number;
  averageSessionDuration: number;
  topTrainer: {
    id: string;
    name: string;
    sessionsCount: number;
  } | null;
  topClient: {
    id: string;
    name: string;
    sessionsCount: number;
  } | null;
}

/**
 * Trainer performance statistics
 */
export interface TrainerStats {
  trainerId: string;
  totalSessions: number;
  completedSessions: number;
  cancelledSessions: number;
  averageRating: number;
  clientCount: number;
  revenue: number;
  utilizationRate: number;
  upcomingSessions: number;
}

/**
 * Client progress statistics
 */
export interface ClientStats {
  clientId: string;
  totalSessions: number;
  completedSessions: number;
  remainingSessions: number;
  averageSessionDuration: number;
  totalSpent: number;
  lastSessionDate: string | null;
  nextSessionDate: string | null;
  assignedTrainerId: string | null;
}

// ==================== ACTION TYPES ====================

/**
 * Bulk action types for multi-session operations
 */
export type BulkActionType = 
  | 'confirm'
  | 'cancel'
  | 'delete'
  | 'reassign'
  | 'reschedule'
  | 'duplicate'
  | 'export';

/**
 * Session action types for individual operations
 */
export type SessionActionType = 
  | 'view'
  | 'edit'
  | 'delete'
  | 'confirm'
  | 'cancel'
  | 'reassign'
  | 'reschedule'
  | 'duplicate'
  | 'addNotes'
  | 'viewHistory';

/**
 * Assignment action types
 */
export type AssignmentActionType = 
  | 'assign'
  | 'unassign'
  | 'reassign'
  | 'viewHistory'
  | 'updatePermissions';

// ==================== API RESPONSE TYPES ====================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

/**
 * Paginated API response
 */
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  message?: string;
}

/**
 * Session creation/update request
 */
export interface SessionRequest {
  sessionDate: string;
  duration: number;
  userId?: string | null;
  trainerId?: string | null;
  location?: string;
  notes?: string;
  status?: Session['status'];
}

/**
 * Client-trainer assignment request
 */
export interface AssignmentRequest {
  clientId: string;
  trainerId: string;
  notes?: string;
}

/**
 * Bulk operation request
 */
export interface BulkOperationRequest {
  sessionIds: string[];
  action: BulkActionType;
  data?: any;
}

// ==================== UI STATE TYPES ====================

/**
 * Calendar view types
 */
export type CalendarView = 'month' | 'week' | 'day' | 'agenda';

/**
 * Dialog state types
 */
export interface DialogState {
  eventDialog: boolean;
  assignmentDialog: boolean;
  statsDialog: boolean;
  filterDialog: boolean;
  bulkActionDialog: boolean;
  sessionFormDialog: boolean;
}

/**
 * Multi-select state
 */
export interface MultiSelectState {
  enabled: boolean;
  selectedEvents: string[];
  bulkActionMode: boolean;
  selectedAction: BulkActionType | null;
}

/**
 * Loading state for different operations
 */
export interface LoadingState {
  sessions: boolean;
  clients: boolean;
  trainers: boolean;
  assignments: boolean;
  statistics: boolean;
  bulkOperation: boolean;
}

/**
 * Error state for different operations
 */
export interface ErrorState {
  sessions: string | null;
  clients: string | null;
  trainers: string | null;
  assignments: string | null;
  statistics: string | null;
  bulkOperation: string | null;
}

// ==================== THEME AND STYLING TYPES ====================

/**
 * Theme configuration for the schedule
 */
export interface ScheduleTheme {
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  breakpoints: {
    mobile: string;
    tablet: string;
    desktop: string;
  };
}

/**
 * Event styling configuration
 */
export interface EventStyling {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  borderRadius: string;
  padding: string;
  fontSize: string;
  fontWeight: string;
}

// ==================== PERMISSION TYPES ====================

/**
 * User permissions for schedule operations
 */
export interface SchedulePermissions {
  canViewAll: boolean;
  canCreateSessions: boolean;
  canEditSessions: boolean;
  canDeleteSessions: boolean;
  canAssignClients: boolean;
  canViewStatistics: boolean;
  canPerformBulkActions: boolean;
  canManageTrainers: boolean;
  canViewFinancials: boolean;
}

/**
 * Role-based access control
 */
export type UserRole = 'admin' | 'trainer' | 'client' | 'user';

// ==================== NOTIFICATION TYPES ====================

/**
 * Real-time notification types
 */
export interface ScheduleNotification {
  id: string;
  type: 'session_created' | 'session_updated' | 'session_cancelled' | 'assignment_created' | 'assignment_updated';
  title: string;
  message: string;
  userId: string;
  data: any;
  read: boolean;
  createdAt: string;
}

/**
 * WebSocket event types
 */
export interface WebSocketEvent {
  type: 'session_update' | 'assignment_update' | 'notification' | 'bulk_operation';
  data: any;
  timestamp: string;
  userId?: string;
}

// ==================== EXPORT TYPES ====================

/**
 * Export configuration
 */
export interface ExportConfig {
  format: 'csv' | 'excel' | 'pdf' | 'json';
  dateRange: {
    start: string;
    end: string;
  };
  filters: FilterOptions;
  includeFields: string[];
  groupBy?: 'trainer' | 'client' | 'date' | 'status';
}

/**
 * Import configuration
 */
export interface ImportConfig {
  format: 'csv' | 'excel' | 'json';
  mapping: Record<string, string>;
  options: {
    skipHeader: boolean;
    dateFormat: string;
    createMissingUsers: boolean;
  };
}

// ==================== UTILITY TYPES ====================

/**
 * Generic ID type
 */
export type ID = string | number;

/**
 * Timestamp type
 */
export type Timestamp = string;

/**
 * Optional fields utility type
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Required fields utility type
 */
export type RequiredFields<T, K extends keyof T> = T & { [P in K]-?: T[P] };

/**
 * Update payload type
 */
export type UpdatePayload<T> = Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>;

/**
 * Create payload type
 */
export type CreatePayload<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;

// ==================== CONSTANTS ====================

/**
 * Session status options
 */
export const SESSION_STATUSES = [
  'available',
  'requested',
  'scheduled',
  'confirmed',
  'completed',
  'cancelled'
] as const;

/**
 * Calendar view options
 */
export const CALENDAR_VIEWS = ['month', 'week', 'day', 'agenda'] as const;

/**
 * Bulk action options
 */
export const BULK_ACTIONS = [
  'confirm',
  'cancel',
  'delete',
  'reassign',
  'reschedule',
  'duplicate',
  'export'
] as const;

/**
 * User roles
 */
export const USER_ROLES = ['admin', 'trainer', 'client', 'user'] as const;

/**
 * Export formats
 */
export const EXPORT_FORMATS = ['csv', 'excel', 'pdf', 'json'] as const;

/**
 * Date range options
 */
export const DATE_RANGES = ['all', 'today', 'week', 'month', 'custom'] as const;
