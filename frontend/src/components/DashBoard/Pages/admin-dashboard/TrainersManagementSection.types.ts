export interface Trainer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  specialty: string[];
  certifications: string[];
  verified: boolean;
  status: 'active' | 'inactive' | 'pending';
  joinedAt: string;
  lastActive: string;
  stats: {
    activeClients: number;
    totalSessions: number;
    monthlyRevenue: number;
    rating: number;
    completedCertifications: number;
  };
  location?: string;
  bio?: string;
}

export interface TrainerStats {
  totalTrainers: number;
  activeTrainers: number;
  pendingTrainers: number;
  avgRating: number;
  totalRevenue: number;
}

export interface BackendTrainerRecord {
  id?: string | number;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  photo?: string;
  specialties?: unknown;
  certifications?: unknown;
  createdAt?: string;
  lastLogin?: string;
  totalSessions?: number;
  averageRating?: number;
  bio?: string;
  stats?: {
    activeClients?: number;
    totalSessions?: number;
    monthlyRevenue?: number;
    rating?: number;
  };
}
