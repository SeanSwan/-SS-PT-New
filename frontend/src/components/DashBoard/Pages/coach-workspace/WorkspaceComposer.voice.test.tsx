import { createRef } from 'react';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import WorkspaceComposer from './WorkspaceComposer';

vi.mock('../coach-assistant/CoachCommandCatalogSheet', () => ({ default: () => null }));
// The recorder modal used to be mocked here as a SENTINEL — deliberately non-null, so
// that `queryByTestId('recorder-overlay')` would catch the composer rendering it again.
// PR 131 took it out of the composer and the 2026-09-26 dead-chain purge deleted the
// module outright, so the sentinel has nothing left to mark and the runtime assertions
// below would pass vacuously. The source assertion at the end of this file is the
// stronger claim and cannot go vacuous.

type VoicePhase = 'idle' | 'listening' | 'transcribing';
type VoiceOverrides = {
  voiceActive?: boolean;
  voiceCaptureMode?: 'browser' | 'recorder' | 'none';
  voiceGetLevel?: (() => number) | null;
  voicePhase?: VoicePhase;
};

function buildModel(voice: VoiceOverrides) {
  const controller = {
    commandBusy: false,
    commandFormRef: createRef<HTMLFormElement>(),
    commandText: '',
    commandTextRef: createRef<HTMLTextAreaElement>(),
    clientPin: { clients: [], loadingClients: false, onSelectClient: vi.fn(), selectedClientId: null },
    handleIntentSubmit: vi.fn(),
    handleSubmit: vi.fn(),
    handleVoice: vi.fn(),
    notebook: undefined,
    selectedStatus: '',
    setCommandText: vi.fn(),
    voiceActive: false,
    voiceCaptureMode: 'recorder',
    voiceGetLevel: null,
    voicePhase: 'idle',
    ...voice,
  };
  return {
    catalog: { commands: [] },
    controller,
    isClientMode: false,
    prefill: vi.fn(),
    requestPdf: vi.fn(() => false),
    runAction: vi.fn(),
    view: 'chat',
  };
}

function mount(voice: VoiceOverrides) {
  const model = buildModel(voice);
  const view = render(<MemoryRouter><WorkspaceComposer model={model as never} /></MemoryRouter>);
  const rerender = (next: VoiceOverrides) => {
    view.rerender(<MemoryRouter><WorkspaceComposer model={buildModel(next) as never} /></MemoryRouter>);
  };
  return { model, rerender };
}

const strip = () => screen.queryByTestId('coach-voice-strip');

describe('WorkspaceComposer — the mic is inline, and the recorder modal is gone', () => {
  it('opens the inline strip in place, and never mounts the recorder overlay', () => {
    const { model, rerender } = mount({ voiceCaptureMode: 'recorder', voiceGetLevel: () => 0.5 });
    expect(screen.getByRole('button', { name: 'Record and transcribe' })).toBeEnabled();
    expect(strip()).toBeNull();

    rerender({ voiceActive: true, voiceCaptureMode: 'recorder', voiceGetLevel: () => 0.5, voicePhase: 'listening' });

    expect(strip()).not.toBeNull();
    const mic = screen.getByRole('button', { name: 'Recording — tap to stop' });
    expect(mic).toHaveAttribute('aria-pressed', 'true');
    expect(mic).toHaveAttribute('data-live', 'true');
    expect(model.controller.handleVoice).not.toHaveBeenCalled();
  });

  it('the strip belongs to the listening lane, not to the transcribing wait', () => {
    mount({ voiceActive: true, voiceCaptureMode: 'recorder', voiceGetLevel: () => 0.5, voicePhase: 'transcribing' });
    expect(strip()).toBeNull();
    expect(screen.getByRole('button', { name: 'Transcribing — tap to discard' })).toBeEnabled();
  });

  it('browser dictation still shows the strip even though it owns no stream to meter', () => {
    // Browser SpeechRecognition exposes no media stream, so the controller hands
    // the meter a null getLevel and the meter falls back to its own pulse.
    mount({ voiceActive: true, voiceCaptureMode: 'browser', voiceGetLevel: null, voicePhase: 'listening' });
    expect(strip()).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Listening — tap to stop' })).toBeEnabled();
  });

  it('a browser with no capture lane at all disables the mic and says why', () => {
    mount({ voiceCaptureMode: 'none' });
    const mic = screen.getByRole('button', { name: 'Dictate' });
    expect(mic).toBeDisabled();
    expect(mic).toHaveAttribute('title', 'Voice is not available in this browser');
  });

  it('the recorder modal is gone from the source, not merely unmounted', () => {
    // Runtime absence was the old sentinel's job. Now that the module is deleted the
    // claim is checkable in the source, which also catches a re-introduction.
    expect(existsSync(resolve(__dirname, '../coach-assistant/VoiceRecordingOverlay.tsx'))).toBe(false);
    expect(readFileSync(resolve(__dirname, 'WorkspaceComposer.tsx'), 'utf8')).not.toContain('VoiceRecordingOverlay');
  });
});
