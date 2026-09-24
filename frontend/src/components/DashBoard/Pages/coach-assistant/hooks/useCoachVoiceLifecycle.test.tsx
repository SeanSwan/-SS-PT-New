/**
 * G06 — useCoachVoiceLifecycle unit contract.
 *
 * Backgrounding, logout and surface teardown each stop BOTH output and
 * capture; bargeIn stops output only. The lifecycle exposes no action-lane
 * API at all: a voice stop structurally cannot cancel a write.
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCoachVoiceLifecycle } from './useCoachVoiceLifecycle';

function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
}

describe('useCoachVoiceLifecycle', () => {
  beforeEach(() => {
    setHidden(false);
  });

  afterEach(() => {
    setHidden(false);
  });

  it('stops output and capture when the tab is hidden while voice is active', () => {
    const stopSpeechOutput = vi.fn();
    const stopCapture = vi.fn();
    const view = renderHook(() => useCoachVoiceLifecycle({
      authenticated: true,
      stopCapture,
      stopSpeechOutput,
    }));

    setHidden(true);
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(stopSpeechOutput).toHaveBeenCalledTimes(1);
    expect(stopCapture).toHaveBeenCalledTimes(1);
    view.unmount();
  });

  it('ignores a visibility flip back to visible without stopping again', () => {
    const stopSpeechOutput = vi.fn();
    const stopCapture = vi.fn();
    renderHook(() => useCoachVoiceLifecycle({
      authenticated: true,
      stopCapture,
      stopSpeechOutput,
    }));

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(stopSpeechOutput).not.toHaveBeenCalled();
    expect(stopCapture).not.toHaveBeenCalled();
  });

  it('stops on logout only when authentication actually flips off', () => {
    const stopSpeechOutput = vi.fn();
    const stopCapture = vi.fn();
    const view = renderHook(({ authenticated }) => useCoachVoiceLifecycle({
      authenticated,
      stopCapture,
      stopSpeechOutput,
    }), { initialProps: { authenticated: true } });

    view.rerender({ authenticated: true });
    expect(stopCapture).not.toHaveBeenCalled();

    view.rerender({ authenticated: false });
    expect(stopSpeechOutput).toHaveBeenCalledTimes(1);
    expect(stopCapture).toHaveBeenCalledTimes(1);
  });

  it('stops output and capture on surface teardown', () => {
    const stopSpeechOutput = vi.fn();
    const stopCapture = vi.fn();
    const view = renderHook(() => useCoachVoiceLifecycle({
      authenticated: true,
      stopCapture,
      stopSpeechOutput,
    }));

    view.unmount();
    expect(stopSpeechOutput).toHaveBeenCalledTimes(1);
    expect(stopCapture).toHaveBeenCalledTimes(1);
  });

  it('bargeIn stops output only, keeping the capture lane live', () => {
    const stopSpeechOutput = vi.fn();
    const stopCapture = vi.fn();
    const view = renderHook(() => useCoachVoiceLifecycle({
      authenticated: true,
      stopCapture,
      stopSpeechOutput,
    }));

    act(() => {
      view.result.current.bargeIn();
    });
    expect(stopSpeechOutput).toHaveBeenCalledTimes(1);
    expect(stopCapture).not.toHaveBeenCalled();
  });
});
