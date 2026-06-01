import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import SessionDetailSeriesCallout from './SessionDetailSeriesCallout';

const read = (fileName: string) => readFileSync(resolve(__dirname, fileName), 'utf8');

describe('SessionDetailSeriesCallout', () => {
  it('shows recurring series context and routes edit/delete actions', () => {
    const onManageSeries = vi.fn();
    const onDeleteSeries = vi.fn();

    render(
      <SessionDetailSeriesCallout
        recurringGroupId="series-123"
        seriesCount={6}
        loading={false}
        onManageSeries={onManageSeries}
        onDeleteSeries={onDeleteSeries}
      />
    );

    expect(screen.getByText('Part of recurring series (6 sessions).')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /edit series/i }));
    fireEvent.click(screen.getByRole('button', { name: /delete series/i }));

    expect(onManageSeries).toHaveBeenCalledWith('series-123');
    expect(onDeleteSeries).toHaveBeenCalledTimes(1);
  });

  it('disables series actions while the modal is loading', () => {
    render(
      <SessionDetailSeriesCallout
        recurringGroupId="series-123"
        loading={true}
        onManageSeries={vi.fn()}
        onDeleteSeries={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /edit series/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /delete series/i })).toBeDisabled();
  });

  it('keeps recurring-series action markup out of the modal shell', () => {
    const modalSource = read('SessionDetailModal.tsx');
    const bodySource = read('SessionDetailBodyPanels.tsx');
    const calloutSource = read('SessionDetailSeriesCallout.tsx');

    expect(modalSource).toContain("from './SessionDetailBodyPanels'");
    expect(bodySource).toContain("from './SessionDetailSeriesCallout'");
    expect(modalSource).not.toContain('<SeriesCallout>');
    expect(modalSource).not.toContain('Part of recurring series');
    expect(calloutSource).toContain('<SeriesCallout>');
    expect(calloutSource).toContain('Part of recurring series');
    expect(bodySource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(calloutSource.split(/\r?\n/).length).toBeLessThanOrEqual(100);
    expect(modalSource.split(/\r?\n/).length).toBeLessThanOrEqual(700);
  });
});
