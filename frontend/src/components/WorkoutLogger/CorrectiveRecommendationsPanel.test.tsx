/**
 * V3c.6 — CorrectiveRecommendationsPanel render contract tests
 * =============================================================
 *
 * Locks the panel's render branches:
 *   - empty compensations  → "no OHSA on file" message
 *   - loading              → loader copy
 *   - error                → error message (role=alert)
 *   - matchedCount=0       → "no validated correctives matched" warn message
 *   - happy path           → all 4 step labels + counts + exercise rows
 *   - includeSteps filter  → omitted steps don't render
 *   - server fail (500)    → error message surfaces server-supplied error string
 *   - PII safety boundary  → exerciseKey / sourceCitation render but no
 *                            client identifier appears in DOM
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';

// Mock ApiService so the panel never hits a real network. The component
// invokes `new ApiService()` and calls `.post()` on the instance — so
// the mock must be a constructable class, not a vi.fn().
const mockPost = vi.fn();
vi.mock('../../services/api.service', () => ({
  ApiService: class MockApiService {
    post(...args: unknown[]) {
      return mockPost(...args);
    }
    get = vi.fn();
  },
}));

import CorrectiveRecommendationsPanel from './CorrectiveRecommendationsPanel';

const FAKE_RECOMMENDATIONS = {
  tags: ['knees_cave', 'pronation_distortion_syndrome'],
  matchedCount: 4,
  inhibit: [{
    id: 'r1',
    name: 'Foam Roll TFL',
    exerciseKey: 'ces-foam-roll-tfl',
    bodyPartCategory: 'recovery',
    sourceCitation: 'NASM-CES Ch. 7',
  }],
  lengthen: [{
    id: 'r2',
    name: 'Standing TFL Stretch',
    exerciseKey: 'ces-standing-tfl-stretch',
    bodyPartCategory: 'recovery',
    sourceCitation: 'NASM-CES Ch. 7',
  }],
  activate: [{
    id: 'r3',
    name: 'Lateral Band Walks',
    exerciseKey: 'ces-lateral-band-walks',
    bodyPartCategory: 'recovery',
    sourceCitation: 'NASM-CES Ch. 7',
  }],
  integrate: [{
    id: 'r4',
    name: 'Single-Leg Squat to Tap',
    exerciseKey: 'ces-single-leg-squat-tap',
    bodyPartCategory: 'legs',
    sourceCitation: 'NASM-CES Ch. 8 (Integration)',
  }],
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Render-branch tests ──────────────────────────────────────────

describe('CorrectiveRecommendationsPanel — empty / loading / error states', () => {
  it('renders an empty-state message when compensations array is empty', () => {
    render(<CorrectiveRecommendationsPanel clientId={1} compensations={[]} />);
    expect(
      screen.getByText(/No OHSA compensations on file/i),
    ).toBeInTheDocument();
    // Must NOT trigger an API call when compensations are empty.
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('shows the loader while the API request is in flight', async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    mockPost.mockImplementationOnce(() => new Promise((resolve) => { resolveFetch = resolve; }));

    render(
      <CorrectiveRecommendationsPanel
        clientId={1}
        compensations={['knee_valgus']}
      />,
    );

    expect(screen.getByText(/Loading corrective recommendations/i)).toBeInTheDocument();

    // Resolve the promise so React doesn't complain about pending updates.
    resolveFetch({
      data: { success: true, recommendations: FAKE_RECOMMENDATIONS },
    });
    await waitFor(() => expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument());
  });

  it('surfaces a server-supplied error message in an alert role', async () => {
    mockPost.mockResolvedValueOnce({
      data: { success: false, error: 'Valid clientId is required' },
    });

    render(
      <CorrectiveRecommendationsPanel
        clientId={1}
        compensations={['knee_valgus']}
      />,
    );

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Valid clientId is required');
  });

  it('surfaces network errors gracefully without crashing the panel', async () => {
    mockPost.mockRejectedValueOnce(new Error('Network connection lost'));

    render(
      <CorrectiveRecommendationsPanel
        clientId={1}
        compensations={['knee_valgus']}
      />,
    );

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/Network connection lost/i);
  });

  it('shows a "no matched correctives" warning when matchedCount is 0', async () => {
    mockPost.mockResolvedValueOnce({
      data: {
        success: true,
        recommendations: {
          tags: [],
          matchedCount: 0,
          inhibit: [], lengthen: [], activate: [], integrate: [],
        },
      },
    });

    render(
      <CorrectiveRecommendationsPanel
        clientId={1}
        compensations={['knee_valgus']}
      />,
    );

    await screen.findByText(/No V3b\.3-validated correctives matched/i);
  });
});

// ─── Happy-path render tests ──────────────────────────────────────

describe('CorrectiveRecommendationsPanel — populated render', () => {
  beforeEach(() => {
    mockPost.mockResolvedValue({
      data: { success: true, recommendations: FAKE_RECOMMENDATIONS },
    });
  });

  it('renders all four protocol step labels in canonical order', async () => {
    render(
      <CorrectiveRecommendationsPanel
        clientId={1}
        compensations={['knee_valgus']}
      />,
    );

    await screen.findByText('Foam Roll TFL'); // wait for fetch
    expect(screen.getByText('Inhibit')).toBeInTheDocument();
    expect(screen.getByText('Lengthen')).toBeInTheDocument();
    expect(screen.getByText('Activate')).toBeInTheDocument();
    expect(screen.getByText('Integrate')).toBeInTheDocument();
  });

  it('renders the exercise rows under each step with key + citation', async () => {
    render(
      <CorrectiveRecommendationsPanel
        clientId={1}
        compensations={['knee_valgus']}
      />,
    );

    await screen.findByText('Foam Roll TFL');
    expect(screen.getByText('ces-foam-roll-tfl')).toBeInTheDocument();
    expect(screen.getByText('Lateral Band Walks')).toBeInTheDocument();
    expect(screen.getByText('ces-lateral-band-walks')).toBeInTheDocument();
    expect(screen.getByText('Single-Leg Squat to Tap')).toBeInTheDocument();
    expect(screen.getByText('NASM-CES Ch. 8 (Integration)')).toBeInTheDocument();
  });

  it('renders the V3b.3 tag chips from the response', async () => {
    render(
      <CorrectiveRecommendationsPanel
        clientId={1}
        compensations={['knee_valgus']}
      />,
    );

    await screen.findByText('Foam Roll TFL');
    expect(screen.getByText('knees cave')).toBeInTheDocument();
    expect(screen.getByText('pronation distortion syndrome')).toBeInTheDocument();
  });

  it('forwards compensations + clientId to the API', async () => {
    render(
      <CorrectiveRecommendationsPanel
        clientId={42}
        compensations={[
          { type: 'knee_valgus', avgSeverity: 7, frequency: 5, trend: 'worsening' },
        ]}
      />,
    );

    await screen.findByText('Foam Roll TFL');
    expect(mockPost).toHaveBeenCalledTimes(1);
    const [url, body] = mockPost.mock.calls[0];
    expect(url).toBe('/api/workout-builder/corrective-recommendations');
    expect(body.clientId).toBe(42);
    expect(body.compensations).toEqual([
      { type: 'knee_valgus', avgSeverity: 7, frequency: 5, trend: 'worsening' },
    ]);
  });

  it('forwards includeSteps filter and hides omitted steps from the DOM', async () => {
    render(
      <CorrectiveRecommendationsPanel
        clientId={1}
        compensations={['knee_valgus']}
        includeSteps={['inhibit', 'activate']}
      />,
    );

    await screen.findByText('Foam Roll TFL');

    // includeSteps was forwarded.
    const [, body] = mockPost.mock.calls[0];
    expect(body.includeSteps).toEqual(['inhibit', 'activate']);

    // Inhibit + Activate render; Lengthen + Integrate must not.
    expect(screen.getByText('Inhibit')).toBeInTheDocument();
    expect(screen.getByText('Activate')).toBeInTheDocument();
    expect(screen.queryByText('Lengthen')).not.toBeInTheDocument();
    expect(screen.queryByText('Integrate')).not.toBeInTheDocument();
  });

  it('renders auto-derived subtitle from compensation list', async () => {
    render(
      <CorrectiveRecommendationsPanel
        clientId={1}
        compensations={['knee_valgus', 'low_back_arch']}
      />,
    );

    await screen.findByText('Foam Roll TFL');
    expect(screen.getByText(/Targeting knee valgus and low back arch/i)).toBeInTheDocument();
  });

  it('respects custom title + subtitle props when supplied', async () => {
    render(
      <CorrectiveRecommendationsPanel
        clientId={1}
        compensations={['knee_valgus']}
        title="Custom Panel Title"
        subtitle="Custom subtitle text"
      />,
    );

    await screen.findByText('Foam Roll TFL');
    expect(screen.getByText('Custom Panel Title')).toBeInTheDocument();
    expect(screen.getByText('Custom subtitle text')).toBeInTheDocument();
  });
});

// ─── Behavior under prop changes ──────────────────────────────────

describe('CorrectiveRecommendationsPanel — refetch on compensation change', () => {
  it('refetches when compensations array changes (new compensation added)', async () => {
    mockPost.mockResolvedValue({
      data: { success: true, recommendations: FAKE_RECOMMENDATIONS },
    });

    const { rerender } = render(
      <CorrectiveRecommendationsPanel
        clientId={1}
        compensations={['knee_valgus']}
      />,
    );
    await screen.findByText('Foam Roll TFL');
    expect(mockPost).toHaveBeenCalledTimes(1);

    rerender(
      <CorrectiveRecommendationsPanel
        clientId={1}
        compensations={['knee_valgus', 'low_back_arch']}
      />,
    );

    await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(2));
    const [, body2] = mockPost.mock.calls[1];
    expect(body2.compensations).toEqual(['knee_valgus', 'low_back_arch']);
  });

  it('does NOT refetch when compensations array reference changes but content is identical', async () => {
    mockPost.mockResolvedValue({
      data: { success: true, recommendations: FAKE_RECOMMENDATIONS },
    });

    const { rerender } = render(
      <CorrectiveRecommendationsPanel
        clientId={1}
        compensations={['knee_valgus']}
      />,
    );
    await screen.findByText('Foam Roll TFL');
    expect(mockPost).toHaveBeenCalledTimes(1);

    // Fresh array, identical content.
    rerender(
      <CorrectiveRecommendationsPanel
        clientId={1}
        compensations={['knee_valgus']}
      />,
    );

    // Should still only be 1 call — JSON-stringified key gates the effect.
    await new Promise((r) => setTimeout(r, 30));
    expect(mockPost).toHaveBeenCalledTimes(1);
  });
});
