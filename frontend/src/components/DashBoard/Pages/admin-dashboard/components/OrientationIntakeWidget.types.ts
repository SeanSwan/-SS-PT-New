export interface OrientationQueueItem {
  id: number;
  fullName: string;
  email: string;
  createdAt: string;
  status?: 'pending' | 'scheduled' | 'completed' | 'cancelled';
  userId?: number | null;
  matchedUser?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

export type TagTone = 'default' | 'ok' | 'warn';
