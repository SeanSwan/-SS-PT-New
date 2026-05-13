import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetDashboardRouteScroll, scheduleDashboardRouteScrollReset } from './DashboardRouteScroll';

describe('dashboard route scroll reset', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('resets every dashboard scroll owner to the top', () => {
    const windowScrollTo = vi.fn();
    const bodyScrollTo = vi.fn(() => {
      document.body.scrollTop = 0;
    });
    const documentScrollTo = vi.fn(() => {
      document.documentElement.scrollTop = 0;
    });
    const target = document.createElement('main');
    const targetScrollTo = vi.fn(() => {
      target.scrollTop = 0;
    });
    const focusedInput = document.createElement('input');

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
    Object.defineProperty(target, 'scrollTo', {
      configurable: true,
      value: targetScrollTo,
    });

    document.body.scrollTop = 1073;
    document.documentElement.scrollTop = 320;
    target.scrollTop = 812;
    document.body.appendChild(focusedInput);
    focusedInput.focus();

    resetDashboardRouteScroll(target);

    expect(windowScrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });
    expect(bodyScrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });
    expect(documentScrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });
    expect(targetScrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });
    expect(document.body.scrollTop).toBe(0);
    expect(document.documentElement.scrollTop).toBe(0);
    expect(target.scrollTop).toBe(0);
    expect(document.activeElement).not.toBe(focusedInput);

    document.body.removeChild(focusedInput);
  });

  it('retries after animation frame and delayed browser scroll restoration', () => {
    vi.useFakeTimers();

    const target = document.createElement('main');
    const resetTarget = vi.fn();
    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: vi.fn(),
    });
    const animationFrame = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        callback(0);
        return 1;
      });
    const cancelFrame = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);

    Object.defineProperty(target, 'scrollTo', {
      configurable: true,
      value: resetTarget,
    });

    const cleanup = scheduleDashboardRouteScrollReset(target);
    vi.advanceTimersByTime(80);
    cleanup?.();

    expect(animationFrame).toHaveBeenCalled();
    expect(resetTarget).toHaveBeenCalledTimes(3);
    expect(cancelFrame).toHaveBeenCalledWith(1);
  });
});
