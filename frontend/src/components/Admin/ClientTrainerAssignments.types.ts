export interface ClientTrainerAssignmentsProps {
  onAssignmentChange?: () => void;
}

export interface AssignmentClient {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  availableSessions?: number;
  clientSource?: string;
  photo?: string | null;
}

export interface AssignmentTrainer {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  photo?: string | null;
  maxClients?: number;
}

export type AssignmentStatus = 'active' | 'inactive' | 'pending';

export type CompensationMode = 'revenue_share' | 'per_session_flat';

export interface AssignmentRow {
  id: number;
  clientId: number;
  trainerId: number;
  status: AssignmentStatus;
  notes?: string | null;
  createdAt?: string;
  client?: AssignmentClient;
  trainer?: AssignmentTrainer;
  compensationMode: CompensationMode;
  flatSessionRate: number | null;
}

export interface ClientRow {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  availableSessions: number;
  clientSource?: string;
  isActive: boolean;
  photo?: string | null;
}

export interface TrainerRow {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  photo?: string | null;
  maxClients?: number;
  isActive?: boolean;
}

export interface AssignmentStats {
  activeAssignments: number;
  unassigned: number;
  utilization: number;
  averageLoad: number;
  totalTrainers: number;
}
