/**
 * PlaudDateSplitCandidatePanel tests
 * ==================================
 * Locks the user-visible status language for deterministic PLAUD date split
 * candidates before the later per-workout approval workflow builds on it.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PlaudDateSplitCandidates } from '../../services/plaudMergeService';
import { PlaudDateSplitCandidatePanel } from './PlaudDateSplitCandidatePanel';

const candidates: PlaudDateSplitCandidates = {
  referenceDate: '2026-05-05',
  timeZone: 'America/Los_Angeles',
  referenceSource: 'clip_timeline_uploaded_at',
  segmentCount: 3,
  needsDateReviewCount: 1,
  futureDateBlockedCount: 1,
  segments: [
    {
      segmentId: 'segment-1',
      segmentIndex: 1,
      date: '2026-05-05',
      dateSource: 'phrase:today',
      dateConfidence: 'high',
      needsDateConfirmation: false,
      futureDateBlocked: false,
      evidence: 'today',
      referenceDate: '2026-05-05',
      referenceSource: 'clip_timeline_uploaded_at',
      timeZone: 'America/Los_Angeles',
      startLine: 1,
      endLine: 3,
      text: 'Today client alpha hit goblet squats and rows.',
    },
    {
      segmentId: 'segment-2',
      segmentIndex: 2,
      date: '2026-05-04',
      dateSource: 'reference_timeline',
      dateConfidence: 'low',
      needsDateConfirmation: true,
      futureDateBlocked: false,
      evidence: null,
      referenceDate: '2026-05-05',
      referenceSource: 'clip_timeline_uploaded_at',
      timeZone: 'America/Los_Angeles',
      startLine: 4,
      endLine: 4,
      text: 'Bench notes without a spoken date.',
    },
    {
      segmentId: 'segment-3',
      segmentIndex: 3,
      date: '2026-05-08',
      dateSource: 'explicit_date',
      dateConfidence: 'blocked_future',
      needsDateConfirmation: true,
      futureDateBlocked: true,
      evidence: 'May 8',
      referenceDate: '2026-05-05',
      referenceSource: 'clip_timeline_uploaded_at',
      timeZone: 'America/Los_Angeles',
      startLine: null,
      endLine: null,
      text: 'Future dated session needs manual review.',
    },
  ],
};

describe('PlaudDateSplitCandidatePanel', () => {
  it('renders ready, confirmation, and blocked statuses', () => {
    render(<PlaudDateSplitCandidatePanel candidates={candidates} />);

    expect(screen.getByText('Split workout dates (3)')).toBeTruthy();
    expect(screen.getByText('Ready date')).toBeTruthy();
    expect(screen.getByText('Confirm date')).toBeTruthy();
    expect(screen.getByText('Future blocked')).toBeTruthy();
    expect(screen.getByText('2026-05-05')).toBeTruthy();
    expect(screen.getByText('reference timeline')).toBeTruthy();
  });

  it('renders nothing when there are no candidate segments', () => {
    const { container } = render(<PlaudDateSplitCandidatePanel candidates={{ ...candidates, segments: [] }} />);

    expect(container.textContent).toBe('');
  });

  it('enables ready segment approval only when split dates are fully resolved', () => {
    const onApprove = vi.fn();
    render(
      <PlaudDateSplitCandidatePanel
        candidates={{ ...candidates, segments: [candidates.segments[0]] }}
        canApproveSegments
        onApproveSegment={onApprove}
      />,
    );

    fireEvent.click(screen.getByText('Approve segment'));
    expect(onApprove).toHaveBeenCalledWith(candidates.segments[0]);
  });

  it('shows logged state for completed segment approvals', () => {
    render(
      <PlaudDateSplitCandidatePanel
        candidates={{ ...candidates, segments: [candidates.segments[0]] }}
        approvalStates={{ 'segment-1': { status: 'logged', workoutId: 42 } }}
        canApproveSegments
        onApproveSegment={() => {}}
      />,
    );

    const button = screen.getByText('Logged #42') as HTMLButtonElement;
    expect(button).toBeTruthy();
    expect(button.disabled).toBe(true);
  });
});
