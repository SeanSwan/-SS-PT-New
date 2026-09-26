/**
 * CoachConsoleDock — inline dictation strip and submit hygiene.
 *
 * The dock is the render site that used to mount VoiceRecordingOverlay. These
 * tests pin the two things that changed: nothing modal is rendered for voice,
 * and submitting while the microphone is open closes it.
 */
import { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import CoachConsoleDock from './CoachConsoleDock';
import type { CoachDockVoice } from './CoachDictationStrip';

type DockProps = React.ComponentProps<typeof CoachConsoleDock>;

const idleVoice: CoachDockVoice = {
  active: false,
  cancel: vi.fn(),
  captureMode: 'recorder',
  elapsedSeconds: 0,
  levels: [],
  metering: false,
  phase: 'idle',
  supported: true,
};

function renderDock(overrides: Partial<DockProps> = {}, voice: Partial<CoachDockVoice> = {}) {
  const props: DockProps = {
    commandFormRef: createRef<HTMLFormElement>(),
    commandText: '',
    commandTextRef: createRef<HTMLTextAreaElement>(),
    onAttach: vi.fn(),
    onCommandTextChange: vi.fn(),
    onReadback: vi.fn(),
    onStartPlaudUpload: vi.fn(),
    onSubmit: vi.fn(),
    onVoice: vi.fn(),
    selectedStatus: 'Ready',
    voice: { ...idleVoice, ...voice },
    ...overrides,
  };
  render(
    <MemoryRouter>
      <CoachConsoleDock {...props} />
    </MemoryRouter>,
  );
  return props;
}

describe('CoachConsoleDock inline dictation', () => {
  it('renders no voice overlay on any phase', () => {
    renderDock({}, { active: true, phase: 'listening' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the listening strip with a live clock while capturing', () => {
    renderDock({}, { active: true, captureMode: 'recorder', elapsedSeconds: 7, phase: 'listening' });

    expect(screen.getByRole('button', { name: /recording - tap to stop/i })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByPlaceholderText('Listening...')).toBeInTheDocument();
    // The clock is the only honest "still running" signal on the recorder
    // branch, which has no interim words.
    expect(screen.getByText(/0:07/)).toBeInTheDocument();
  });

  it('drives the bars from real levels when an analyser is attached', () => {
    const { container } = render(
      <MemoryRouter>
        <CoachConsoleDock
          commandFormRef={createRef<HTMLFormElement>()}
          commandText=""
          commandTextRef={createRef<HTMLTextAreaElement>()}
          onAttach={vi.fn()}
          onCommandTextChange={vi.fn()}
          onReadback={vi.fn()}
          onStartPlaudUpload={vi.fn()}
          onSubmit={vi.fn()}
          onVoice={vi.fn()}
          selectedStatus="Ready"
          voice={{
            ...idleVoice,
            active: true,
            levels: [0.4, 0.8, 0.1, 0.6, 0.2],
            metering: true,
            phase: 'listening',
          }}
        />
      </MemoryRouter>,
    );

    const bars = container.querySelectorAll('.dock-listening-bar');
    expect(bars).toHaveLength(5);
    expect(container.querySelector('.dock-listening-bar.is-ambient')).toBeNull();
    expect((bars[1] as HTMLElement).style.transform).toBe('scaleY(0.8)');
  });

  it('falls back to an ambient pulse when no analyser is attached', () => {
    const { container } = render(
      <MemoryRouter>
        <CoachConsoleDock
          commandFormRef={createRef<HTMLFormElement>()}
          commandText=""
          commandTextRef={createRef<HTMLTextAreaElement>()}
          onAttach={vi.fn()}
          onCommandTextChange={vi.fn()}
          onReadback={vi.fn()}
          onStartPlaudUpload={vi.fn()}
          onSubmit={vi.fn()}
          onVoice={vi.fn()}
          selectedStatus="Ready"
          voice={{ ...idleVoice, active: true, captureMode: 'browser', phase: 'listening' }}
        />
      </MemoryRouter>,
    );

    expect(container.querySelectorAll('.dock-listening-bar.is-ambient')).toHaveLength(5);
  });

  it('discards the open microphone before submitting the composer', () => {
    const onSubmit = vi.fn();
    const cancel = vi.fn();

    renderDock(
      { commandText: 'log squats three by ten', onSubmit },
      { active: true, phase: 'listening', cancel },
    );

    fireEvent.click(screen.getByRole('button', { name: /^send to swan coach$/i }));

    expect(cancel).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(cancel.mock.invocationCallOrder[0]).toBeLessThan(onSubmit.mock.invocationCallOrder[0]);
  });

  /**
   * The RECORD branch holds the audio until the transcript arrives, so the
   * composer is EMPTY while a transcription is in flight. Cancelling on submit
   * destroyed the speaker's words and `handleSubmit` then returned early on
   * `!trimmed` — data loss with nothing written to the status line.
   */
  it('leaves an in-flight transcript alone when there is nothing to send', () => {
    const onSubmit = vi.fn();
    const cancel = vi.fn();

    renderDock({ commandText: '', onSubmit }, { active: true, phase: 'transcribing', cancel });

    fireEvent.click(screen.getByRole('button', { name: /^send to swan coach$/i }));

    expect(cancel).not.toHaveBeenCalled();
    // Whitespace is not something to send either.
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('does not touch voice state when submitting with the microphone closed', () => {
    const onSubmit = vi.fn();
    const cancel = vi.fn();

    renderDock({ onSubmit }, { active: false, phase: 'idle', cancel });

    fireEvent.click(screen.getByRole('button', { name: /^send to swan coach$/i }));

    expect(cancel).not.toHaveBeenCalled();
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  /**
   * A disabled control whose accessible name promises the action it is disabled
   * for is an a11y lie: "Start voice dictation" was announced over a button
   * that cannot start anything.
   */
  it('does not promise dictation in the mic label when voice is unavailable', () => {
    renderDock({}, { captureMode: 'none', supported: false });

    const mic = screen.getByRole('button', { name: /not available in this browser/i });

    expect(mic).toBeDisabled();
    expect(screen.queryByRole('button', { name: /^start voice dictation$/i })).toBeNull();
  });
});
