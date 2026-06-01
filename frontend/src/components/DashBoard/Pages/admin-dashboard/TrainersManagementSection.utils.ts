import type { BackendTrainerRecord, Trainer, TrainerStats } from './TrainersManagementSection.types';

const parseListField = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map(String).map((item) => item.trim()).filter(Boolean);
  }

  if (typeof value !== 'string' || value.trim() === '') {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.map(String).map((item) => item.trim()).filter(Boolean);
    }
  } catch {
    // Fall through to comma-separated parsing.
  }

  return value.split(',').map((item) => item.trim()).filter(Boolean);
};

export const mapBackendTrainerData = (backendTrainers: BackendTrainerRecord[]): Trainer[] => (
  backendTrainers.map((trainer) => {
    const certifications = parseListField(trainer.certifications);
    return {
      id: trainer.id?.toString() || '',
      name: `${trainer.firstName || ''} ${trainer.lastName || ''}`.trim(),
      email: trainer.email || '',
      phone: trainer.phone || '',
      avatar: trainer.photo || '',
      specialty: parseListField(trainer.specialties),
      certifications,
      verified: true,
      status: 'active',
      joinedAt: trainer.createdAt || new Date().toISOString(),
      lastActive: trainer.lastLogin || trainer.createdAt || new Date().toISOString(),
      stats: {
        activeClients: trainer.stats?.activeClients || 0,
        totalSessions: trainer.stats?.totalSessions || trainer.totalSessions || 0,
        monthlyRevenue: trainer.stats?.monthlyRevenue || 0,
        rating: trainer.stats?.rating || trainer.averageRating || 0,
        completedCertifications: certifications.length,
      },
      location: '',
      bio: trainer.bio || '',
    };
  })
);

export const calculateStats = (trainersData: Trainer[]): TrainerStats => {
  const totalTrainers = trainersData.length;
  const activeTrainers = trainersData.filter((trainer) => trainer.status === 'active').length;
  const pendingTrainers = trainersData.filter((trainer) => trainer.status === 'pending').length;
  const ratingTotal = trainersData.reduce((sum, trainer) => sum + trainer.stats.rating, 0);
  const avgRating = totalTrainers ? ratingTotal / totalTrainers : 0;
  const totalRevenue = trainersData.reduce((sum, trainer) => sum + trainer.stats.monthlyRevenue, 0);

  return {
    totalTrainers,
    activeTrainers,
    pendingTrainers,
    avgRating: Math.round(avgRating * 10) / 10,
    totalRevenue,
  };
};

export const filterTrainers = (
  trainers: Trainer[],
  searchTerm: string,
  statusFilter: string,
  specialtyFilter: string
) => {
  const normalizedSearch = searchTerm.toLowerCase();

  return trainers.filter((trainer) => {
    const matchesSearch = trainer.name.toLowerCase().includes(normalizedSearch)
      || trainer.email.toLowerCase().includes(normalizedSearch)
      || trainer.specialty.some((specialty) => specialty.toLowerCase().includes(normalizedSearch));
    const matchesStatus = statusFilter === 'all' || trainer.status === statusFilter;
    const matchesSpecialty = specialtyFilter === 'all' || trainer.specialty.includes(specialtyFilter);

    return matchesSearch && matchesStatus && matchesSpecialty;
  });
};

export const getSpecialties = (trainers: Trainer[]) => (
  Array.from(new Set(trainers.flatMap((trainer) => trainer.specialty)))
);

export const getUserInitials = (name: string) => (
  name.split(' ').map((part) => part[0]).join('').toUpperCase()
);

export const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();

export const getTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const diffMs = new Date().getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
};

export const formatCurrency = (amount: number) => (
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
);
