/**
 * EquipmentIQPanel contracts — S8 radial panel against the verified S6
 * envelope ({ success, report }): idle-when-null, coverage % + Gilded Fern
 * weakest spoke (data attributes, not computed styles), empty state, 6s
 * insight rotation (fake timers), Ask CTA wiring, error + retry.
 */
import React from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

vi.mock('../../services/api.service', () => ({
  default: { get: vi.fn() },
}));
import apiService from '../../services/api.service';
import EquipmentIQPanel from './EquipmentIQPanel';
import type { EquipmentGapReport } from './useEquipmentGapReport';

const PATTERNS = ['push', 'pull', 'hinge', 'squat', 'lunge', 'carry', 'core', 'rotation'];

const buildReport = (overrides: Partial<EquipmentGapReport> = {}): EquipmentGapReport => ({
  profileId: 7,
  patterns: PATTERNS.map((pattern) => ({
    pattern,
    coverage: pattern === 'rotation' ? 0 : 0.5,
    itemCount: pattern === 'rotation' ? 0 : 1,
    exampleItems: pattern === 'rotation' ? [] : ['Adjustable dumbbells'],
  })),
  overallCoverage: 0.44,
  weakestPattern: 'rotation',
  suggestions: [
    {
      addition: 'Loop resistance band',
      unlocksPatterns: ['push', 'pull', 'core'],
      reason: 'Raises push, pull, core coverage (current weakest: rotation)',
    },
    {
      addition: 'Kettlebell',
      unlocksPatterns: ['hinge', 'carry'],
      reason: 'Raises hinge, carry coverage (current weakest: rotation)',
    },
  ],
  ...overrides,
});

const mockReport = (report: EquipmentGapReport) => {
  vi.mocked(apiService.get).mockResolvedValue({ data: { success: true, report } });
};

/** Flush the mocked fetch (microtasks only — safe under fake timers). */
const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe('EquipmentIQPanel', () => {
  beforeEach(() => {
    vi.mocked(apiService.get).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is idle when profileId is null — no fetch fires', () => {
    render(<EquipmentIQPanel profileId={null} />);
    expect(screen.getByTestId('iq-idle')).toBeTruthy();
    expect(apiService.get).not.toHaveBeenCalled();
  });

  it('fetches the verified S6 envelope and renders overall coverage %', async () => {
    mockReport(buildReport());
    render(<EquipmentIQPanel profileId={7} />);
    await flush();
    expect(apiService.get).toHaveBeenCalledWith(
      '/api/equipment-insights/profile/7/gap-report',
    );
    expect(screen.getByTestId('iq-overall-web').textContent).toBe('44%');
    expect(screen.getByTestId('iq-overall-arc').textContent).toBe('44%');
  });

  it('renders every API pattern as a spoke and marks ONLY the weakest in Gilded Fern', async () => {
    mockReport(buildReport());
    const { container } = render(<EquipmentIQPanel profileId={7} />);
    await flush();
    const guides = container.querySelectorAll('[data-role="guide-spoke"]');
    expect(guides).toHaveLength(8);
    const weakest = container.querySelectorAll(
      '[data-role="guide-spoke"][data-weakest="true"]',
    );
    expect(weakest).toHaveLength(1);
    expect(weakest[0].getAttribute('data-pattern')).toBe('rotation');
    // Covered spokes draw Ice Wing coverage strokes; zero-coverage rotation does not.
    const coverageSpokes = container.querySelectorAll('[data-role="coverage-spoke"]');
    expect(coverageSpokes).toHaveLength(7);
    expect(
      container.querySelector('[data-role="coverage-spoke"][data-pattern="rotation"]'),
    ).toBeNull();
    // Mobile arc gauge mirrors the same weakest flag.
    expect(
      container.querySelector('[data-role="arc-track"][data-weakest="true"]')!
        .getAttribute('data-pattern'),
    ).toBe('rotation');
  });

  it('shows the dashed-heptagon empty state when no items exist', async () => {
    mockReport(
      buildReport({
        patterns: PATTERNS.map((pattern) => ({
          pattern,
          coverage: 0,
          itemCount: 0,
          exampleItems: [],
        })),
        overallCoverage: 0,
        suggestions: [],
      }),
    );
    render(<EquipmentIQPanel profileId={7} />);
    await flush();
    expect(screen.getByTestId('iq-empty')).toBeTruthy();
    expect(screen.getByText('Scan your space to light this up.')).toBeTruthy();
    expect(screen.queryByTestId('iq-insight-strip')).toBeNull();
  });

  it('rotates the single insight strip through suggestions every 6s and wraps', async () => {
    vi.useFakeTimers();
    mockReport(buildReport());
    render(<EquipmentIQPanel profileId={7} />);
    await flush();
    expect(screen.getByTestId('iq-insight-text').textContent).toContain(
      'Loop resistance band unlocks push, pull, core',
    );
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(screen.getByTestId('iq-insight-text').textContent).toContain(
      'Kettlebell unlocks hinge, carry',
    );
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(screen.getByTestId('iq-insight-text').textContent).toContain(
      'Loop resistance band',
    );
    // ONE strip, not a stack.
    expect(screen.getAllByTestId('iq-insight-strip')).toHaveLength(1);
  });

  it('wires the Ask CTA to onAskCoach with the active suggestion', async () => {
    mockReport(buildReport());
    const onAskCoach = vi.fn();
    render(<EquipmentIQPanel profileId={7} onAskCoach={onAskCoach} />);
    await flush();
    fireEvent.click(screen.getByRole('button', { name: /Ask/ }));
    expect(onAskCoach).toHaveBeenCalledWith('Loop resistance band');
  });

  it('hides the Ask CTA when onAskCoach is not provided', async () => {
    mockReport(buildReport());
    render(<EquipmentIQPanel profileId={7} />);
    await flush();
    expect(screen.getByTestId('iq-insight-strip')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Ask/ })).toBeNull();
  });

  it('surfaces errors with a retry that refetches', async () => {
    vi.mocked(apiService.get).mockRejectedValueOnce(new Error('network'));
    render(<EquipmentIQPanel profileId={7} />);
    await flush();
    expect(screen.getByTestId('iq-error')).toBeTruthy();
    mockReport(buildReport());
    fireEvent.click(screen.getByRole('button', { name: /Try again/ }));
    await flush();
    expect(apiService.get).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('iq-overall-web').textContent).toBe('44%');
  });
});
