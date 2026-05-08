import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CoachIntakeRetentionPurgePlan } from './CoachIntakeRetentionPurgePlan';
import type { CoachIntakeRetentionPurgePlan as PurgePlan } from '../../../../services/coachIntakeService';

describe('CoachIntakeRetentionPurgePlan', () => {
  it('renders dry-run cleanup state without internal artifact identifiers', () => {
    const onCommandPrompt = vi.fn();
    const plan: PurgePlan & { candidateIds?: string[]; transcript?: string } = {
      enabled: false,
      dryRun: true,
      schemaReady: true,
      purgeReady: 2,
      purged: 0,
      skippedReason: 'disabled',
      candidateIds: ['11111111-1111-4111-8111-111111111111'],
      transcript: 'Do Not Return',
    };

    render(<CoachIntakeRetentionPurgePlan plan={plan} onCommandPrompt={onCommandPrompt} />);

    expect(screen.getByText(/Cleanup disabled/i)).toBeInTheDocument();
    expect(screen.getByText(/2 would purge/i)).toBeInTheDocument();
    expect(screen.getByText(/Dry run only/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /ask coach: show retention cleanup plan/i }));
    expect(onCommandPrompt).toHaveBeenCalledWith('show Coach intake cleanup plan');
    expect(JSON.stringify(screen.queryByText(/11111111|Do Not Return|candidateIds|transcript/i))).toBe('null');
  });
});
