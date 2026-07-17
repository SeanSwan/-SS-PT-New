/**
 * Private owner inbox API contract tests.
 */
import { describe, expect, it, vi } from 'vitest';

import { createAdminSupportIssueClient } from './adminSupportIssueService';

describe('adminSupportIssueService', () => {
  it('uses the Sean-only support routes for queue, detail, triage, notes, and replies', async () => {
    const api = {
      get: vi.fn()
        .mockResolvedValueOnce({ data: { issues: [], pagination: { page: 1, pageSize: 25, total: 0, pages: 0 } } })
        .mockResolvedValueOnce({ data: { issue: { id: 'issue-1' } } })
        .mockResolvedValueOnce({ data: { referenceCode: 'SWR-1', prompt: '# Fix issue' } }),
      post: vi.fn()
        .mockResolvedValueOnce({ data: { event: { id: 1 } } })
        .mockResolvedValueOnce({ data: { event: { id: 2 } } }),
      patch: vi.fn().mockResolvedValue({ data: { issue: { id: 'issue-1', status: 'in_progress' } } }),
    };
    const client = createAdminSupportIssueClient(api);

    await client.listIssues({ status: 'new', search: 'logger', page: 1, pageSize: 25 });
    await client.getIssue('issue-1');
    await client.updateIssue('issue-1', { status: 'in_progress', severity: 'high' });
    await client.addNote('issue-1', 'Checking the canonical route.');
    await client.addReply('issue-1', 'I am investigating this now.');
    await client.getRepairPrompt('issue-1');

    expect(api.get).toHaveBeenNthCalledWith(1, '/api/admin/support/issues', {
      params: { status: 'new', search: 'logger', page: 1, pageSize: 25 },
    });
    expect(api.get).toHaveBeenNthCalledWith(2, '/api/admin/support/issues/issue-1');
    expect(api.patch).toHaveBeenCalledWith('/api/admin/support/issues/issue-1', {
      status: 'in_progress', severity: 'high',
    });
    expect(api.post).toHaveBeenNthCalledWith(1, '/api/admin/support/issues/issue-1/notes', {
      body: 'Checking the canonical route.',
    });
    expect(api.post).toHaveBeenNthCalledWith(2, '/api/admin/support/issues/issue-1/replies', {
      body: 'I am investigating this now.',
    });
    expect(api.get).toHaveBeenNthCalledWith(3, '/api/admin/support/issues/issue-1/repair-prompt');
  });
});
