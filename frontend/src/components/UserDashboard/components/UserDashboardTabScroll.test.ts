import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetUserDashboardTabScroll } from './UserDashboardTabScroll';

describe('resetUserDashboardTabScroll', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resets body and document scroll containers when dashboard tabs change', () => {
    const windowScrollTo = vi.fn();
    const bodyScrollTo = vi.fn(() => {
      document.body.scrollTop = 0;
    });
    const documentScrollTo = vi.fn(() => {
      document.documentElement.scrollTop = 0;
    });

    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: windowScrollTo,
    });
    Object.defineProperty(document.body, 'scrollTo', {
      configurable: true,
      value: bodyScrollTo,
    });
    Object.defineProperty(document.documentElement, 'scrollTo', {
      configurable: true,
      value: documentScrollTo,
    });
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 1;
    });

    document.body.scrollTop = 1073;
    document.documentElement.scrollTop = 320;

    resetUserDashboardTabScroll();

    expect(windowScrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });
    expect(bodyScrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });
    expect(documentScrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });
    expect(document.body.scrollTop).toBe(0);
    expect(document.documentElement.scrollTop).toBe(0);
  });
});
