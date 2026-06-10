import { render, screen, within } from '@testing-library/react';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

import ClientExerciseMegaStats, { getExerciseMegaStatRowKey } from './ClientExerciseMegaStats';

const stylesSource = readFileSync(
  resolve(__dirname, '../../../progress/ClientExerciseMegaStats.styles.ts'),
  'utf8',
);

describe('ClientExerciseMegaStats', () => {
  it('renders every exercise ranked by most performed first', () => {
    render(
      <ClientExerciseMegaStats
        exercises={[
          { x: 'Pull Up', y: 4, sets: 12 },
          { x: 'Push Up', y: 18, sets: 54 },
          { x: 'Goblet Squat', y: 9, sets: 27 },
          { x: 'Pallof Press', y: 2, sets: 6 },
        ]}
      />
    );

    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(4);
    expect(within(rows[0]).getByText('Push Up')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Goblet Squat')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Pull Up')).toBeInTheDocument();
    expect(within(rows[3]).getByText('Pallof Press')).toBeInTheDocument();
    expect(screen.getByText(/4 exercises tracked/i)).toBeInTheDocument();
  });

  it('surfaces the most-trained and needs-attention exercise from the full diary', () => {
    render(
      <ClientExerciseMegaStats
        exercises={[
          { x: 'Pull Up', y: 4, sets: 12 },
          { x: 'Push Up', y: 18, sets: 54 },
          { x: 'Goblet Squat', y: 9, sets: 27 },
          { x: 'Pallof Press', y: 2, sets: 6 },
        ]}
      />
    );

    const insights = screen.getByRole('group', { name: /exercise diary insights/i });
    expect(within(insights).getByText(/most trained/i)).toBeInTheDocument();
    expect(within(insights).getByText('Push Up')).toBeInTheDocument();
    expect(within(insights).getByText(/18 logs \/ 54 sets/i)).toBeInTheDocument();
    expect(within(insights).getByText(/needs attention/i)).toBeInTheDocument();
    expect(within(insights).getByText('Pallof Press')).toBeInTheDocument();
    expect(within(insights).getByText(/2 logs \/ 6 sets/i)).toBeInTheDocument();
  });

  it('renders an empty state when no exercise history exists', () => {
    render(<ClientExerciseMegaStats exercises={[]} />);

    expect(screen.getByText(/no exercise history yet/i)).toBeInTheDocument();
  });

  it('filters non-finite exercise rows before ranking and width scaling', () => {
    render(
      <ClientExerciseMegaStats
        exercises={[
          { x: 'Infinite Push Up', y: Infinity, sets: 54 },
          { x: 'Broken Squat', y: Number.NaN, sets: 12 },
          { x: 'Pull Up', y: 4, sets: Number.NaN },
        ]}
      />
    );

    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(1);
    expect(within(rows[0]).getByText('Pull Up')).toBeInTheDocument();
    expect(screen.queryByText(/Infinity|NaN/)).not.toBeInTheDocument();
    expect(within(rows[0]).getByText(/4 logs \/ 0 sets/i)).toBeInTheDocument();
  });

  it('keeps exercise diary row identity independent from rank order and changing totals', () => {
    expect(getExerciseMegaStatRowKey({ x: 'Push Up', y: 18, sets: 54 }))
      .toBe(getExerciseMegaStatRowKey({ x: 'Push Up', y: 12, sets: 36 }));
    expect(getExerciseMegaStatRowKey({ x: 'Push Up', y: 18, sets: 54 }))
      .not.toBe(getExerciseMegaStatRowKey({ x: 'Pull Up', y: 18, sets: 54 }));
  });

  it('uses the shared Swan data-card system without clipping long phone labels', () => {
    expect(stylesSource).toContain('swanDataCardShell');
    expect(stylesSource).toContain('swanMetricTile');
    expect(stylesSource).toContain('swanPill');
    expect(stylesSource).toContain('grid-template-columns: auto minmax(0, 1fr)');
    expect(stylesSource).toContain('overflow-wrap: anywhere');
    expect(stylesSource).not.toContain('white-space: nowrap');
    expect(stylesSource).not.toContain('text-overflow: ellipsis');
  });
});
