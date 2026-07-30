import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import SessionDetailNoShowReasonPanel from './SessionDetailNoShowReasonPanel';

const read = (fileName: string) => readFileSync(resolve(__dirname, fileName), 'utf8');

describe('SessionDetailNoShowReasonPanel', () => {
  it('captures a no-show reason before attendance is confirmed', () => {
    const onNoShowReasonChange = vi.fn();

    render(
      <SessionDetailNoShowReasonPanel
        showNoShowReason={true}
        noShowReasonInput=""
        onNoShowReasonChange={onNoShowReasonChange}
        canDeductSessionCredit={false}
        deductSessionCredit={false}
        onDeductSessionCreditChange={vi.fn()}
        recordedNoShowReason={null}
      />
    );

    fireEvent.change(screen.getByLabelText(/no-show reason/i), {
      target: { value: 'No call, no text' },
    });

    expect(onNoShowReasonChange).toHaveBeenCalledWith('No call, no text');
    // The panel must state the CONDITION, not promise delivery: shouldNotifyClient
    // suppresses the no-show email when the client has notifications off or is
    // inside their quiet hours, and the no-show path passes no `force`, so a
    // suppressed notice is dropped rather than deferred (rule 75).
    expect(screen.getByText(/we'll email the client/i)).toBeInTheDocument();
    expect(screen.getByText(/quiet hours/i)).toBeInTheDocument();
    // The old unconditional promise must not come back.
    expect(screen.queryByText(/client will be notified/i)).not.toBeInTheDocument();
  });

  it('lets trainers choose whether a no-show deducts a SwanStudios session credit', () => {
    const onDeductSessionCreditChange = vi.fn();

    render(
      <SessionDetailNoShowReasonPanel
        showNoShowReason={true}
        noShowReasonInput=""
        onNoShowReasonChange={vi.fn()}
        canDeductSessionCredit={true}
        deductSessionCredit={true}
        onDeductSessionCreditChange={onDeductSessionCreditChange}
        recordedNoShowReason={null}
      />
    );

    fireEvent.click(screen.getByRole('checkbox', { name: /deduct one swanstudios session credit/i }));

    expect(onDeductSessionCreditChange).toHaveBeenCalledWith(false);
  });

  it('shows recorded no-show reason without reopening the textarea', () => {
    render(
      <SessionDetailNoShowReasonPanel
        showNoShowReason={false}
        noShowReasonInput=""
        onNoShowReasonChange={vi.fn()}
        canDeductSessionCredit={false}
        deductSessionCredit={false}
        onDeductSessionCreditChange={vi.fn()}
        recordedNoShowReason="Client missed the session"
      />
    );

    expect(screen.getByText('Client missed the session')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/enter reason/i)).not.toBeInTheDocument();
  });

  it('keeps no-show markup out of the modal shell', () => {
    const modalSource = read('SessionDetailModal.tsx');
    const bodySource = read('SessionDetailBodyPanels.tsx');
    const panelSource = read('SessionDetailNoShowReasonPanel.tsx');

    expect(modalSource).toContain("from './SessionDetailBodyPanels'");
    expect(bodySource).toContain("from './SessionDetailNoShowReasonPanel'");
    expect(modalSource).not.toContain('<NoShowReasonBox>');
    expect(modalSource).not.toContain('<NoShowReasonDisplay>');
    expect(panelSource).toContain('<NoShowReasonBox>');
    expect(panelSource).toContain('<NoShowReasonDisplay>');
    expect(bodySource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(panelSource.split(/\r?\n/).length).toBeLessThanOrEqual(100);
    expect(modalSource.split(/\r?\n/).length).toBeLessThanOrEqual(700);
  });
});
