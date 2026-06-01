import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import SessionDetailTrainerNotesPanel from './SessionDetailTrainerNotesPanel';

const read = (fileName: string) => readFileSync(resolve(__dirname, fileName), 'utf8');

describe('SessionDetailTrainerNotesPanel', () => {
  it('lets managers edit trainer notes, rating, and client feedback', () => {
    const onNotesChange = vi.fn();
    const onTrainerRatingChange = vi.fn();
    const onClientFeedbackChange = vi.fn();

    render(
      <SessionDetailTrainerNotesPanel
        notes=""
        trainerRating=""
        clientFeedback=""
        canManage={true}
        onNotesChange={onNotesChange}
        onTrainerRatingChange={onTrainerRatingChange}
        onClientFeedbackChange={onClientFeedbackChange}
      />
    );

    fireEvent.change(screen.getByLabelText(/trainer notes/i), {
      target: { value: 'Focused on tempo' },
    });
    fireEvent.change(screen.getByLabelText(/trainer rating/i), {
      target: { value: '5' },
    });
    fireEvent.change(screen.getByLabelText(/client feedback/i), {
      target: { value: 'Solid effort' },
    });

    expect(onNotesChange).toHaveBeenCalledWith('Focused on tempo');
    expect(onTrainerRatingChange).toHaveBeenCalledWith('5');
    expect(onClientFeedbackChange).toHaveBeenCalledWith('Solid effort');
  });

  it('keeps completed session fields read-only for non-managers', () => {
    render(
      <SessionDetailTrainerNotesPanel
        notes="Coach note"
        trainerRating="4"
        clientFeedback="Great session"
        canManage={false}
        onNotesChange={vi.fn()}
        onTrainerRatingChange={vi.fn()}
        onClientFeedbackChange={vi.fn()}
      />
    );

    expect(screen.getByLabelText(/trainer notes/i)).toBeDisabled();
    expect(screen.getByLabelText(/trainer rating/i)).toBeDisabled();
    expect(screen.getByLabelText(/client feedback/i)).toBeDisabled();
  });

  it('keeps trainer editing markup out of the modal shell', () => {
    const modalSource = read('SessionDetailModal.tsx');
    const bodySource = read('SessionDetailBodyPanels.tsx');
    const panelSource = read('SessionDetailTrainerNotesPanel.tsx');

    expect(modalSource).toContain("from './SessionDetailBodyPanels'");
    expect(bodySource).toContain("from './SessionDetailTrainerNotesPanel'");
    expect(modalSource).not.toContain('Trainer Notes');
    expect(modalSource).not.toContain('trainer-rating');
    expect(modalSource).not.toContain('client-feedback');
    expect(panelSource).toContain('Trainer Notes');
    expect(bodySource.split(/\r?\n/).length).toBeLessThanOrEqual(300);
    expect(panelSource.split(/\r?\n/).length).toBeLessThanOrEqual(120);
    expect(modalSource.split(/\r?\n/).length).toBeLessThanOrEqual(700);
  });
});
