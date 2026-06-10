/**
 * FILE: UserDashboardTabScroll.ts
 * PURPOSE: Keep in-page dashboard tab changes anchored at the dashboard top.
 *
 * The Creator Observatory Home surface is long and can leave BODY as the active
 * scroll container. When a Home action switches to Feed, Progress, Community,
 * or Profile, the new tab bar can mount above the visible viewport unless all
 * relevant scroll containers are reset.
 */

const scrollToTop = { top: 0, left: 0, behavior: 'auto' as ScrollBehavior };
const dashboardScrollRootSelector = '[data-user-dashboard-scroll-root], [data-dashboard-scroll-root]';

function resetElementScroll(target: Element | null | undefined) {
  if (!target) return;

  if (typeof target.scrollTo === 'function') {
    target.scrollTo(scrollToTop);
  }

  target.scrollTop = 0;
  target.scrollLeft = 0;
}

export function resetUserDashboardTabScroll() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const reset = () => {
    window.scrollTo(scrollToTop);
    resetElementScroll(document.scrollingElement);
    resetElementScroll(document.documentElement);
    resetElementScroll(document.body);
    document
      .querySelectorAll(dashboardScrollRootSelector)
      .forEach(resetElementScroll);
  };

  reset();

  if (typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(reset);
  }
}
