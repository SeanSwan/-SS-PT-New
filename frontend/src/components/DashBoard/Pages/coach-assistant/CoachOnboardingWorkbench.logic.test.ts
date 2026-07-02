import { describe, expect, it } from 'vitest';
import type { ClientOption } from '../../workspaces/clients-team/ClientSelectorDropdown';
import {
  appendWorkbenchDirective,
  buildNextWorkbenchQuestion,
  buildRouteContextClient,
  buildWorkbenchCoverageCategories,
  filterWorkbenchClients,
  normalizeCoverageStatus,
  workbenchCompletionPercent,
} from './CoachOnboardingWorkbench.logic';

const sparseClient: ClientOption = {
  id: 77,
  firstName: 'Ava',
  lastName: 'Stone',
  email: 'ava@example.test',
  clientSource: 'move_fitness',
  onboardingFieldLedger: {
    summary: { completionPercentage: 31 },
    fields: [
      { key: 'primary_goal', status: 'known', category: 'goals_outcomes', label: 'Primary training goal' },
      { key: 'access_handoff_status', status: 'client_requested', category: 'account_identity_source', label: 'Claim/reset handoff' },
      { key: 'current_pain', status: 'client_requested', category: 'pain_body_map_movement_screen', label: 'Current pain map' },
    ],
  },
  onboardingMissingFields: [
    { key: 'health_concerns', status: 'client_requested', category: 'health_injury_risk', label: 'Health concerns' },
  ],
};

describe('CoachOnboardingWorkbench logic', () => {
  it('groups real ledger rows into the shared 15 onboarding categories', () => {
    const categories = buildWorkbenchCoverageCategories(sparseClient);

    expect(categories).toHaveLength(15);
    expect(categories.find((category) => category.key === 'goals_outcomes')).toMatchObject({
      label: 'Goals and outcomes',
      knownCount: 1,
      totalCount: 3,
    });
    expect(categories.find((category) => category.key === 'account_identity_source')?.fields)
      .toEqual(expect.arrayContaining([expect.objectContaining({ key: 'access_handoff_status', status: 'client_requested' })]));
  });

  it('picks a chart-priority missing question without blocking workout logging', () => {
    const nextQuestion = buildNextWorkbenchQuestion(sparseClient);

    expect(nextQuestion).toMatchObject({
      categoryLabel: 'Pain map and movement screen',
      fieldLabel: 'Current pain map',
      status: 'client_requested',
    });
    expect(nextQuestion?.command).toContain('prepare only a review-gated profile coverage proposal');
    expect(workbenchCompletionPercent(sparseClient)).toBe(31);
  });

  it('keeps client email out of Coach next-question prompts', () => {
    const emailOnlyClient = {
      ...sparseClient,
      id: 88,
      firstName: '',
      lastName: '',
      email: 'privacy.leak@example.test',
    } as ClientOption;

    const nextQuestion = buildNextWorkbenchQuestion(emailOnlyClient);

    expect(nextQuestion?.command).toContain('For Client #88');
    expect(nextQuestion?.command).not.toContain('privacy.leak@example.test');
  });

  it('filters rosters safely and normalizes follow-up statuses', () => {
    const clients = Array.from({ length: 90 }, (_, index) => ({
      id: index + 1,
      firstName: index === 10 ? 'Needle' : 'Client',
      lastName: String(index + 1),
      email: `client${index + 1}@example.test`,
      clientSource: index % 2 ? 'external' : 'swanstudios',
    } as ClientOption));

    expect(filterWorkbenchClients(clients, '', '')).toHaveLength(80);
    expect(filterWorkbenchClients(clients, 'needle', '')).toHaveLength(1);
    expect(filterWorkbenchClients(clients, '', 'external').every((client) => client.clientSource === 'external')).toBe(true);
    expect(normalizeCoverageStatus('ask_client_later')).toBe('client_requested');
    expect(appendWorkbenchDirective('Existing note', 'Ask later')).toBe('Existing note\nAsk later');
    expect(buildRouteContextClient(44, 'Client #44')).toMatchObject({ id: 44, firstName: 'Client #44' });
  });
});
