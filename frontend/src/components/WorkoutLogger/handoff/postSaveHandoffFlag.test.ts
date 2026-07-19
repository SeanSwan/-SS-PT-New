import { afterEach, describe, expect, it, vi } from 'vitest';
import { isPostSaveHandoffEnabled } from './postSaveHandoffFlag';

afterEach(() => vi.unstubAllEnvs());

describe('isPostSaveHandoffEnabled — ships dark', () => {
  it('is false by default (env unset)', () => {
    expect(isPostSaveHandoffEnabled()).toBe(false);
  });

  it('is true only for "true" (case-insensitive)', () => {
    vi.stubEnv('VITE_ENABLE_POST_SAVE_HANDOFF', 'true');
    expect(isPostSaveHandoffEnabled()).toBe(true);
    vi.stubEnv('VITE_ENABLE_POST_SAVE_HANDOFF', 'TRUE');
    expect(isPostSaveHandoffEnabled()).toBe(true);
  });

  it('is false for any non-"true" value (default-off safety)', () => {
    for (const v of ['false', '1', 'yes', '', 'on']) {
      vi.stubEnv('VITE_ENABLE_POST_SAVE_HANDOFF', v);
      expect(isPostSaveHandoffEnabled()).toBe(false);
    }
  });
});
