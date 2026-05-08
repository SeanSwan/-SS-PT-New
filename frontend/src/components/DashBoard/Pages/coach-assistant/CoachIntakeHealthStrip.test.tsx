/**
 * CoachIntakeHealthStrip.test.tsx
 * ===============================
 * Focused coverage for the PII-safe Coach intake health and retention command
 * controls rendered inside the Swan Coach workspace.
 */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CoachIntakeHealthStrip from './CoachIntakeHealthStrip';

describe('CoachIntakeHealthStrip', () => {
  it('shows queue, retention, and cleanup-plan command prompts without artifact details', () => {
    const onCommandPrompt = vi.fn();

    render(
      <CoachIntakeHealthStrip
        health={{
          schemaReady: true,
          status: 'degraded',
          counts: {
            total: 4,
            actionable: 3,
            today: 1,
            unprocessed: 1,
            processing: 1,
            readyReview: 1,
            failed: 1,
            needsClient: 2,
            stuckProcessing: 1,
          },
          nextOperatorAction: {
            key: 'inspect_stuck_processing',
            label: 'Inspect stuck processing intake',
          },
        }}
        retention={{
          schemaReady: true,
          status: 'attention',
          summary: {
            totalWithRawArtifacts: 5,
            purgeReady: 2,
            reviewRequired: 1,
            retained: 2,
          },
          nextOperatorAction: {
            key: 'review_purge_candidates',
            label: 'Review raw artifact purge candidates',
          },
        }}
        retentionPurgePlan={{
          enabled: false,
          dryRun: true,
          schemaReady: true,
          purgeReady: 2,
          purged: 0,
          skippedReason: 'disabled',
        }}
        onCommandPrompt={onCommandPrompt}
      />,
    );

    const health = screen.getByLabelText(/Coach intake health/i);
    expect(within(health).getByText(/Queue health/i)).toBeInTheDocument();
    expect(within(health).getByText(/Degraded/i)).toBeInTheDocument();
    expect(within(health).getByText(/1 stuck/i)).toBeInTheDocument();
    expect(within(health).getByText(/Privacy retention/i)).toBeInTheDocument();
    expect(within(health).getByText(/2 purge ready/i)).toBeInTheDocument();
    expect(within(health).getByText(/1 review/i)).toBeInTheDocument();

    const cleanupPlan = within(health).getByLabelText(/Retention cleanup plan/i, { selector: 'div' });
    expect(within(cleanupPlan).getByText(/^Cleanup plan$/i)).toBeInTheDocument();
    expect(within(cleanupPlan).getByText(/2 would purge/i)).toBeInTheDocument();

    fireEvent.click(within(health).getByRole('button', { name: /ask coach: inspect stuck processing intake/i }));
    expect(onCommandPrompt).toHaveBeenCalledWith('show Coach intake health');
    fireEvent.click(within(health).getByRole('button', { name: /ask coach: review raw artifact purge candidates/i }));
    expect(onCommandPrompt).toHaveBeenCalledWith('show Coach intake retention');
    fireEvent.click(within(health).getByRole('button', { name: /ask coach: show retention cleanup plan/i }));
    expect(onCommandPrompt).toHaveBeenCalledWith('show Coach intake cleanup plan');
  });
});
