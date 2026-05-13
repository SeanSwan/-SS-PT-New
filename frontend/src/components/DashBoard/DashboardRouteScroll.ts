const scrollToTop = { top: 0, left: 0, behavior: 'auto' as ScrollBehavior };

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

  window.scrollTo(scrollToTop);
  resetElementScroll(document.scrollingElement);
  resetElementScroll(document.documentElement);
  resetElementScroll(document.body);
  resetElementScroll(document.getElementById('root'));
  resetElementScroll(target);
}

export function scheduleDashboardRouteScrollReset(target?: Element | null) {
  if (typeof window === 'undefined') return undefined;

  resetDashboardRouteScroll(target);

  const frame = window.requestAnimationFrame(() => resetDashboardRouteScroll(target));
  const timeout = window.setTimeout(() => resetDashboardRouteScroll(target), 80);

  return () => {
    window.cancelAnimationFrame(frame);
    window.clearTimeout(timeout);
  };
}
