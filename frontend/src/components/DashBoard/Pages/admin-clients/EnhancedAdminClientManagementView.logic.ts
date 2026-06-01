export interface AdminClientFilterInput {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  username?: string;
  clientSource?: string;
  level?: number;
  engagementLevel?: string;
}

export interface AdminClientFilters {
  sourceFilter?: 'all' | 'swanstudios' | 'move_fitness' | 'external' | string;
  searchTerm?: string;
  level?: string;
  engagement?: string;
}

const normalizeSearch = (value?: string) => (value || '').trim().toLowerCase();

const matchesLevel = (clientLevel: unknown, levelFilter?: string) => {
  if (!levelFilter) return true;

  const level = Number(clientLevel);
  if (!Number.isFinite(level)) return false;

  if (levelFilter === 'beginner') return level >= 1 && level <= 5;
  if (levelFilter === 'intermediate') return level >= 6 && level <= 15;
  if (levelFilter === 'advanced') return level >= 16;
  return true;
};

export const filterEnhancedAdminClients = <T extends AdminClientFilterInput>(
  clients: T[],
  filters: AdminClientFilters
): T[] => {
  const sourceFilter = filters.sourceFilter || 'all';
  const search = normalizeSearch(filters.searchTerm);

  return clients.filter((client) => {
    const clientSource = client.clientSource || 'swanstudios';
    if (sourceFilter !== 'all' && clientSource !== sourceFilter) return false;

    if (filters.engagement && client.engagementLevel !== filters.engagement) return false;
    if (!matchesLevel(client.level, filters.level)) return false;

    if (!search) return true;

    const searchable = [
      client.firstName,
      client.lastName,
      client.email,
      client.username,
      `${client.firstName || ''} ${client.lastName || ''}`,
    ].join(' ').toLowerCase();

    return searchable.includes(search);
  });
};
