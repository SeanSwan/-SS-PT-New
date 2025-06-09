/**
 * SessionDashboard Module Index
 * Exports all session management components with integrated error boundaries
 */

// Core session management components
export { default as SessionDashboard } from './SessionDashboard';
export { default as AdminSessionManager } from './AdminSessionManager';
export { default as TrainerClientSessions } from './TrainerClientSessions';
export { default as FloatingSessionWidget } from './FloatingSessionWidget';
export { default as SessionDashboardIntegration } from './SessionDashboardIntegration';

// Error boundary components
export { default as SessionErrorBoundary, SessionErrorFallback } from './SessionErrorBoundary';

// Re-export session context for convenience
export { useSession } from '../../context/SessionContext';
export type { 
  WorkoutSession, 
  SessionExercise, 
  ExerciseSet, 
  SessionAnalytics 
} from '../../context/SessionContext';
