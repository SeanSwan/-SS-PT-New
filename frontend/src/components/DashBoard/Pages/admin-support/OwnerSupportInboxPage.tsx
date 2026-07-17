/**
 * BLUEPRINT: SwanStudios Owner Report Room Inbox
 * MOUNT: /dashboard/admin/support via UniversalDashboardLayout role routes.
 * DATA: /api/admin/support/issues guarded by server-side requireSupportOwner.
 */
import React, { useCallback, useEffect, useState } from 'react';

import {
  adminSupportIssueClient,
  type AdminSupportIssueClient,
  type OwnerIssueQuery,
  type OwnerSupportIssue,
} from '../../../../services/adminSupportIssueService';
import type { SupportIssueSeverity, SupportIssueStatus } from '../../../../services/supportIssueService';
import {
  Alert, Button, Copy, Eyebrow, FieldLabel, Filters, Header, Input, Page,
  PaginationBar, Select, Status, Title, Workspace,
} from './OwnerSupportInbox.styles';
import SupportInboxQueue from './SupportInboxQueue';
import SupportIssueDetailPanel from './SupportIssueDetailPanel';

interface Props { client?: AdminSupportIssueClient }
interface Pagination { page: number; pageSize: number; total: number; pages: number }

const INITIAL_QUERY: OwnerIssueQuery = { page: 1, pageSize: 25 };
const INITIAL_PAGINATION: Pagination = { page: 1, pageSize: 25, total: 0, pages: 1 };

const OwnerSupportInboxPage: React.FC<Props> = ({ client = adminSupportIssueClient }) => {
  const [issues, setIssues] = useState<OwnerSupportIssue[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<OwnerSupportIssue | null>(null);
  const [query, setQuery] = useState<OwnerIssueQuery>(INITIAL_QUERY);
  const [pagination, setPagination] = useState<Pagination>(INITIAL_PAGINATION);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');

  const loadQueue = useCallback(async (nextQuery: OwnerIssueQuery) => {
    setLoading(true); setError('');
    try {
      const result = await client.listIssues(nextQuery);
      setIssues(result.issues);
      setPagination(result.pagination);
      setSelectedId((current) => current && result.issues.some((item) => item.id === current)
        ? current
        : result.issues[0]?.id ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The support queue could not be loaded.');
    } finally { setLoading(false); }
  }, [client]);

  const loadDetail = useCallback(async (issueId: string) => {
    setDetailLoading(true); setError('');
    try { setSelected(await client.getIssue(issueId)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'The issue detail could not be loaded.'); }
    finally { setDetailLoading(false); }
  }, [client]);

  useEffect(() => { void loadQueue(INITIAL_QUERY); }, [loadQueue]);
  useEffect(() => { if (selectedId) void loadDetail(selectedId); else setSelected(null); }, [selectedId, loadDetail]);

  const applyFilters = (event: React.FormEvent) => {
    event.preventDefault();
    const next = { ...query, search: search.trim() || undefined, page: 1 };
    setQuery(next); void loadQueue(next);
  };

  const changePage = (page: number) => {
    const next = { ...query, page };
    setQuery(next);
    void loadQueue(next);
  };

  const updated = (issue: OwnerSupportIssue) => {
    setSelected(issue);
    setIssues((current) => current.map((item) => item.id === issue.id ? { ...item, ...issue } : item));
  };

  return (
    <Page>
      <Header><div><Eyebrow>Private owner workspace</Eyebrow><Title>Report Room Inbox</Title><Copy>Review member reports, communicate safely, and copy a de-identified repair prompt for an engineering agent.</Copy></div></Header>
      <Filters onSubmit={applyFilters}>
        <FieldLabel>Search<Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Reference or title" /></FieldLabel>
        <FieldLabel>Status<Select value={query.status ?? ''} onChange={(event) => setQuery((current) => ({ ...current, status: (event.target.value || undefined) as SupportIssueStatus | undefined }))}><option value="">All statuses</option><option value="new">New</option><option value="triaged">Triaged</option><option value="in_progress">In progress</option><option value="waiting_on_reporter">Waiting</option><option value="resolved">Resolved</option><option value="closed">Closed</option><option value="duplicate">Duplicate</option></Select></FieldLabel>
        <FieldLabel>Severity<Select value={query.severity ?? ''} onChange={(event) => setQuery((current) => ({ ...current, severity: (event.target.value || undefined) as SupportIssueSeverity | undefined }))}><option value="">All severities</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></Select></FieldLabel>
        <Button type="submit" $primary>Apply filters</Button>
      </Filters>
      {error && <Alert role="alert">{error}</Alert>}
      <PaginationBar aria-label="Issue queue pagination">
        <Button type="button" onClick={() => changePage(pagination.page - 1)} disabled={loading || pagination.page <= 1}>Previous page</Button>
        <Status>Page {pagination.page} of {Math.max(1, pagination.pages)} | {pagination.total} reports</Status>
        <Button type="button" onClick={() => changePage(pagination.page + 1)} disabled={loading || pagination.page >= pagination.pages}>Next page</Button>
      </PaginationBar>
      <Workspace>
        <SupportInboxQueue issues={issues} selectedId={selectedId} loading={loading} onSelect={setSelectedId} />
        <SupportIssueDetailPanel issue={selected} loading={detailLoading} client={client} onUpdated={updated} onReload={() => selectedId ? loadDetail(selectedId) : Promise.resolve()} />
      </Workspace>
    </Page>
  );
};

export default OwnerSupportInboxPage;