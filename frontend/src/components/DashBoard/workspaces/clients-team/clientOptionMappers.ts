/**
 * PURPOSE: Typed mappers between Client Hub list cards and detail panes.
 */

import type { ClientOption } from './ClientSelectorDropdown';
import type { MiniCardClient } from './ClientMiniCard';

export const toMiniCardClient = (client: ClientOption | null): MiniCardClient | null => {
  if (!client) return null;

  const sessionsLeft = client.availableSessions || 0;

  return {
    id: client.id,
    firstName: client.firstName,
    lastName: client.lastName,
    email: client.email,
    status: client.isActive ? 'active' as const : 'inactive' as const,
    tier: sessionsLeft > 20 ? 'elite' : sessionsLeft > 0 ? 'premium' : 'starter',
    engagementScore: 50,
    lastWeighIn: null,
    sessionsLeft,
    workoutCount: client.workoutCount || 0,
  };
};
