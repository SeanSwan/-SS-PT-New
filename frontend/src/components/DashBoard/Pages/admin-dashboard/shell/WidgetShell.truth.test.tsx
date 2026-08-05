import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import WidgetShell, { formatAgo } from './WidgetShell';

const baseProps = {
  title: 'Test Widget',
  loading: false,
  error: null,
  empty: false,
  emptyMessage: 'Nothing to act on',
};

describe('WidgetShell state distinctness (SWA-138 S1 / blueprint C4)', () => {
  it('loading renders a skeleton, not the empty copy and not zeros', () => {
    const { container } = render(
      <WidgetShell {...baseProps} loading={true}>
        <div>real content</div>
      </WidgetShell>,
    );
    expect(screen.queryByText('Nothing to act on')).not.toBeInTheDocument();
    expect(screen.queryByText('real content')).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(/\b0\b/);
  });

  it('error with no data renders "Data unavailable" + Retry — NEVER the empty copy', async () => {
    const onRetry = vi.fn();
    render(
      <WidgetShell {...baseProps} error="Request failed" empty={true} onRetry={onRetry} />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Data unavailable — Request failed');
    expect(screen.queryByText('Nothing to act on')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('empty (no error) renders the explicit empty copy', () => {
    render(<WidgetShell {...baseProps} empty={true} />);
    expect(screen.getByText('Nothing to act on')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('error WITH stale data keeps children visible and shows a refresh-failed notice', () => {
    render(
      <WidgetShell {...baseProps} error="Request failed" hasData={true}>
        <div>stale but real content</div>
      </WidgetShell>,
    );
    expect(screen.getByText('stale but real content')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Refresh failed — showing last known data');
  });

  it('success renders children only', () => {
    render(
      <WidgetShell {...baseProps} hasData={true}>
        <div>live content</div>
      </WidgetShell>,
    );
    expect(screen.getByText('live content')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('refresh button is labeled, present, and disabled while refreshing', () => {
    const onRefresh = vi.fn();
    const { rerender } = render(
      <WidgetShell {...baseProps} hasData={true} onRefresh={onRefresh} />,
    );
    const btn = screen.getByRole('button', { name: 'Refresh Test Widget' });
    expect(btn).toBeEnabled();
    rerender(
      <WidgetShell {...baseProps} hasData={true} onRefresh={onRefresh} refreshing={true} />,
    );
    expect(screen.getByRole('button', { name: 'Refresh Test Widget' })).toBeDisabled();
  });

  it('shows freshness once lastUpdated exists', () => {
    render(
      <WidgetShell
        {...baseProps}
        hasData={true}
        lastUpdated={new Date(Date.now() - 5 * 60_000)}
      />,
    );
    expect(screen.getByText('updated 5m ago')).toBeInTheDocument();
  });
});

describe('formatAgo', () => {
  const base = new Date('2026-08-04T12:00:00Z');
  it('buckets seconds, minutes, hours', () => {
    expect(formatAgo(new Date(base.getTime() - 30_000), base)).toBe('updated just now');
    expect(formatAgo(new Date(base.getTime() - 90_000), base)).toBe('updated 2m ago');
    expect(formatAgo(new Date(base.getTime() - 2 * 3_600_000), base)).toBe('updated 2h ago');
  });
});
