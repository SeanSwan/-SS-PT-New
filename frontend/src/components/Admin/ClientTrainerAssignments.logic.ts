import type { AssignmentRow, AssignmentStats, ClientRow, TrainerRow } from './ClientTrainerAssignments.types';

export const parseClients = (payload: any): ClientRow[] => {
  const rows = payload?.data?.clients;
  if (!Array.isArray(rows)) return [];

  return rows.map((client: any) => ({
    id: Number(client.id),
    firstName: client.firstName || '',
    lastName: client.lastName || '',
    email: client.email || '',
    availableSessions: Number(client.availableSessions || 0),
    clientSource: client.clientSource || 'swanstudios',
    isActive: Boolean(client.isActive),
    photo: client.photo || null,
  }));
};

export const parseTrainers = (payload: any): TrainerRow[] => {
  const rows = Array.isArray(payload?.trainers)
    ? payload.trainers
    : Array.isArray(payload?.data?.trainers)
      ? payload.data.trainers
      : [];

  return rows.map((trainer: any) => ({
    id: Number(trainer.id),
    firstName: trainer.firstName || '',
    lastName: trainer.lastName || '',
    email: trainer.email || '',
    photo: trainer.photo || null,
    maxClients: Number(trainer.maxClients || 15),
    isActive: trainer.isActive !== false,
  }));
};

export const parseAssignments = (payload: any): AssignmentRow[] => {
  const rows = Array.isArray(payload?.assignments)
    ? payload.assignments
    : Array.isArray(payload)
      ? payload
      : [];

  return rows
    .map((row: any) => ({
      id: Number(row.id),
      clientId: Number(row.clientId),
      trainerId: Number(row.trainerId),
      status: row.status || 'active',
      notes: row.notes || null,
      createdAt: row.createdAt,
      client: row.client,
      trainer: row.trainer,
      compensationMode: row.compensationMode === 'per_session_flat' ? 'per_session_flat' : 'revenue_share',
      flatSessionRate: row.flatSessionRate != null && Number.isFinite(Number(row.flatSessionRate))
        ? Number(row.flatSessionRate)
        : null,
    }))
    .filter((row: AssignmentRow) => row.status === 'active');
};

export const buildAssignmentMap = (assignments: AssignmentRow[]) => {
  const map = new Map<number, AssignmentRow>();
  assignments.forEach((assignment) => map.set(assignment.clientId, assignment));
  return map;
};

export const filterUnassignedClients = (
  clients: ClientRow[],
  assignmentMapByClient: Map<number, AssignmentRow>,
  search: string
) => {
  const term = search.trim().toLowerCase();

  return clients
    .filter((client) => !assignmentMapByClient.has(client.id))
    .filter((client) => {
      if (!term) return true;
      const fullName = `${client.firstName} ${client.lastName}`.toLowerCase();
      return fullName.includes(term) || client.email.toLowerCase().includes(term);
    })
    .sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
    });
};

export const groupAssignmentsByTrainer = (assignments: AssignmentRow[], trainers: TrainerRow[]) => {
  const grouped = new Map<number, AssignmentRow[]>();
  trainers.forEach((trainer) => grouped.set(trainer.id, []));
  assignments.forEach((assignment) => {
    const rows = grouped.get(assignment.trainerId);
    if (rows) rows.push(assignment);
  });
  return grouped;
};

export const calculateAssignmentStats = ({
  assignments,
  assignmentMapByClient,
  clients,
  trainers,
}: {
  assignments: AssignmentRow[];
  assignmentMapByClient: Map<number, AssignmentRow>;
  clients: ClientRow[];
  trainers: TrainerRow[];
}): AssignmentStats => {
  const totalCapacity = trainers.reduce((sum, trainer) => sum + Number(trainer.maxClients || 15), 0);
  const activeAssignments = assignments.length;
  const unassigned = clients.filter((client) => !assignmentMapByClient.has(client.id)).length;
  const utilization = totalCapacity > 0 ? Math.round((activeAssignments / totalCapacity) * 100) : 0;
  const averageLoad = trainers.length > 0 ? Number((activeAssignments / trainers.length).toFixed(1)) : 0;

  return { activeAssignments, unassigned, utilization, averageLoad, totalTrainers: trainers.length };
};

export const initials = (firstName: string, lastName: string) =>
  `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'U';

export const getApiErrorMessage = (err: any, fallback: string) => err?.response?.data?.message || fallback;
