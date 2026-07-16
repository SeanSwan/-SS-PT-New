/**
 * End-to-end component contract from browser speech result to voice-sourced API draft.
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SupportIssue, SupportIssueClient } from '../../services/supportIssueService';
import SupportReportComposer from './SupportReportComposer';

class FakeRecognition {
  static last: FakeRecognition | null = null;
  continuous = false;
  interimResults = false;
  lang = '';
  maxAlternatives = 1;
  processLocally = false;
  onresult: ((event: SpeechRecognitionEvent) => void) | null = null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null = null;
  onend: (() => void) | null = null;
  aborted = false;
  constructor() { FakeRecognition.last = this; }
  start() {}
  stop() { this.onend?.(); }
  abort() { this.aborted = true; }
  emit(transcript: string) {
    const result = {
      isFinal: true,
      length: 1,
      0: { transcript, confidence: 0.9 },
      item: () => ({ transcript, confidence: 0.9 }),
    };
    this.onresult?.({ resultIndex: 0, results: [result] } as unknown as SpeechRecognitionEvent);
  }
}

const speechWindow = window as Window;

beforeEach(() => {
  speechWindow.SpeechRecognition = FakeRecognition as unknown as SpeechRecognitionConstructor;
});

afterEach(() => {
  delete speechWindow.SpeechRecognition;
  delete speechWindow.webkitSpeechRecognition;
});

describe('SupportReportComposer voice workflow', () => {
  it('never replaces an existing twelfth reproduction step with more dictation', () => {
    const client: SupportIssueClient = {
      createIssue: vi.fn(), listIssues: vi.fn(), getIssue: vi.fn(), addReply: vi.fn(),
    };
    render(<SupportReportComposer client={client} onSubmitted={vi.fn()} />);
    const existingSteps = Array.from({ length: 12 }, (_, index) => `Existing step ${index + 1}`).join('\n');
    fireEvent.change(screen.getByLabelText(/steps to repeat it/i), { target: { value: existingSteps } });
    fireEvent.change(screen.getByLabelText(/where should swan coach write next/i), { target: { value: 'steps' } });
    fireEvent.click(screen.getByRole('button', { name: /start talking/i }));

    act(() => { FakeRecognition.last?.emit('This must not replace step twelve.'); });

    expect(screen.getByLabelText(/steps to repeat it/i)).toHaveValue(existingSteps);
  });

  it('keeps dictated text editable and marks the submitted report as voice-sourced', async () => {
    const issue = {
      id: '11111111-1111-4111-8111-111111111111',
      referenceCode: 'SWR-20260716-A1B2C3D4',
      category: 'bug', severity: 'medium', status: 'new', source: 'voice',
      title: 'The workout logger froze after I pressed save',
      description: 'The workout logger froze after I pressed save.',
      reproductionSteps: [], diagnostics: {},
      lastActivityAt: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    } satisfies SupportIssue;
    const client: SupportIssueClient = {
      createIssue: vi.fn().mockResolvedValue(issue),
      listIssues: vi.fn(), getIssue: vi.fn(), addReply: vi.fn(),
    };
    const submitted = vi.fn();
    render(<SupportReportComposer client={client} onSubmitted={submitted} />);

    fireEvent.click(screen.getByRole('button', { name: /start talking/i }));
    const activeRecognition = FakeRecognition.last;
    act(() => { activeRecognition?.emit('The workout logger froze after I pressed save.'); });

    expect(screen.getByLabelText(/^what happened\?$/i)).toHaveValue('The workout logger froze after I pressed save.');
    expect(screen.getByLabelText(/short title/i)).toHaveValue('The workout logger froze after I pressed save.');

    fireEvent.click(screen.getByRole('button', { name: /^send report$/i }));
    await waitFor(() => expect(client.createIssue).toHaveBeenCalledWith(expect.objectContaining({
      source: 'voice',
      description: 'The workout logger froze after I pressed save.',
    })));
    expect(activeRecognition?.aborted).toBe(true);
    expect(submitted).toHaveBeenCalledWith(issue);
  });
});
