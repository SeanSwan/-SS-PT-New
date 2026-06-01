export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  photo?: string;
  clientSource?: string;
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
  status: 'available' | 'requested' | 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'assigned';
  client?: Client | null;
  trainer?: Trainer | null;
}

export type SessionStatus = Session['status'];

export interface WorkoutLog {
  id: number;
  exerciseName: string;
  setNumber: number;
  reps: number;
  weight: number;
  tempo?: string;
  rest?: number;
  rpe?: number;
  notes?: string;
}

export interface WorkoutSessionData {
  id: string;
  title?: string;
  intensity?: number;
  totalSets?: number;
  totalReps?: number;
  totalWeight?: number;
  logs: WorkoutLog[];
}

export interface ViewSessionModalProps {
  open: boolean;
  onClose: () => void;
  session: Session | null;
  onEdit: (session: Session) => void;
}
