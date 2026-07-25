/**
 * TEST: PrCelebration + ProgressChartStudio record moment
 * PURPOSE: The PR celebration fires ONLY on the `record` tone, announces the
 *   record to assistive tech, and stays out of the DOM for every other tone.
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PrCelebration from './PrCelebration';
import ProgressChartStudio from './ProgressChartStudio';
import type { ProgressShareCard } from './progressShareCard';
import type { ProgressChartPulseTone } from './progressChartActions';

const makeCard = (tone: ProgressChartPulseTone): ProgressShareCard => ({
  caption: 'Bench press hit a new best.',
  detail: 'Up 8% over the last month.',
  isShareable: true,
  kicker: 'Progress proof',
  metrics: [{ label: 'Best', value: '225 lb' }],
  proofLine: 'Built from verified SwanStudios logs.',
  title: 'Bench Press',
  tone,
});

describe('PrCelebration', () => {
  it('renders the record ribbon and a polite record announcement', () => {
    render(<PrCelebration />);
    expect(screen.getByTestId('pr-celebration')).toBeInTheDocument();
    expect(screen.getByText('New Record')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/new personal record/i);
  });

  it('accepts a custom label', () => {
    render(<PrCelebration label="All-Time Best" />);
    expect(screen.getByText('All-Time Best')).toBeInTheDocument();
  });
});

describe('ProgressChartStudio record moment', () => {
  const baseProps = {
    chartId: 'bench',
    filename: 'bench.png',
    isOpen: true,
    onClose: () => {},
  };

  it('fires the celebration only when the tone is record', () => {
    const { rerender } = render(
      <ProgressChartStudio {...baseProps} card={makeCard('record')} />,
    );
    expect(screen.getByTestId('pr-celebration')).toBeInTheDocument();

    rerender(<ProgressChartStudio {...baseProps} card={makeCard('rising')} />);
    expect(screen.queryByTestId('pr-celebration')).not.toBeInTheDocument();
  });
});