/**
 * MyClientsView.types.ts
 * ----------------------
 * Shared type contracts for the canonical trainer /clients surface.
 */

export type ClientSource = 'swanstudios' | 'move_fitness' | 'external';
export type ClientStatus = 'active' | 'inactive' | 'pending';
export type StatusFilter = 'all' | ClientStatus;
export type ClientMembershipLevel = 'basic' | 'premium' | 'elite';
export type TrainerClientIntent = 'log_workout' | null;

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  photo?: string;
  availableSessions: number;
  clientSource?: ClientSource;
  onboardingStatus?: string | null;
  onboardingComplete?: boolean;
  onboardingCompletionPercentage?: number | null;
  onboardingPct?: number | null;
  totalSessionsCompleted: number;
  lastSessionDate?: string;
  nextSessionDate?: string;
  status: ClientStatus;
  goals: {
    current: number;
    completed: number;
  };
  progress: {
    overallProgress: number;
    recentTrend: 'improving' | 'stable' | 'declining';
    lastAssessment?: string;
  };
  membershipLevel: ClientMembershipLevel;
  joinDate?: string | null;
  notes?: string;
}

export interface ClientAssignment {
  id: string;
  client: Client;
  assignedAt: string;
  notes?: string;
  isActive: boolean;
}
