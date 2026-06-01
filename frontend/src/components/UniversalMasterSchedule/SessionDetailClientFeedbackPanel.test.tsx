import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import SessionDetailClientFeedbackPanel from './SessionDetailClientFeedbackPanel';

const read = (fileName: string) => readFileSync(resolve(__dirname, fileName), 'utf8');

describe('SessionDetailClientFeedbackPanel', () => {
  it('keeps client rating feedback fast and keyboard-readable', () => {
    const onRatingChange = vi.fn();
    const onCommentChange = vi.fn();
    const onSubmit = vi.fn();

    render(
      <SessionDetailClientFeedbackPanel
        clientRating={0}
        clientComment=""
        feedbackSubmitted={false}
        feedbackLoading={false}
        onRatingChange={onRatingChange}
        onCommentChange={onCommentChange}
        onSubmit={onSubmit}
      />
    );

    expect(screen.getByRole('button', { name: /submit feedback/i })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /rate 4 out of 5/i }));
    expect(onRatingChange).toHaveBeenCalledWith(4);

    fireEvent.change(screen.getByLabelText(/comments/i), {
      target: { value: 'Great coaching pace' },
    });
    expect(onCommentChange).toHaveBeenCalledWith('Great coaching pace');
  });

  it('shows the submitted state without a duplicate form', () => {
    render(
      <SessionDetailClientFeedbackPanel
        clientRating={5}
        clientComment="Strong session"
        feedbackSubmitted={true}
        feedbackLoading={false}
        onRatingChange={vi.fn()}
        onCommentChange={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(screen.getByText('Feedback Submitted')).toBeInTheDocument();
    expect(screen.getByText('Thank you for your feedback!')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /submit feedback/i })).not.toBeInTheDocument();
  });

  it('keeps client feedback JSX out of the modal shell', () => {
    const modalSource = read('SessionDetailModal.tsx');
    const bodySource = read('SessionDetailBodyPanels.tsx');
    const panelSource = read('SessionDetailClientFeedbackPanel.tsx');

    expect(modalSource).toContain("from './SessionDetailBodyPanels'");
    expect(bodySource).toContain("from './SessionDetailClientFeedbackPanel'");
    expect(modalSource).not.toContain('<ClientFeedbackPanel>');
    expect(modalSource).not.toContain('<StarRatingContainer>');
    expect(panelSource).toContain('<ClientFeedbackPanel>');
    expect(bodySource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(panelSource.split(/\r?\n/).length).toBeLessThanOrEqual(220);
    expect(modalSource.split(/\r?\n/).length).toBeLessThanOrEqual(700);
  });
});
