/**
 * resolveDataStatus — the three gate bugs this workstream shipped, pinned.
 */
import { describe, expect, it } from 'vitest';
import { isDataKnown, resolveDataStatus } from './resolveDataStatus';

describe('resolveDataStatus', () => {
  it('is loading while the first request is in flight', () => {
    // The `isError && !data` gate read FALSE here, so the UI asserted zeros.
    expect(resolveDataStatus({ data: undefined, isError: false, fetchStatus: 'fetching' }))
      .toBe('loading');
  });

  it('is still loading during the retry backoff, when nothing is fetching yet', () => {
    expect(resolveDataStatus({ data: undefined, isError: false, fetchStatus: 'paused' }))
      .toBe('loading');
  });

  it('is unavailable — not loading — for a disabled query that will never resolve', () => {
    // `enabled: !!user` goes false on session expiry; a spinner would be a lie
    // that never terminates and offers no way out.
    expect(resolveDataStatus({ data: undefined, isError: false, fetchStatus: 'idle' }))
      .toBe('unavailable');
  });

  it('is unavailable when the request failed with nothing cached', () => {
    expect(resolveDataStatus({ data: undefined, isError: true, fetchStatus: 'idle' }))
      .toBe('unavailable');
  });

  it('is stale — not ready — when a refresh failed but cached data survives', () => {
    // Previously this resolved to 'ready', so an outage rendered as current and
    // no retry was offered.
    expect(resolveDataStatus({ data: [{ id: 1 }], isError: true, fetchStatus: 'idle' }))
      .toBe('stale');
  });

  it('is ready when data is loaded and healthy', () => {
    expect(resolveDataStatus({ data: [{ id: 1 }], isError: false, fetchStatus: 'idle' }))
      .toBe('ready');
  });

  it('treats an empty array as real loaded data, not as absence', () => {
    expect(resolveDataStatus({ data: [], isError: false, fetchStatus: 'idle' })).toBe('ready');
  });

  it('fails closed on a missing query object', () => {
    expect(resolveDataStatus(undefined)).toBe('unavailable');
    expect(resolveDataStatus(null)).toBe('unavailable');
  });

  it('knows which states may be presented as the member record', () => {
    expect(isDataKnown('ready')).toBe(true);
    expect(isDataKnown('stale')).toBe(true);
    expect(isDataKnown('loading')).toBe(false);
    expect(isDataKnown('unavailable')).toBe(false);
  });
});
