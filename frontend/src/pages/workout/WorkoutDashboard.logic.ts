export interface WorkoutDashboardUser {
  id: string | number;
  role?: string | null;
}

export interface WorkoutDashboardClient {
  id: string | number;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  username?: string | null;
}

interface DashboardHttpClient {
  get<T = unknown>(url: string): Promise<{ data: T }>;
}

interface TrainerAssignment {
  client?: WorkoutDashboardClient | null;
  Client?: WorkoutDashboardClient | null;
}

interface DashboardClientsPayload {
  clients?: WorkoutDashboardClient[];
  data?: {
    clients?: WorkoutDashboardClient[];
  };
}

interface TrainerAssignmentsPayload {
  assignments?: TrainerAssignment[];
  data?: {
    assignments?: TrainerAssignment[];
  };
}

export const isWorkoutDashboardStaffRole = (role?: string | null): boolean => (
  role === 'admin' || role === 'trainer'
);

export const getWorkoutDashboardClientsUrl = (user: WorkoutDashboardUser): string =>
  user.role === 'trainer'
    ? `/api/client-trainer-assignments/trainer/${user.id}`
    : '/api/auth/clients';

export const normalizeWorkoutDashboardClients = (
  payload: DashboardClientsPayload | TrainerAssignmentsPayload,
  role?: string | null
): WorkoutDashboardClient[] => {
  if (role === 'trainer') {
    const assignments =
      (payload as TrainerAssignmentsPayload).assignments
      ?? (payload as TrainerAssignmentsPayload).data?.assignments
      ?? [];

    return assignments
      .map((assignment) => assignment.client ?? assignment.Client)
      .filter((client): client is WorkoutDashboardClient => Boolean(client?.id));
  }

  return (
    (payload as DashboardClientsPayload).clients
    ?? (payload as DashboardClientsPayload).data?.clients
    ?? []
  ).filter((client): client is WorkoutDashboardClient => Boolean(client?.id));
};

export const getWorkoutDashboardClients = async (
  authAxios: DashboardHttpClient,
  user: WorkoutDashboardUser
): Promise<WorkoutDashboardClient[]> => {
  const response = await authAxios.get<DashboardClientsPayload | TrainerAssignmentsPayload>(
    getWorkoutDashboardClientsUrl(user)
  );

  return normalizeWorkoutDashboardClients(response.data, user.role);
};

export const getDashboardClientLabel = (client: WorkoutDashboardClient): string => {
  const name = [client.firstName, client.lastName].filter(Boolean).join(' ').trim();
  const displayName = name || client.username || `Client ${client.id}`;

  return client.email ? `${displayName} (${client.email})` : displayName;
};

export const getInitialWorkoutDashboardClientId = (
  routeUserId: string | undefined,
  user: WorkoutDashboardUser | null | undefined,
  clients: WorkoutDashboardClient[]
): string => {
  if (routeUserId) return routeUserId;
  if (isWorkoutDashboardStaffRole(user?.role) && clients.length > 0) {
    return String(clients[0].id);
  }

  return user?.id == null ? '' : String(user.id);
};

export const isWorkoutDashboardAuthorized = (
  user: WorkoutDashboardUser | null | undefined,
  routeUserId?: string
): boolean => {
  if (!user) return false;
  if (!routeUserId) return true;
  if (String(user.id) === String(routeUserId)) return true;

  return isWorkoutDashboardStaffRole(user.role);
};
