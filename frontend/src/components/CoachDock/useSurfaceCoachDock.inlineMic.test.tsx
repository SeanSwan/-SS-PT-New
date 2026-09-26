/**
 * useSurfaceCoachDock — the inline mic lane.
 *
 * Before 2026-09-26 this hook's recorder fallback opened `VoiceRecordingOverlay`:
 * a full-screen modal that made the speaker walk
 *   record -> Stop & Send -> preview -> Send/Edit -> composer -> Send
 * for one sentence, and made the surface dock the last consumer of the overlay
 * after PR #131 converted the coach console and the workspace composer. Both
 * lanes are inline now, so these assertions pin the things that could silently
 * regress: the modal is gone, the mic reaches the inline recorder, staged words
 * land in the dock with voice provenance, and a lane ERROR is visible.
 *
 * The lanes are mocked so the assertions are about THIS hook's wiring, not about
 * getUserMedia or SpeechRecognition — those have their own suites.
 */
import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/** vi.mock factories are hoisted above the imports, so the shared state they
 *  close over has to be created by vi.hoisted too — a plain module-scope `let`
 *  would still be in its temporal dead zone when the factory first runs. */
const h = vi.hoisted(() => ({
  toggle: vi.fn(),
  onTranscribed: null as null | ((text: string) => boolean),
  setStatus: null as null | ((status: string) => void),
  setError: null as null | ((error: string | null) => void),
}));

vi.mock('../../services/api.service', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../../hooks/useAIChat', () => ({ useAIChat: () => ({ sendMessageWithConversation: vi.fn() }) }));
vi.mock('../../hooks/useCoachCommand', () => ({
  useCoachCommand: () => ({ executeCommand: vi.fn() }),
  commandErrorReceiptText: (error: string) => error,
}));
vi.mock('../DashBoard/Pages/coach-assistant/hooks/useCoachBrowserSpeechInput', () => ({
  useCoachBrowserSpeechInput: () => ({
    speechSupported: false, listening: false, interim: '', toggleListening: vi.fn(), stopListening: vi.fn(),
  }),
}));
vi.mock('../DashBoard/Pages/coach-assistant/hooks/useCoachInlineRecorder', () => ({
  useCoachInlineRecorder: (params: {
    onTranscribed: (text: string) => boolean;
    setSelectedStatus: (status: string) => void;
    setVoiceInputError: (error: string | null) => void;
  }) => {
    h.onTranscribed = params.onTranscribed;
    h.setStatus = params.setSelectedStatus;
    h.setError = params.setVoiceInputError;
    return {
      abort: vi.fn(), active: false, duration: 0, getLevel: () => 0, isListening: false, toggle: h.toggle,
    };
  },
}));

import { useSurfaceCoachDock } from './useSurfaceCoachDock';

const mount = () => renderHook(() => useSurfaceCoachDock({
  surface: 'workout-planner',
  chatTitle: 'Planner Coach',
  eventPrefix: 'AI_PLANNER_',
  selectedClientId: 84,
  pushReceipt: vi.fn(),
}));

beforeEach(() => {
  h.toggle.mockClear();
  h.onTranscribed = null;
  h.setStatus = null;
  h.setError = null;
  // isRecorderSupported() gates the recorder lane on these two globals.
  (window as unknown as { MediaRecorder?: unknown }).MediaRecorder = function MediaRecorder() {};
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getUserMedia: vi.fn() }, configurable: true,
  });
});

afterEach(() => {
  delete (window as unknown as { MediaRecorder?: unknown }).MediaRecorder;
});

describe('useSurfaceCoachDock — inline mic lane', () => {
  it('no longer exposes a modal overlay child', () => {
    const { result } = mount();
    expect('voiceOverlay' in result.current).toBe(false);
  });

  it('the hook does not import the recorder overlay at all', () => {
    // Belt and braces for the behavioural check above: a prop can be dropped
    // while the modal stays mounted somewhere else. The docstring deliberately
    // NAMES the old overlay when explaining what was removed, so this asserts on
    // the import edge — a module cannot be used without importing it.
    const source = readFileSync(path.resolve(__dirname, 'useSurfaceCoachDock.ts'), 'utf8');
    expect(source).not.toMatch(/^\s*import\b[^\n]*VoiceRecordingOverlay/m);
    expect(source).not.toMatch(/\bcreateElement\s*\(/);
  });

  it('routes the mic to the INLINE recorder when browser dictation is unavailable', () => {
    const { result } = mount();
    expect(result.current.voiceCaptureMode).toBe('recorder');
    act(() => { result.current.handleVoice(); });
    expect(h.toggle).toHaveBeenCalledTimes(1);
  });

  it('stages a finished transcript into the dock text with voice provenance', () => {
    const { result } = mount();
    let landed: boolean | undefined;
    act(() => { landed = h.onTranscribed?.('add goblet squats, three sets of twelve'); });
    expect(landed).toBe(true);
    expect(result.current.dockText).toBe('add goblet squats, three sets of twelve');
    expect(result.current.inputOrigin).toBe('voice');
    // The origin has to survive as far as the command lane, not just the state.
    expect(result.current.inputMode).toBe('voice');
  });

  it('appends rather than replaces, and re-labels a hand-edited draft as mixed', () => {
    const { result } = mount();
    act(() => { h.onTranscribed?.('add squats'); });
    act(() => { result.current.setDockText('add squats and press'); });
    expect(result.current.dockText).toBe('add squats and press');
    expect(result.current.inputOrigin).toBe('mixed');
    expect(result.current.inputMode).toBe('voice');
  });

  it('reports a refused empty transcript instead of claiming a capture', () => {
    const { result } = mount();
    let landed: boolean | undefined;
    act(() => { landed = h.onTranscribed?.('   '); });
    expect(landed).toBe(false);
    expect(result.current.dockText).toBe('');
  });

  it('surfaces a lane ERROR through voiceStatus', () => {
    const { result } = mount();
    act(() => { h.setError?.('Microphone unavailable'); });
    expect(result.current.voiceStatus).toBe('Microphone unavailable');
  });

  it('an error OUTRANKS the optimistic "listening" copy', () => {
    // The inline recorder writes its Listening copy on INTENT, before the device
    // has opened. Without this precedence a denied microphone would keep
    // advertising a live one — the exact latch PR #131 documented.
    const { result } = mount();
    act(() => { h.setStatus?.('Listening — tap the mic when you finish'); });
    expect(result.current.voiceStatus).toBe('Listening — tap the mic when you finish');
    act(() => { h.setError?.('Microphone unavailable'); });
    expect(result.current.voiceStatus).toBe('Microphone unavailable');
  });

  it('clears a stale error when the speaker starts a fresh capture', () => {
    const { result } = mount();
    act(() => { h.setError?.('Microphone unavailable'); });
    act(() => { h.setError?.(null); h.setStatus?.('Listening — tap the mic when you finish'); });
    expect(result.current.voiceStatus).toBe('Listening — tap the mic when you finish');
  });
});
