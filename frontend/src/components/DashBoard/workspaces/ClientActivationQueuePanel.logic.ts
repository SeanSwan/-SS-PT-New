/**
 * ClientActivationQueuePanel.logic.ts
 * ===================================
 * Small mapping helpers for the paid-client activation queue panel.
 * Keeps route/API truth in clientActivationQueue while the mounted panel stays
 * focused on rendering and interaction wiring.
 */
import type { ClientOption } from './clients-team/ClientSelectorDropdown';
import type { ClientActivationQueueRow } from './clientActivationQueue';
import { normalizeClientOptionId } from './clients-team/clientOptionMappers';

export function rowToClientOption(row: ClientActivationQueueRow): ClientOption | null {
  const id = normalizeClientOptionId(row.client.id);
  if (!id) return null;

  return {
    id,
    firstName: row.client.firstName,
    lastName: row.client.lastName,
    email: row.client.email,
    clientSource: 'swanstudios',
    isActive: row.client.isActive,
    availableSessions: row.client.availableSessions,
  };
}
