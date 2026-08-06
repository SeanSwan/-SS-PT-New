/**
 * SWA-138 S14 — delete-to-archive contracts.
 * Sean's ask: "I should be able to delete them, and then they can be saved and
 * archived somewhere else where I can see all the messages that have been
 * archived." Dismiss therefore ARCHIVES — it never destroys — and the archive
 * renders from a snapshot so it stays readable after the source stops emitting.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AlertArchiveView from './AlertArchiveView';
import AlertsToolbar from './AlertsToolbar';
import type { ArchivedAlert } from './ContactNotifications.alertState';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
const base = 'src/components/DashBoard/Pages/admin-dashboard/components/';
const hook = read(`${base}ContactNotifications.alertState.ts`);
const widget = read(`${base}ContactNotifications.tsx`);
const item = read(`${base}ContactNotificationItem.tsx`);
const routes = read('../backend/routes/adminAlertStateRoutes.mjs');

const entry: ArchivedAlert = {
  refType: 'finance',
  refId: 'fin_test_1',
  archivedAt: '2026-08-06T12:00:00Z',
  snapshot: { title: 'Large transaction', message: 'A test alert', type: 'purchase', priority: 'medium' },
};

describe('archive view', () => {
  it('renders archived entries from their snapshot, with a restore action', async () => {
    const onRestore = vi.fn();
    render(<AlertArchiveView entries={[entry]} onRestore={onRestore} />);
    expect(screen.getByText('Large transaction')).toBeInTheDocument();
    expect(screen.getByText('A test alert')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Restore Large transaction/ }));
    expect(onRestore).toHaveBeenCalledWith(entry);
  });

  it('falls back to the ref when a snapshot is missing — never a blank row', () => {
    render(<AlertArchiveView entries={[{ ...entry, snapshot: null }]} onRestore={vi.fn()} />);
    expect(screen.getByText('Archived alert')).toBeInTheDocument();
    expect(screen.getByText('finance #fin_test_1')).toBeInTheDocument();
  });

  it('an empty archive says so explicitly', () => {
    render(<AlertArchiveView entries={[]} onRestore={vi.fn()} />);
    expect(screen.getByText('Nothing archived yet.')).toBeInTheDocument();
  });
});

describe('toolbar controls', () => {
  const baseProps = {
    unreadCount: 3, visibleCount: 5, showActions: true, refreshing: false,
    showUnreadOnly: false, view: 'active' as const,
    onSetView: vi.fn(), onToggleUnreadOnly: vi.fn(), onClearAll: vi.fn(),
    onMarkAllRead: vi.fn(), onRefresh: vi.fn(),
  };

  it('offers Clear all, which archives every listed alert', async () => {
    const onClearAll = vi.fn();
    render(<AlertsToolbar {...baseProps} onClearAll={onClearAll} />);
    await userEvent.click(screen.getByTitle('Clear all — moves every listed alert to the archive'));
    expect(onClearAll).toHaveBeenCalled();
  });

  it('disables Clear all when there is nothing listed, and while viewing the archive', () => {
    const { rerender } = render(<AlertsToolbar {...baseProps} visibleCount={0} />);
    expect(screen.getByTitle(/Clear all/)).toBeDisabled();
    rerender(<AlertsToolbar {...baseProps} view="archived" />);
    expect(screen.getByTitle(/Clear all/)).toBeDisabled();
  });

  it('switches between the Active and Archived views', async () => {
    const onSetView = vi.fn();
    render(<AlertsToolbar {...baseProps} onSetView={onSetView} />);
    await userEvent.click(screen.getByRole('button', { name: /Archived/ }));
    expect(onSetView).toHaveBeenCalledWith('archived');
  });
});

describe('dismiss is archive, never destruction', () => {
  it('each alert row exposes a dismiss control that archives it', () => {
    expect(item).toContain('move "${notification.title}" to the archive');
    expect(item).toContain('onDismiss(notification)');
    expect(widget).toContain('onDismiss={handleDismiss}');
  });

  it('the hook archives with a snapshot and never calls a delete endpoint', () => {
    expect(hook).toContain("authAxios.post('/api/admin/alert-state/archive', { ...ref, snapshot: snapshotOf(n) })");
    expect(hook).toContain("op: 'archive'");
    expect(hook).not.toMatch(/authAxios\.delete/);
  });

  it('clear-all batches within the API cap rather than dropping items', () => {
    expect(hook).toContain('i += 100');
    expect(hook).toContain('items.slice(i, i + 100)');
  });

  it('the backend stores a sanitized snapshot and can list + restore', () => {
    expect(routes).toContain('function sanitizeSnapshot');
    expect(routes).toContain("router.get('/alert-state/archived'");
    expect(routes).toContain("router.post('/alert-state/restore'");
    // Snapshot is written once — a later ack must not rewrite history.
    expect(routes).toContain('if (snapshot && !row.snapshot) patch.snapshot = snapshot;');
  });
});
