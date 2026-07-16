import { describe, expect, it, vi } from 'vitest';

import { createSupportIssueClient } from './supportIssueService';

describe('supportIssueService', () => {
  it('creates a reporter-scoped issue through the exact support route', async () => {
    const issue = { id: 'issue-1', referenceCode: 'SWR-20260716-ABCDEF12' };
    const api = {
      get: vi.fn(),
      post: vi.fn().mockResolvedValue({ data: { success: true, issue } }),
    };
    const client = createSupportIssueClient(api);
    const request = {
      category: 'bug' as const,
      severity: 'medium' as const,
      source: 'text' as const,
      title: 'Workout logger will not save',
      description: 'The Save session button returns an error every time.',
      expectedBehavior: 'The workout should be saved once.',
      impact: 'I cannot finish today\'s training log.',
      reproductionSteps: ['Open Workout Logger', 'Select Save session'],
      diagnostics: { pathname: '/dashboard/client/log-workout' },
    };

    await expect(client.createIssue(request)).resolves.toEqual(issue);
    expect(api.post).toHaveBeenCalledWith('/api/support/issues', request);
  });

  it('loads the reporter history with bounded pagination', async () => {
    const response = {
      issues: [{ id: 'issue-1', referenceCode: 'SWR-20260716-ABCDEF12' }],
      pagination: { page: 2, pageSize: 10, total: 11, totalPages: 2 },
    };
    const api = {
      get: vi.fn().mockResolvedValue({ data: { success: true, ...response } }),
      post: vi.fn(),
    };
    const client = createSupportIssueClient(api);

    await expect(client.listIssues({ page: 2, pageSize: 10 })).resolves.toEqual(response);
    expect(api.get).toHaveBeenCalledWith('/api/support/issues', {
      params: { page: 2, pageSize: 10 },
    });
  });

  it('surfaces the safe server message without leaking response internals', async () => {
    const api = {
      get: vi.fn(),
      post: vi.fn().mockRejectedValue({
        response: { data: { message: 'Please review the highlighted issue details.' } },
      }),
    };
    const client = createSupportIssueClient(api);

    await expect(client.createIssue({} as never)).rejects.toThrow(
      'Please review the highlighted issue details.',
    );
  });
});
