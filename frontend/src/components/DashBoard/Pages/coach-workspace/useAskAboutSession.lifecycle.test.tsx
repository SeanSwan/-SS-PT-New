import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAskAboutSession } from './useAskAboutSession';

const slot = { clientId: 12, startsAt: new Date('2026-09-23T16:00:00Z') };
function args() {
  return {
    actorKey: '7:trainer', threadKey: '', noteMode: false,
    clientPin: { clients: [{ id: 12 }, { id: 14 }], selectedClientId: 14 as number | null, onSelectClient: vi.fn() },
    admission: { phase: 'ready', targetUserId: 14 as number | null, requestGeneration: 3, returning: false },
    isClientMode: false, write: vi.fn(), closeSheets: vi.fn(), notify: vi.fn(),
  };
}
afterEach(() => vi.useRealTimers());

describe('schedule Ask owns a local intent until admission succeeds', () => {
  it('R2: a route pin is not admission; a 9-second read stages exactly once', () => {
    vi.useFakeTimers();
    const a = args();
    const h = renderHook((props) => useAskAboutSession(props), { initialProps: a });
    act(() => h.result.current(slot));
    const checking = { ...a, clientPin: { ...a.clientPin, selectedClientId: 12 }, admission: { ...a.admission, phase: 'checking', requestGeneration: 4 } };
    h.rerender(checking);
    h.rerender({ ...checking, admission: { ...checking.admission, requestGeneration: 6 } });
    expect(a.write).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(9000));
    h.rerender({ ...checking, admission: { ...checking.admission, phase: 'ready', targetUserId: 12 } });
    expect(a.write).toHaveBeenCalledTimes(1);
    expect(a.write).toHaveBeenCalledWith(expect.stringContaining('Prep me'));
    h.rerender({ ...checking, admission: { ...checking.admission, phase: 'ready', targetUserId: 12 } });
    expect(a.write).toHaveBeenCalledTimes(1);
  });

  it.each(['denied', 'unavailable', 'invalid', 'retired', 'blocked-return'])('R2: %s cancels visibly and later admission cannot replay', (phase) => {
    const a = args();
    const h = renderHook((props) => useAskAboutSession(props), { initialProps: a });
    act(() => h.result.current(slot));
    h.rerender({ ...a, admission: { ...a.admission, phase, requestGeneration: 4 } });
    expect(a.notify).toHaveBeenLastCalledWith(expect.stringMatching(/couldn't|cancelled/i));
    h.rerender({ ...a, clientPin: { ...a.clientPin, selectedClientId: 12 }, admission: { ...a.admission, phase: 'ready', targetUserId: 12, requestGeneration: 5 } });
    expect(a.write).not.toHaveBeenCalled();
  });

  it('R2: returning from a protected draft never appends the discarded question', () => {
    const a = args();
    const h = renderHook((props) => useAskAboutSession(props), { initialProps: a });
    act(() => h.result.current(slot));
    h.rerender({ ...a, admission: { ...a.admission, phase: 'decision', requestGeneration: 4 } });
    h.rerender({ ...a, admission: { ...a.admission, phase: 'committing', requestGeneration: 5, returning: true } });
    h.rerender({ ...a, clientPin: { ...a.clientPin, selectedClientId: 12 }, admission: { ...a.admission, targetUserId: 12, requestGeneration: 6 } });
    expect(a.write).not.toHaveBeenCalled();
  });

  it('R2: a superseding selection cancels even when it eventually returns to the requested client', () => {
    const a = args();
    const h = renderHook((props) => useAskAboutSession(props), { initialProps: a });
    act(() => h.result.current(slot));
    const checking = { ...a, clientPin: { ...a.clientPin, selectedClientId: 12 }, admission: { ...a.admission, phase: 'checking', requestGeneration: 4 } };
    h.rerender(checking);
    h.rerender({ ...checking, clientPin: { ...a.clientPin, selectedClientId: 14 }, admission: { ...checking.admission, requestGeneration: 5 } });
    h.rerender({ ...checking, admission: { ...checking.admission, phase: 'ready', targetUserId: 12, requestGeneration: 6 } });
    expect(a.write).not.toHaveBeenCalled();
  });

  it('R2: actor changes and unmount retire pending intents', () => {
    const a = args();
    const h = renderHook((props) => useAskAboutSession(props), { initialProps: a });
    act(() => h.result.current(slot));
    h.rerender({ ...a, actorKey: '8:trainer' });
    h.rerender({ ...a, clientPin: { ...a.clientPin, selectedClientId: 12 }, admission: { ...a.admission, targetUserId: 12, requestGeneration: 4 } });
    expect(a.write).not.toHaveBeenCalled();
    h.unmount();
  });

  it('R3: Client Notes mode refuses Ask without changing client or note text', () => {
    const a = { ...args(), noteMode: true };
    const h = renderHook(() => useAskAboutSession(a));
    act(() => h.result.current(slot));
    expect(a.clientPin.onSelectClient).not.toHaveBeenCalled();
    expect(a.write).not.toHaveBeenCalled();
    expect(a.notify).toHaveBeenCalledWith(expect.stringMatching(/leave client.note mode/i));
  });

  it('R2: a pin-changing Ask may clear its own routed thread before admission', () => {
    const a = { ...args(), threadKey: '44' };
    const h = renderHook((props) => useAskAboutSession(props), { initialProps: a });
    act(() => h.result.current(slot));
    h.rerender({ ...a, threadKey: '', clientPin: { ...a.clientPin, selectedClientId: 12 },
      admission: { ...a.admission, phase: 'checking', requestGeneration: 4 } });
    h.rerender({ ...a, threadKey: '', clientPin: { ...a.clientPin, selectedClientId: 12 },
      admission: { ...a.admission, phase: 'ready', targetUserId: 12, requestGeneration: 6 } });
    expect(a.write).toHaveBeenCalledTimes(1);
  });

  it('R2: choosing another thread cancels the pending Ask permanently', () => {
    const a = { ...args(), threadKey: '44' };
    const h = renderHook((props) => useAskAboutSession(props), { initialProps: a });
    act(() => h.result.current(slot));
    h.rerender({ ...a, threadKey: '55', admission: { ...a.admission, phase: 'checking', requestGeneration: 4 } });
    h.rerender({ ...a, threadKey: '', clientPin: { ...a.clientPin, selectedClientId: 12 },
      admission: { ...a.admission, phase: 'ready', targetUserId: 12, requestGeneration: 6 } });
    expect(a.write).not.toHaveBeenCalled();
  });

  it('R2: an already admitted scope appends once; client self mode needs no staff admission', () => {
    const a = args();
    a.clientPin.selectedClientId = 12;
    a.admission.targetUserId = 12;
    const h = renderHook((props) => useAskAboutSession(props), { initialProps: a });
    act(() => h.result.current(slot));
    expect(a.write).toHaveBeenCalledTimes(1);
    h.rerender({ ...a, isClientMode: true, admission: { ...a.admission, phase: 'retired' } });
    act(() => h.result.current(slot));
    expect(a.write).toHaveBeenLastCalledWith(expect.stringContaining('my'));
  });
});
