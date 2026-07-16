import { describe, expect, it } from 'vitest';
import { filterEnhancedAdminClients, type AdminClientFilterInput } from './EnhancedAdminClientManagementView.logic';

const clients: AdminClientFilterInput[] = [
  {
    id: 'beginner-high',
    firstName: 'Ava',
    lastName: 'Strong',
    email: 'ava@example.com',
    username: 'avafit',
    clientSource: 'swanstudios',
    level: 5,
    engagementLevel: 'high',
  },
  {
    id: 'intermediate-medium',
    firstName: 'Marcus',
    lastName: 'Move',
    email: 'marcus@example.com',
    username: 'movefit',
    clientSource: 'move_fitness',
    level: 6,
    engagementLevel: 'medium',
  },
  {
    id: 'advanced-low',
    firstName: 'Nova',
    lastName: 'External',
    email: 'nova@example.com',
    username: 'nova',
    clientSource: 'external',
    level: 16,
    engagementLevel: 'low',
  },
];

describe('filterEnhancedAdminClients', () => {
  it('applies source, level, engagement, and search filters together', () => {
    const result = filterEnhancedAdminClients(clients, {
      sourceFilter: 'move_fitness',
      level: 'intermediate',
      engagement: 'medium',
      searchTerm: 'move',
    });

    expect(result.map(client => client.id)).toEqual(['intermediate-medium']);
  });

  it('honors the admin level buckets used by the visible dropdown', () => {
    expect(filterEnhancedAdminClients(clients, { sourceFilter: 'all', level: 'beginner' }).map(client => client.id))
      .toEqual(['beginner-high']);
    expect(filterEnhancedAdminClients(clients, { sourceFilter: 'all', level: 'intermediate' }).map(client => client.id))
      .toEqual(['intermediate-medium']);
    expect(filterEnhancedAdminClients(clients, { sourceFilter: 'all', level: 'advanced' }).map(client => client.id))
      .toEqual(['advanced-low']);
  });
});
