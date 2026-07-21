import { describe, expect, it } from 'vitest';
import { resolvePostSaveHandoffFlag } from './usePostSaveHandoffFlag';

describe('resolvePostSaveHandoffFlag — Launch Control precedence', () => {
  it('runtime true (admin switch ON) wins over an off build', () => {
    expect(resolvePostSaveHandoffFlag(true, null, false, false)).toBe(true);
  });

  it('runtime false is an ABSOLUTE kill switch — beats QA override and env', () => {
    expect(resolvePostSaveHandoffFlag(false, true, true, false)).toBe(false);
  });

  it('runtime absent → QA localStorage override decides', () => {
    expect(resolvePostSaveHandoffFlag(null, true, false, false)).toBe(true);
    expect(resolvePostSaveHandoffFlag(null, false, true, false)).toBe(false);
  });

  it('runtime and QA absent → build-time env fallback', () => {
    expect(resolvePostSaveHandoffFlag(null, null, true, false)).toBe(true);
    expect(resolvePostSaveHandoffFlag(null, null, false, false)).toBe(false);
  });

  it('preview-as lane wins over everything', () => {
    expect(resolvePostSaveHandoffFlag(false, false, false, true)).toBe(true);
  });
});
