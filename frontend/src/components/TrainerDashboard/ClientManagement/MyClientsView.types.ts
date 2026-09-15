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
  fitnessGoal?: string | null;
  trainingExperience?: string | null;
  onboardingStatus?: string | null;
  onboardingComplete?: boolean;
  onboardingCompletionPercentage?: number | null;
  onboardingPct?: number | null;
  // null = unknown (per-client stats could not be loaded) — the UI renders
  // "Logs unavailable" instead of fabricating a zero (dual-review Slice 1).
  totalSessionsCompleted: number | null;
  /** Batched server-side summary from the assignments endpoint; when present the UI never fabricates stats. */
  rosterSummary?: {
    totalCompletedSessions: number;
    lastSessionDate: string | null;
    nextSessionDate: string | null;
  };
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
