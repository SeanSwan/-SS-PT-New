export interface Client {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  availableSessions: number;
  clientSource?: string;
  totalSessionsPurchased: number;
  sessionsUsed: number;
  lastSessionDate?: string;
  createdAt: string;
}

export interface SessionClientResponse {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  availableSessions?: number;
  clientSource?: string;
  createdAt?: string;
}

export interface SessionSummary {
  userId: number;
  available: number;
  scheduled: number;
  completed: number;
  cancelled: number;
  total: number;
}

export interface SessionAllocationStats {
  totalClients: number;
  totalAvailableSessions: number;
  totalCompletedSessions: number;
  clientsNeedingSessions: number;
}

export interface SessionAllocationManagerProps {
  onSessionCountChange?: () => void;
}

export type SessionBadgeTone = 'good' | 'low' | 'none' | 'neutral';
