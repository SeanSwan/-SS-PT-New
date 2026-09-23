import { describe, expect, it } from 'vitest';
import { brainState } from './WorkspaceHeader';

const model = (over: Record<string, unknown> = {}, failed = false) => ({
  controller: { commandBusy: false, chatLoading: false, selectionPhase: 'ready', ...over },
  catalog: { failed },
}) as never;

describe('workspace brain status is truthful', () => {
  it('ready only when admitted and idle', () => {
    expect(brainState(model())).toEqual({ state: 'ready', label: 'Ready' });
    expect(brainState(model({ selectionPhase: 'retired' }))).toEqual({ state: 'ready', label: 'Ready' }); // client surface
  });
  it('never says Ready while the send path would refuse', () => {
    for (const phase of ['unadmitted', 'checking', 'unavailable', 'denied', 'invalid', 'blocked-return', 'decision']) {
      expect(brainState(model({ selectionPhase: phase })).state, phase).not.toBe('ready');
    }
  });
  it('busy wins; catalog failure is degraded', () => {
    expect(brainState(model({ commandBusy: true, selectionPhase: 'unavailable' }))).toEqual({ state: 'busy', label: 'Thinking' });
    expect(brainState(model({}, true))).toEqual({ state: 'degraded', label: 'Commands offline' });
  });
});
