import type { Session } from './ViewSessionModal.types';
import type { AdminSessionsSortKey } from './AdminSessionsTablePanel';

export type AdminSessionsSortConfig = {
  key: AdminSessionsSortKey;
  direction: 'ascending' | 'descending';
};

export interface AdminSessionsFilterConfig {
  searchTerm: string;
  statusFilter: string;
  startDate: string;
  endDate: string;
}

export interface AdminSessionsStatsData {
  todaySessions: number;
  completedHours: number;
  activeTrainers: number;
  completionRate: number;
}

export interface AdminSessionsPaginationResult {
  paginatedSessions: Session[];
  totalPages: number;
  displayStart: number;
  displayEnd: number;
}

const isValidDate = (date: Date) => !Number.isNaN(date.getTime());

const parseLocalFilterDate = (dateString: string, endOfDay = false) => {
  const [year, month, day] = dateString.split('-').map(Number);
  if (!year || !month || !day) return new Date(dateString);
  return new Date(year, month - 1, day, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
};

export const calculateAdminSessionStats = (
  sessions: Session[],
  todayDate = new Date(),
): AdminSessionsStatsData => {
  const today = todayDate.toLocaleDateString();
  const todaySessions = sessions.filter((session) =>
    new Date(session.sessionDate).toLocaleDateString() === today
  ).length;
  const completedSessions = sessions.filter((session) => session.status === 'completed');
  const completedHours = completedSessions.reduce((total, session) => total + (session.duration / 60), 0);
  const activeTrainers = new Set(
    sessions
      .filter((session) => session.trainerId)
      .map((session) => session.trainerId),
  ).size;
  const relevantSessionsForRate = sessions.filter((session) =>
    ['scheduled', 'confirmed', 'completed'].includes(session.status)
  );
  const completionRate = relevantSessionsForRate.length > 0
    ? Math.round((completedSessions.length / relevantSessionsForRate.length) * 100)
    : 0;

  return {
    todaySessions,
    completedHours: Math.round(completedHours * 10) / 10,
    activeTrainers,
    completionRate,
  };
};

export const filterAdminSessions = (
  sessions: Session[],
  filters: AdminSessionsFilterConfig,
): Session[] => sessions.filter((session) => {
  const hasRealClient = Boolean(session.client?.id);

  if (!hasRealClient && session.status !== 'available') {
    return false;
  }

  const clientName = session.client
    ? `${session.client.firstName} ${session.client.lastName}`.toLowerCase()
    : '';
  const trainerName = session.trainer
    ? `${session.trainer.firstName} ${session.trainer.lastName}`.toLowerCase()
    : '';
  const searchTerm = filters.searchTerm.toLowerCase();
  const matchesSearch =
    clientName.includes(searchTerm) ||
    trainerName.includes(searchTerm) ||
    (session.location || '').toLowerCase().includes(searchTerm) ||
    (session.id || '').toString().toLowerCase().includes(searchTerm) ||
    (session.status || '').toLowerCase().includes(searchTerm);
  const matchesStatus = filters.statusFilter === 'all' || session.status === filters.statusFilter;

  let matchesDate = true;
  if (filters.startDate) {
    const start = parseLocalFilterDate(filters.startDate);
    matchesDate = matchesDate && new Date(session.sessionDate) >= start;
  }
  if (filters.endDate) {
    const end = parseLocalFilterDate(filters.endDate, true);
    matchesDate = matchesDate && new Date(session.sessionDate) <= end;
  }

  return matchesSearch && matchesStatus && matchesDate;
});

const getSortValue = (session: Session, key: AdminSessionsSortKey): string | number => {
  switch (key) {
    case 'client':
      return session.client ? `${session.client.firstName} ${session.client.lastName}`.toLowerCase() : 'zzzz';
    case 'trainer':
      return session.trainer ? `${session.trainer.firstName} ${session.trainer.lastName}`.toLowerCase() : 'zzzz';
    case 'sessionDate':
      return new Date(session.sessionDate).getTime();
    case 'duration':
      return session.duration;
    case 'location':
      return session.location || '';
    case 'status':
      return session.status || '';
    default:
      return '';
  }
};

export const sortAdminSessions = (
  sessions: Session[],
  sortConfig: AdminSessionsSortConfig,
): Session[] => [...sessions].sort((a, b) => {
  const aValue = getSortValue(a, sortConfig.key);
  const bValue = getSortValue(b, sortConfig.key);

  if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
  if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
  return 0;
});

export const formatSessionDate = (dateString: string | null | undefined) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (!isValidDate(date)) return 'Invalid Date';

  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatSessionTime = (dateString: string | null | undefined) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (!isValidDate(date)) return 'Invalid Time';

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const paginateAdminSessions = (
  sessions: Session[],
  page: number,
  rowsPerPage: number,
): AdminSessionsPaginationResult => {
  const totalPages = Math.ceil(sessions.length / rowsPerPage);
  const paginatedSessions = sessions.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const displayStart = sessions.length === 0 ? 0 : page * rowsPerPage + 1;
  const displayEnd = Math.min((page + 1) * rowsPerPage, sessions.length);

  return { paginatedSessions, totalPages, displayStart, displayEnd };
};

const csvCell = (value: string | number | null | undefined) => {
  const text = value == null ? 'N/A' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const buildAdminSessionsCsv = (
  sessions: Session[],
  formatters: {
    formatDate: (dateString: string | null | undefined) => string;
    formatTime: (dateString: string | null | undefined) => string;
  },
) => {
  const headers = ['Session ID', 'Date', 'Time', 'Client Name', 'Trainer Name', 'Status', 'Duration (min)', 'Location'];
  const rows = sessions.map((session) => [
    session.id,
    formatters.formatDate(session.sessionDate),
    formatters.formatTime(session.sessionDate),
    session.client ? `${session.client.firstName} ${session.client.lastName}` : 'N/A',
    session.trainer ? `${session.trainer.firstName} ${session.trainer.lastName}` : 'N/A',
    session.status,
    session.duration,
    session.location || 'N/A',
  ].map(csvCell).join(','));

  return [headers.join(','), ...rows].join('\n');
};
