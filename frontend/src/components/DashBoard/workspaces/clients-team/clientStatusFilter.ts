/**
 * PURPOSE: Pure status filtering for the Client Hub roster grid.
 * Status semantics follow User.accountStatus ('stub' = admin-created no
 * login, 'invited' = claim token sent, 'active' = can log in) plus the
 * isActive soft-deactivation flag. Deactivation wins over claim state.
 */

import type { ClientOption } from './ClientSelectorDropdown';

export type ClientHubStatusFilter = 'all' | 'active' | 'deactivated' | 'unclaimed' | 'invited';

export interface ClientHubStatusCounts {
  all: number;
  active: number;
  deactivated: number;
  unclaimed: number;
  invited: number;
}

export const CLIENT_HUB_STATUS_FILTERS: readonly { id: ClientHubStatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'deactivated', label: 'Deactivated' },
  { id: 'unclaimed', label: 'Unclaimed' },
  { id: 'invited', label: 'Invited' },
];

const isDeactivated = (client: ClientOption) => client.isActive === false;
const isUnclaimed = (client: ClientOption) => !isDeactivated(client) && client.accountStatus === 'stub';
const isInvited = (client: ClientOption) => !isDeactivated(client) && client.accountStatus === 'invited';

const MATCHERS: Record<ClientHubStatusFilter, (client: ClientOption) => boolean> = {
  all: () => true,
  active: (client) => !isDeactivated(client),
  deactivated: isDeactivated,
  unclaimed: isUnclaimed,
  invited: isInvited,
};

export const filterClientsByStatus = (
  clients: ClientOption[],
  filter: ClientHubStatusFilter,
): ClientOption[] => clients.filter(MATCHERS[filter] ?? MATCHERS.all);

export const getClientStatusCounts = (clients: ClientOption[]): ClientHubStatusCounts =>
  clients.reduce<ClientHubStatusCounts>(
    (counts, client) => ({
      all: counts.all + 1,
      active: counts.active + (isDeactivated(client) ? 0 : 1),
      deactivated: counts.deactivated + (isDeactivated(client) ? 1 : 0),
      unclaimed: counts.unclaimed + (isUnclaimed(client) ? 1 : 0),
      invited: counts.invited + (isInvited(client) ? 1 : 0),
    }),
    { all: 0, active: 0, deactivated: 0, unclaimed: 0, invited: 0 },
  );
