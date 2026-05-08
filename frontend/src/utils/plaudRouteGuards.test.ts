import { describe, expect, it } from 'vitest';
import { isPlaudMergeRequestId, parsePlaudMergeRequestId } from './plaudRouteGuards';

describe('plaudRouteGuards', () => {
  it('accepts canonical UUID-shaped PLAUD merge request ids', () => {
    expect(isPlaudMergeRequestId('11111111-1111-4111-8111-111111111111')).toBe(true);
  });

  it('rejects malformed ids that match the old weak length-only pattern', () => {
    expect(isPlaudMergeRequestId('------------------------------------')).toBe(false);
    expect(isPlaudMergeRequestId('11111111111141118111111111111111----')).toBe(false);
  });

  it('parses ids fail-closed for missing or non-string input', () => {
    expect(parsePlaudMergeRequestId(null)).toBeNull();
    expect(parsePlaudMergeRequestId(undefined)).toBeNull();
    expect(parsePlaudMergeRequestId(123)).toBeNull();
  });

  it('returns the original id only when it passes the canonical guard', () => {
    const id = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
    expect(parsePlaudMergeRequestId(id)).toBe(id);
    expect(parsePlaudMergeRequestId('merge-123')).toBeNull();
  });
});
