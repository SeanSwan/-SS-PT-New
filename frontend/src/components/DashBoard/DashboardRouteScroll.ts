const scrollToTop = { top: 0, left: 0, behavior: 'auto' as ScrollBehavior };
const dashboardScrollRootSelector = '[data-dashboard-scroll-root]';
const routeScrollResetDelays = [80, 240] as const;

function resetElementScroll(target: Element | null | undefined) {
  if (!target) return;

  if (typeof target.scrollTo === 'function') {
    target.scrollTo(scrollToTop);
  }

  target.scrollTop = 0;
  target.scrollLeft = 0;
}

export function resetDashboardRouteScroll(target?: Element | null) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  if ('scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual';
  }

  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }

  document.body.classList.remove('mobile-sidebar-open');
  window.scrollTo(scrollToTop);
  resetElementScroll(document.scrollingElement);
  resetElementScroll(document.documentElement);
  resetElementScroll(document.body);
  resetElementScroll(document.getElementById('root'));
  document
    .querySelectorAll(dashboardScrollRootSelector)
    .forEach(resetElementScroll);
  resetElementScroll(target);
}

export function scheduleDashboardRouteScrollReset(target?: Element | null) {
  if (typeof window === 'undefined') return undefined;

  resetDashboardRouteScroll(target);

  const frame = window.requestAnimationFrame(() => resetDashboardRouteScroll(target));
  const timeouts = routeScrollResetDelays.map((delay) => (
    window.setTimeout(() => resetDashboardRouteScroll(target), delay)
  ));

  return () => {
    window.cancelAnimationFrame(frame);
    timeouts.forEach((timeout) => window.clearTimeout(timeout));
  };
}
