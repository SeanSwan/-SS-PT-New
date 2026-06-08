import { describe, expect, it } from 'vitest';
import { resolveLoggerClientId } from './EnhancedWorkoutLogger.identity';

describe('resolveLoggerClientId', () => {
  it('prefers a valid URL client id over persisted active-client context', () => {
    expect(resolveLoggerClientId({
      activeClientId: 62,
      urlClientId: '61',
    })).toBe(61);
  });

  it('uses persisted active-client context only when URL clientId is absent', () => {
    expect(resolveLoggerClientId({
      activeClientId: 62,
      urlClientId: null,
    })).toBe(62);
  });

  it('does not rescue malformed URL client ids with active-client context', () => {
    expect(resolveLoggerClientId({
      activeClientId: 62,
      urlClientId: '61junk',
    })).toBeNull();
  });
});
