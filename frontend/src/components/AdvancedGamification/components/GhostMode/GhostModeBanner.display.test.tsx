import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GhostModeBanner from './GhostModeBanner';
import type { GhostData } from './GhostModeTypes';

const { useGhostModeMock, toggleMock } = vi.hoisted(() => ({
  useGhostModeMock: vi.fn(),
  toggleMock: vi.fn(),
}));

vi.mock('./useGhostMode', () => ({
  useGhostMode: useGhostModeMock,
}));

const makeGhostData = (overrides: Partial<GhostData> = {}): GhostData => ({
  ghostId: 'ghost-1',
  sourceSessionId: 11,
  sourceDate: '2026-06-20T00:00:00.000Z',
  category: 'strength',
  totalVolume: 1500,
  totalSets: 5,
  totalReps: 25,
  exercises: [{
    name: 'Bench Press',
    exerciseId: 12,
    sets: 5,
    reps: 5,
    weight: 300,
    volume: 1500,
  }],
  comparison: {
    metric: 'volume',
    target: 1500,
  },
  ...overrides,
});

const mockActiveGhost = (ghostData: GhostData) => {
  useGhostModeMock.mockReturnValue({
    ghostData,
    isActive: true,
    isLoading: false,
    error: null,
    config: null,
    comparisonResult: null,
    toggle: toggleMock,
    loadGhost: vi.fn(),
    runComparison: vi.fn(),
  });
};

describe('GhostModeBanner display safety', () => {
  beforeEach(() => {
    useGhostModeMock.mockReset();
    toggleMock.mockReset();
  });

  it('does not render Invalid Date when ghost source data is malformed', () => {
    mockActiveGhost(makeGhostData({ sourceDate: 'not-a-real-date' }));

    render(<GhostModeBanner userId={42} currentVolume={1750} />);

    expect(screen.queryByText(/invalid date/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/unknown session date/i).length).toBeGreaterThan(0);
  });

  it('does not coerce a missing source date into the Unix epoch', () => {
    mockActiveGhost(makeGhostData({ sourceDate: null as unknown as string }));

    render(<GhostModeBanner userId={42} currentVolume={1750} />);

    expect(screen.queryByText(/dec 31, 1969|jan 1, 1970/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/unknown session date/i).length).toBeGreaterThan(0);
  });
});
