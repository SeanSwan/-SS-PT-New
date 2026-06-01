import type { PlannerClient } from './WorkoutPlannerTypes';

export const parseWorkoutPlannerClientId = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }

  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!/^[1-9]\d*$/.test(trimmed)) return null;

  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
};

export const normalizeWorkoutPlannerClients = (clients: unknown): PlannerClient[] => {
  if (!Array.isArray(clients)) return [];

  return clients.flatMap((client) => {
    if (!client || typeof client !== 'object') return [];

    const normalizedId = parseWorkoutPlannerClientId((client as { id?: unknown }).id);
    if (!normalizedId) return [];

    return [{ ...(client as PlannerClient), id: normalizedId }];
  });
};

export const pickWorkoutPlannerClientId = (
  clients: readonly PlannerClient[],
  requestedClientId: number | null,
): number | null => {
  const validIds = clients
    .map((client) => parseWorkoutPlannerClientId(client.id))
    .filter((id): id is number => Boolean(id));

  if (requestedClientId && validIds.includes(requestedClientId)) {
    return requestedClientId;
  }

  return validIds[0] ?? null;
};

export const resolveWorkoutPlannerPlanClientId = (
  planUserId: unknown,
  selectedClientId: unknown,
): number | null => (
  parseWorkoutPlannerClientId(planUserId)
  ?? parseWorkoutPlannerClientId(selectedClientId)
);
