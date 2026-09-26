/**
 * The inline recorder lane's honesty contract.
 *
 * Every assertion here pins a way the lane could narrate failure as success:
 * a denied microphone left standing as "Listening", a stalled transcription
 * with no escape, an empty transcript reported as a capture, or a stage the
 * live admission refused reported as if the words had landed.
 */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  INLINE_RECORDER_CAPTURED_COPY,
  INLINE_RECORDER_DISCARDED_COPY,
  INLINE_RECORDER_EMPTY_COPY,
  INLINE_RECORDER_LISTENING_COPY,
  INLINE_RECORDER_TRANSCRIBING_COPY,
  useCoachInlineRecorder,
} from './useCoachInlineRecorder';

const recorderStub = vi.hoisted(() => ({
  abort: vi.fn(),
  audioBlob: null as Blob | null,
  duration: 0,
  error: null as string | null,
  getAudioLevel: () => 0.5,
  reset: vi.fn(),
  start: vi.fn(),
  state: 'idle' as string,
  stop: vi.fn(),
}));
const transcriptionStub = vi.hoisted(() => ({
  error: null as string | null,
  reset: vi.fn(),
  state: 'idle' as string,
  text: '',
  transcribe: vi.fn(),
}));

vi.mock('./useVoiceRecorder', () => ({ useVoiceRecorder: () => recorderStub }));
vi.mock('./useGeminiTranscription', () => ({ useGeminiTranscription: () => transcriptionStub }));

function setup(onTranscribed: (text: string) => boolean = () => true) {
  const statuses: string[] = [];
  const errors: (string | null)[] = [];
  const view = renderHook(() => useCoachInlineRecorder({
    onTranscribed,
    setSelectedStatus: (status: string) => statuses.push(status),
    setVoiceInputError: (error: string | null) => errors.push(error),
  }));
  return { ...view, errors, statuses };
}

beforeEach(() => {
  recorderStub.state = 'idle';
  recorderStub.audioBlob = null;
  recorderStub.error = null;
  transcriptionStub.state = 'idle';
  transcriptionStub.text = '';
  transcriptionStub.error = null;
  recorderStub.abort.mockReset();
  recorderStub.reset.mockReset();
  recorderStub.start.mockReset();
  recorderStub.stop.mockReset();
  transcriptionStub.reset.mockReset();
  transcriptionStub.transcribe.mockReset();
});

describe('useCoachInlineRecorder — inline capture without an overlay', () => {
  it('starts the mic inline and announces listening', () => {
    const { result, statuses } = setup();

    act(() => { result.current.toggle(); });

    expect(recorderStub.start).toHaveBeenCalledTimes(1);
    expect(statuses).toContain(INLINE_RECORDER_LISTENING_COPY);
    expect(result.current.isListening).toBe(false);
  });

  it('surfaces a denied microphone instead of leaving "Listening" standing', () => {
    const { result, rerender, errors } = setup();

    act(() => { result.current.toggle(); });
    recorderStub.state = 'error';
    recorderStub.error = 'Microphone access was blocked';
    act(() => { rerender(); });

    expect(errors).toContain('Microphone access was blocked');
  });

  it('lets the mic discard a stalled transcription instead of stranding the speaker', () => {
    const onTranscribed = vi.fn(() => true);
    const { result, rerender, statuses } = setup(onTranscribed);

    act(() => { result.current.toggle(); });
    recorderStub.state = 'recording';
    act(() => { rerender(); });
    act(() => { result.current.toggle(); });

    recorderStub.state = 'stopped';
    recorderStub.audioBlob = new Blob(['audio']);
    act(() => { rerender(); });
    expect(transcriptionStub.transcribe).toHaveBeenCalledTimes(1);
    expect(statuses).toContain(INLINE_RECORDER_TRANSCRIBING_COPY);

    act(() => { result.current.toggle(); });

    expect(recorderStub.abort).toHaveBeenCalled();
    expect(statuses).toContain(INLINE_RECORDER_DISCARDED_COPY);
    expect(onTranscribed).not.toHaveBeenCalled();
  });

  it('stages a real transcript exactly once and reports the capture', () => {
    const onTranscribed = vi.fn(() => true);
    const { rerender, statuses } = setup(onTranscribed);

    transcriptionStub.state = 'done';
    transcriptionStub.text = 'Log squats 3 by 10';
    act(() => { rerender(); });
    act(() => { rerender(); });

    expect(onTranscribed).toHaveBeenCalledTimes(1);
    expect(onTranscribed).toHaveBeenCalledWith('Log squats 3 by 10');
    expect(statuses).toContain(INLINE_RECORDER_CAPTURED_COPY);
  });

  it('reports an empty transcript as nothing added, never as a capture', () => {
    const onTranscribed = vi.fn(() => true);
    const { rerender, statuses } = setup(onTranscribed);

    transcriptionStub.state = 'done';
    transcriptionStub.text = '   ';
    act(() => { rerender(); });

    expect(onTranscribed).not.toHaveBeenCalled();
    expect(statuses).toContain(INLINE_RECORDER_EMPTY_COPY);
    expect(statuses).not.toContain(INLINE_RECORDER_CAPTURED_COPY);
  });

  it('reports a refused stage as nothing added instead of claiming a capture', () => {
    const onTranscribed = vi.fn(() => false);
    const { rerender, statuses } = setup(onTranscribed);

    transcriptionStub.state = 'done';
    transcriptionStub.text = 'Log squats 3 by 10';
    act(() => { rerender(); });

    expect(onTranscribed).toHaveBeenCalledWith('Log squats 3 by 10');
    expect(statuses).not.toContain(INLINE_RECORDER_CAPTURED_COPY);
    expect(statuses).toContain(INLINE_RECORDER_EMPTY_COPY);
  });

  it('discards on abort without ever staging', () => {
    const onTranscribed = vi.fn(() => true);
    const { result, rerender } = setup(onTranscribed);

    act(() => { result.current.abort(); });
    transcriptionStub.state = 'done';
    transcriptionStub.text = 'Log squats 3 by 10';
    act(() => { rerender(); });

    expect(recorderStub.abort).toHaveBeenCalled();
    expect(onTranscribed).not.toHaveBeenCalled();
  });
});
