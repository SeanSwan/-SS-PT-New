
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PainEntry } from '../../services/painEntryService';
import PainChartInsightPanel from './PainChartInsightPanel';

const painEntry = (overrides: Partial<PainEntry>): PainEntry => ({
  id: 1,
  userId: 47,
  createdById: 9,
  bodyRegion: 'left_knee',
  side: 'left',
  painLevel: 8,
  painType: 'sharp',
  description: null,
  onsetDate: '2026-06-20',
  isActive: true,
  resolvedAt: null,
  aggravatingMovements: 'Squatting',
  relievingFactors: 'Foam Rolling',
  trainerNotes: null,
  aiNotes: null,
  posturalSyndrome: 'none',
  assessmentFindings: null,
  createdAt: '2026-06-20T10:00:00.000Z',
  updatedAt: '2026-06-21T10:00:00.000Z',
  ...overrides,
});

describe('PainChartInsightPanel', () => {
  it('carries the FDA comfort-modifications disclaimer on pain-derived suggestions', () => {
    render(
      <PainChartInsightPanel entries={[painEntry({})]} isClientMode={false} onSelectRegion={() => {}} />
    );
    expect(screen.getByText(/comfort modifications for training only/i)).toBeInTheDocument();
    expect(screen.getByText(/not medical advice/i)).toBeInTheDocument();
  });

  it('renders active constraints, resolved history, and region selection', () => {
    const onSelectRegion = vi.fn();
    render(
      <PainChartInsightPanel
        entries={[
          painEntry({ id: 1, bodyRegion: 'left_knee' }),
          painEntry({
            id: 2,
            bodyRegion: 'right_shoulder',
            painLevel: 3,
            painType: 'stiffness',
            isActive: false,
            resolvedAt: '2026-06-22T10:00:00.000Z',
          }),
        ]}
        isClientMode={false}
        onSelectRegion={onSelectRegion}
      />,
    );

    expect(screen.getByText('Pain Intelligence')).toBeTruthy();
    expect(screen.getByText('Review')).toBeTruthy();
    expect(screen.getAllByText(/Avoid:/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Squatting/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /Left Knee/i }));
    expect(onSelectRegion).toHaveBeenCalledWith('left_knee');

    fireEvent.click(screen.getByRole('tab', { name: /Resolved/ }));
    expect(screen.getByText('Right Shoulder')).toBeTruthy();
    expect(screen.getByText(/Resolved Jun/)).toBeTruthy();
  });
  it('renders severity trend and follow-up reminders', () => {
    render(
      <PainChartInsightPanel
        entries={[
          painEntry({
            id: 4,
            painLevel: 3,
            isActive: false,
            resolvedAt: '2026-06-10T10:00:00.000Z',
            updatedAt: '2026-06-10T10:00:00.000Z',
          }),
          painEntry({
            id: 5,
            bodyRegion: 'left_knee',
            painLevel: 8,
            painType: 'sharp',
            isActive: true,
            resolvedAt: null,
            updatedAt: '2026-06-22T10:00:00.000Z',
          }),
        ]}
        isClientMode={false}
        onSelectRegion={vi.fn()}
      />,
    );

    // Slice 4 (B11): title now names the focused region (e.g. 'Severity Trend — Left Shoulder').
    expect(screen.getByText(/Severity Trend/)).toBeTruthy();
    expect(screen.getByRole('img', { name: /Worsening: 3\/10 to 8\/10/ })).toBeTruthy();
    expect(screen.getByText('Follow-up')).toBeTruthy();
    expect(screen.getByText(/Re-check Left Knee/i)).toBeTruthy();
  });
  it('opens resolved history by default when no active entries remain', async () => {
    render(
      <PainChartInsightPanel
        entries={[
          painEntry({
            id: 3,
            bodyRegion: 'right_shoulder',
            painLevel: 3,
            painType: 'stiffness',
            isActive: false,
            resolvedAt: '2026-06-22T10:00:00.000Z',
          }),
        ]}
        isClientMode
        onSelectRegion={vi.fn()}
      />,
    );

    expect(await screen.findByText('Right Shoulder')).toBeTruthy();
    expect(screen.getByRole('tab', { name: /Resolved/ }).getAttribute('aria-selected')).toBe('true');
  });
});
