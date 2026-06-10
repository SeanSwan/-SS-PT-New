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

  it('resets registered dashboard scroll roots when opening Feed from a deep scroll position', () => {
    const dashboardRoot = document.createElement('section');
    const observatoryMain = document.createElement('main');
    const dashboardRootScrollTo = vi.fn(() => {
      dashboardRoot.scrollTop = 0;
    });
    const observatoryMainScrollTo = vi.fn(() => {
      observatoryMain.scrollTop = 0;
    });

    dashboardRoot.setAttribute('data-user-dashboard-scroll-root', '');
    observatoryMain.setAttribute('data-user-dashboard-scroll-root', '');

    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(dashboardRoot, 'scrollTo', {
      configurable: true,
      value: dashboardRootScrollTo,
    });
    Object.defineProperty(observatoryMain, 'scrollTo', {
      configurable: true,
      value: observatoryMainScrollTo,
    });

    dashboardRoot.scrollTop = 1240;
    observatoryMain.scrollTop = 680;
    document.body.append(dashboardRoot, observatoryMain);

    resetUserDashboardTabScroll();

    expect(dashboardRootScrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });
    expect(observatoryMainScrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' });
    expect(dashboardRoot.scrollTop).toBe(0);
    expect(observatoryMain.scrollTop).toBe(0);

    dashboardRoot.remove();
    observatoryMain.remove();
  });
});
