/**
 * MODULE: trainerClientSource
 * PURPOSE: Resolves role-aware trainer dashboard client selectors.
 */

export type TrainerClientSourceMode = 'admin-roster' | 'trainer-assignments';

export type TrainerClientOption = {
  id: number;
  name: string;
};

export const parseTrainerClientId = (value: string | number | null | undefined): number | null => {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }

  const trimmedValue = value?.trim();
  if (!trimmedValue || !/^[1-9]\d*$/.test(trimmedValue)) {
    return null;
  }

  const parsedValue = Number(trimmedValue);
  return Number.isSafeInteger(parsedValue) ? parsedValue : null;
};

export const toTrainerClientName = (client: any) =>
  `${client.firstName || ''} ${client.lastName || ''}`.trim() || client.username || `Client ${client.id}`;

export const resolveTrainerClientSource = (user: any): { mode: TrainerClientSourceMode; path: string } => {
  const role = user?.role === 'user' ? 'client' : user?.role;

  if (role === 'trainer' && user?.id) {
    return {
      mode: 'trainer-assignments',
      path: `/api/client-trainer-assignments/trainer/${user.id}`,
    };
  }

  return {
    mode: 'admin-roster',
    path: '/api/admin/clients',
  };
};

export const normalizeTrainerClientOptions = (
  payload: any,
  mode: TrainerClientSourceMode
): TrainerClientOption[] => {
  const rows = mode === 'trainer-assignments'
    ? (Array.isArray(payload?.assignments) ? payload.assignments : payload || [])
      .map((assignment: any) => assignment?.client)
      .filter(Boolean)
    : Array.isArray(payload?.data)
      ? payload.data
      : payload?.data?.clients || [];

  return (Array.isArray(rows) ? rows : []).map((client: any) => ({
    id: client.id,
    name: toTrainerClientName(client),
  }));
};
