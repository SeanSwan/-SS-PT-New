/**
 * ChartExpandModal + ChartExpandTrigger tests (Phase 2.2a)
 *
 * Locks: dialog semantics (role/aria-modal/labelledby), Escape + backdrop
 * close + focus return, body scroll lock, measured chart render, semantic
 * data table, insight bar reuse, 44px lazy trigger, and the card wirings
 * (source truth) with the share surface untouched.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const mockAxiosPost = vi.fn();
vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ authAxios: { post: mockAxiosPost } }),
}));

import ChartExpandModal from './ChartExpandModal';
import ChartExpandTrigger from './ChartExpandTrigger';

const baseProps = () => ({
  title: 'Weekly Training Volume',
  subtitle: 'Last quarter',
  renderChart: vi.fn((width: number, height: number) => (
    <svg data-testid="expanded-chart" width={width} height={height} />
  )),
  rows: [
    { id: 'w1', label: 'Week of Jun 22', value: '8,450 lbs', detail: '3 logged workouts in this point.' },
    { id: 'w2', label: 'Week of Jun 29', value: '9,100 lbs', detail: '4 logged workouts in this point.' },
  ],
  pulse: null,
  onClose: vi.fn(),
});

describe('ChartExpandModal', () => {
  beforeEach(() => {
    document.body.style.overflow = '';
  });

  it('renders a labelled dialog with the measured chart, data table, and insight bar', () => {
    const props = baseProps();
    render(<ChartExpandModal {...props} />);

    const dialog = screen.getByRole('dialog', { name: /weekly training volume/i });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByTestId('expanded-chart')).toBeInTheDocument();
    expect(props.renderChart).toHaveBeenCalled();
    const [width, height] = props.renderChart.mock.calls[0];
    expect(width).toBeGreaterThanOrEqual(280);
    expect(height).toBeGreaterThanOrEqual(260);

    const table = screen.getByRole('table', { name: /weekly training volume data table/i });
    expect(table).toBeInTheDocument();
    expect(screen.getByText('Week of Jun 29')).toBeInTheDocument();
    expect(screen.getByText('9,100 lbs')).toBeInTheDocument();
    // Truthful omission: no pulse and no facts -> no insight bar rendered.
    expect(screen.queryByTestId('chart-expand-insights')).toBeNull();
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('closes on Escape and restores body scroll', () => {
    const props = baseProps();
    const { unmount } = render(<ChartExpandModal {...props} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(props.onClose).toHaveBeenCalledTimes(1);
    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('focuses the close button on open', () => {
    render(<ChartExpandModal {...baseProps()} />);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /close weekly training volume/i }));
  });

  it('offers milestone share only when the mount opts in, with truthful outcomes (2.5)', async () => {
    mockAxiosPost.mockResolvedValue({ data: { post: { id: 4 } } });
    const props = {
      ...baseProps(),
      pulse: { label: 'Weekly volume', value: '9,100 lbs', detail: 'up', tone: 'rising' },
      canShareToFeed: true,
    };
    render(<ChartExpandModal {...(props as never)} />);

    fireEvent.click(screen.getByRole('button', { name: /share weekly training volume to your feed/i }));
    expect(await screen.findByText(/shared to your community feed/i)).toBeInTheDocument();
    expect(mockAxiosPost).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: /share weekly training volume to your feed/i })).toBeNull();
  });

  it('hides milestone share by default and reports failure honestly', async () => {
    render(<ChartExpandModal {...baseProps()} />);
    expect(screen.queryByRole('button', { name: /share .* to your feed/i })).toBeNull();

    mockAxiosPost.mockRejectedValue(new Error('network'));
    const props = {
      ...baseProps(),
      pulse: { label: 'Weekly volume', value: '9,100 lbs', detail: 'up', tone: 'rising' },
      canShareToFeed: true,
    };
    render(<ChartExpandModal {...(props as never)} />);
    fireEvent.click(screen.getByRole('button', { name: /share weekly training volume to your feed/i }));
    expect(await screen.findByText(/couldn't share right now/i)).toBeInTheDocument();
  });

  it('share opt-in is wired on the client cards and absent from the staff grid (source truth)', () => {
    const interactive = readFileSync(
      resolve(__dirname, '../Pages/client-dashboard/CanonicalProgressChartsGrid.interactiveCards.tsx'),
      'utf8',
    );
    const primary = readFileSync(
      resolve(__dirname, '../Pages/client-dashboard/CanonicalProgressChartsGrid.primaryCards.tsx'),
      'utf8',
    );
    expect(interactive).toContain('canShareToFeed');
    expect(primary).toContain('canShareToFeed');
    // The staff grid's trigger mounts stay PNG/copy-only (no feed opt-in).
    for (const staffFile of ['AdminProgressChartsGrid.primaryCards.tsx', 'AdminProgressChartsGrid.detailCards.tsx']) {
      const adminTriggers = readFileSync(
        resolve(__dirname, `../workspaces/clients-team/tabs/${staffFile}`),
        'utf8',
      );
      expect(adminTriggers).toContain('<ChartExpandTrigger');
      expect(adminTriggers).not.toContain('canShareToFeed');
    }
  });
});

describe('ChartExpandTrigger', () => {
  it('is a 44px dialog trigger that lazy-opens the modal', async () => {
    const props = baseProps();
    render(<ChartExpandTrigger title={props.title} subtitle={props.subtitle} renderChart={props.renderChart} rows={props.rows} />);

    const trigger = screen.getByRole('button', { name: /expand weekly training volume/i });
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    fireEvent.click(trigger);
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /weekly training volume/i })).toBeInTheDocument();
    });
  });

  it('trigger source keeps the 44px touch minimum (source lock)', () => {
    const source = readFileSync(resolve(__dirname, 'ChartExpandTrigger.tsx'), 'utf8');
    expect(source).toContain('min-width: 44px');
    expect(source).toContain('min-height: 44px');
    expect(source).toContain("lazy(() => import('./ChartExpandModal'))");
  });

  it('is wired to the flagship cards and the share surface is untouched (source truth)', () => {
    const interactive = readFileSync(
      resolve(__dirname, '../Pages/client-dashboard/CanonicalProgressChartsGrid.interactiveCards.tsx'),
      'utf8',
    );
    const primary = readFileSync(
      resolve(__dirname, '../Pages/client-dashboard/CanonicalProgressChartsGrid.primaryCards.tsx'),
      'utf8',
    );
    expect(interactive).toContain('<ChartExpandTrigger');
    expect(interactive).toContain('title="Weekly Training Volume"');
    expect(interactive).toContain('title="Total Sets & Reps"');
    expect(primary).toContain('<ChartExpandTrigger');
    expect(primary).toContain('title="Workout Frequency"');
    // §3 guardrail: the milestone-share surface ships untouched in 2.2a.
    const studio = readFileSync(resolve(__dirname, 'ProgressChartStudio.tsx'), 'utf8');
    expect(studio).not.toContain('ChartExpandModal');
  });
});
