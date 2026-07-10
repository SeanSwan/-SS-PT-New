/**
 * Coach Command Center client-notebook regression
 * ================================================
 * Mic/type capture shares one composer. Notes save to the pinned client, while
 * workout conversion only stages a provenance-labelled, review-gated AI draft.
 */
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  renderPage,
  resetCoachCommandCenterMocks,
  sendMessageWithConversationMock,
} from './CoachCommandCenterPage.test.harness';

const apiPostMock = vi.hoisted(() => vi.fn());
vi.mock('../../../../services/api.service', () => ({
  default: { post: apiPostMock },
}));

const openCommandTools = () => {
  fireEvent.click(screen.getByRole('button', { name: /more command tools/i }));
};

describe('CoachCommandCenter client notebook', () => {
  beforeEach(() => {
    resetCoachCommandCenterMocks();
    sessionStorage.clear();
    apiPostMock.mockReset();
    apiPostMock.mockResolvedValue({ data: { success: true, data: { id: 901 } } });
  });

  it('saves repeated dictated or typed notes directly to the pinned client profile', async () => {
    renderPage('/dashboard/admin/coach-assistant?clientId=41');
    openCommandTools();
    fireEvent.click(screen.getByRole('menuitem', { name: /capture client notes/i }));

    const noteComposer = screen.getByPlaceholderText(/client note/i);
    fireEvent.change(noteComposer, {
      target: { value: 'Left knee felt stable; completed goblet squats at a controlled tempo.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save client note/i }));

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith('/api/notes/41', {
        content: 'Left knee felt stable; completed goblet squats at a controlled tempo.',
        noteType: 'observation',
        tags: ['coach-command-center'],
        visibility: 'trainer_only',
      });
    });
    expect(noteComposer).toHaveValue('');
    expect(screen.getByText(/note saved to Ava Stone/i)).toBeInTheDocument();
  });

  it('stages a review-only workout proposal prompt from saved notes', async () => {
    renderPage('/dashboard/admin/coach-assistant?clientId=41');
    openCommandTools();
    fireEvent.click(screen.getByRole('menuitem', { name: /draft workouts from saved notes/i }));

    const composer = screen.getByPlaceholderText(/talk or type to swan coach/i);
    expect((composer as HTMLTextAreaElement).value).toMatch(/saved trainer notes/i);
    expect((composer as HTMLTextAreaElement).value).toMatch(/label every estimate/i);
    expect((composer as HTMLTextAreaElement).value).toMatch(/do not save or log/i);

    fireEvent.click(screen.getByRole('button', { name: /send to swan coach/i }));
    await waitFor(() => {
      expect(sendMessageWithConversationMock).toHaveBeenCalledWith(
        expect.stringMatching(/review-only workout_log or split_plan proposals/i),
        'coach_assistant',
        expect.any(String),
        41,
        'both',
      );
    });
  });

  it('requires a pinned client before note capture can start', () => {
    renderPage('/dashboard/admin/coach-assistant');
    openCommandTools();

    const capture = screen.getByRole('menuitem', { name: /capture client notes/i });
    expect(capture).toBeDisabled();
    expect(screen.getByRole('menuitem', { name: /draft workouts from saved notes/i })).toBeDisabled();
  });

  it('keeps drafts and late save results isolated when the main client changes', async () => {
    type NoteResponse = { data: { success: true } };
    let resolveSave: (value: NoteResponse) => void = () => undefined;
    const pendingSave = new Promise<NoteResponse>((resolve) => {
      resolveSave = resolve;
    });
    apiPostMock.mockReturnValueOnce(pendingSave);

    renderPage('/dashboard/admin/coach-assistant?clientId=41');
    openCommandTools();
    fireEvent.click(screen.getByRole('menuitem', { name: /capture client notes/i }));
    fireEvent.change(screen.getByRole('textbox', { name: /client note/i }), {
      target: { value: 'Ava-only draft that must never enter Ben\'s composer.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save client note/i }));

    fireEvent.change(screen.getByRole('combobox', { name: /main client/i }), {
      target: { value: '52' },
    });
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: /main client/i })).toHaveValue('52');
      expect(screen.getByRole('textbox', { name: /message swan coach/i })).toHaveValue('');
    });

    openCommandTools();
    fireEvent.click(screen.getByRole('menuitem', { name: /capture client notes/i }));
    const benComposer = screen.getByRole('textbox', { name: /client note/i });
    expect(benComposer).toHaveValue('');
    fireEvent.change(benComposer, { target: { value: 'Ben-only follow-up draft.' } });

    await act(async () => {
      resolveSave({ data: { success: true } });
      await pendingSave;
    });

    expect(benComposer).toHaveValue('Ben-only follow-up draft.');
    expect(screen.queryByText(/note saved to Ava Stone/i)).not.toBeInTheDocument();
  });});
