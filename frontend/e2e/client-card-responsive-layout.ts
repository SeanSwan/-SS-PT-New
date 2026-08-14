/**
 * Responsive client-card layout probes for Playwright smoke tests.
 *
 * Purpose: checks card/detail overflow, touch targets, fixed mobile overlays,
 * and unexpected browser errors without capturing production data.
 */
import type { Page } from '@playwright/test';
import { isSuppressedProductNoise, todayIso } from './mission/productNoise';

export async function inspectCardLayout(page: Page) {
  return page.evaluate(() => {
    const issues: string[] = [];
    const visible = (element: Element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    };
    const labelFor = (element: Element) =>
      element.getAttribute('aria-label')
      || element.getAttribute('data-swan-card-section')
      || element.getAttribute('data-swan-client-card')
      || element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 80)
      || element.tagName.toLowerCase();
    const overlapArea = (a: DOMRect, b: DOMRect) => (
      Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
      * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
    );
    const checkGroup = (group: Element) => {
      const groupRect = group.getBoundingClientRect();
      const children = Array.from(group.children).filter(visible);
      children.forEach((child) => {
        const rect = child.getBoundingClientRect();
        if (rect.left < groupRect.left - 1 || rect.right > groupRect.right + 1) {
          issues.push(`${labelFor(child)} escapes ${labelFor(group)} horizontally`);
        }
      });
      for (let i = 0; i < children.length; i += 1) {
        for (let j = i + 1; j < children.length; j += 1) {
          if (overlapArea(children[i].getBoundingClientRect(), children[j].getBoundingClientRect()) > 1) {
            issues.push(`${labelFor(children[i])} overlaps ${labelFor(children[j])} in ${labelFor(group)}`);
          }
        }
      }
    };

    document.querySelectorAll('[data-swan-client-card], [data-swan-card-section]').forEach((element) => {
      if (visible(element)) checkGroup(element);
    });
    document.querySelectorAll('[data-swan-client-card] button, [data-swan-client-card] [role="button"]').forEach((button) => {
      if (!visible(button)) return;
      const rect = button.getBoundingClientRect();
      if (rect.width < 43 || rect.height < 43) {
        issues.push(`${labelFor(button)} touch target is ${Math.round(rect.width)}x${Math.round(rect.height)}`);
      }
    });

    return { overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth), issues };
  });
}

export async function inspectClientDetailLayout(page: Page) {
  return page.evaluate(() => {
    const issues: string[] = [];
    const visible = (element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    };
    const labelFor = (element: HTMLElement) =>
      element.getAttribute('aria-label')
      || element.getAttribute('title')
      || element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 80)
      || element.tagName.toLowerCase();
    const tabBar = document.querySelector<HTMLElement>('[role="tablist"][aria-label="Client detail tabs"]');
    const isScrollable = (value: string) => value === 'auto' || value === 'scroll';

    if (!tabBar) {
      issues.push('missing client detail tablist');
    } else {
      const barRect = tabBar.getBoundingClientRect();
      const canScrollX = isScrollable(window.getComputedStyle(tabBar).overflowX);
      if (tabBar.scrollWidth > tabBar.clientWidth + 2 && !canScrollX) {
        issues.push(`client detail tabs clip ${tabBar.scrollWidth}px into ${tabBar.clientWidth}px`);
      }
      if (window.innerWidth <= 768 && tabBar.scrollWidth > tabBar.clientWidth + 2) {
        issues.push(`mobile client detail tabs require horizontal scroll ${tabBar.scrollWidth}px into ${tabBar.clientWidth}px`);
      }
      Array.from(tabBar.querySelectorAll<HTMLElement>('[role="tab"]')).forEach((tab) => {
        const rect = tab.getBoundingClientRect();
        const label = tab.textContent?.trim().replace(/\s+/g, ' ') || tab.id;
        const labelElement = tab.querySelector<HTMLElement>('span');
        if (rect.height < 43) issues.push(`${label} tab touch target is ${Math.round(rect.width)}x${Math.round(rect.height)}`);
        if (!canScrollX && (rect.left < barRect.left - 1 || rect.right > barRect.right + 1)) {
          issues.push(`${label} tab escapes the visible tab bar`);
        }
        if (window.innerWidth <= 768 && labelElement) {
          const labelStyle = window.getComputedStyle(labelElement);
          const lineHeight = Number.parseFloat(labelStyle.lineHeight || '0');
          if (lineHeight > 0 && labelElement.getBoundingClientRect().height > lineHeight * 1.35) {
            issues.push(`${label} tab label wraps on mobile`);
          }
        }
      });
    }

    Array.from(document.querySelectorAll<HTMLElement>('body *')).forEach((control) => {
      if (window.innerWidth > 768 || !visible(control)) return;
      const rect = control.getBoundingClientRect();
      const style = window.getComputedStyle(control);
      const bottomInset = window.innerHeight - rect.bottom;
      const rightInset = window.innerWidth - rect.right;
      const compactOverlay = rect.width <= 140 && rect.height <= 140;
      if (style.position === 'fixed' && compactOverlay && bottomInset <= 140 && rightInset <= 120) {
        issues.push(`mobile fixed control overlaps client detail surface: ${labelFor(control)}`);
      }
    });

    return { overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth), issues };
  });
}

export async function inspectFixedControlsAgainstClientCards(page: Page) {
  return page.evaluate(() => {
    const issues: string[] = [];
    if (window.innerWidth > 768) return { issues };

    const visible = (element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    };
    const labelFor = (element: HTMLElement) =>
      element.getAttribute('aria-label')
      || element.getAttribute('data-swan-client-card')
      || element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 80)
      || element.tagName.toLowerCase();
    const overlapArea = (a: DOMRect, b: DOMRect) => (
      Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
      * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
    );
    const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-swan-client-card]')).filter(visible);
    const fixedControls = Array.from(document.querySelectorAll<HTMLElement>('body *')).filter((element) => {
      if (!visible(element)) return false;
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return style.position === 'fixed' && rect.width <= 150 && rect.height <= 150;
    });

    fixedControls.forEach((control) => {
      const controlRect = control.getBoundingClientRect();
      cards.forEach((card) => {
        const cardRect = card.getBoundingClientRect();
        if (overlapArea(controlRect, cardRect) > 12) {
          const frameData = [
            `target ${card.dataset.swanFrameTargetTop || 'n/a'}`,
            `safe ${card.dataset.swanFrameSafeTop || 'n/a'}`,
            `parent ${card.dataset.swanFrameParentTop || 'n/a'}`,
            `scroller ${card.dataset.swanFrameScroller || 'n/a'}`,
            `final ${card.dataset.swanFrameFinalTop || 'n/a'}`
          ].join(', ');
          issues.push(
            `${labelFor(control)} fixed control overlaps ${labelFor(card)} card `
            + `(control ${Math.round(controlRect.top)}-${Math.round(controlRect.bottom)}, `
            + `card ${Math.round(cardRect.top)}-${Math.round(cardRect.bottom)}, ${frameData})`
          );
        }
      });
    });

    return { issues };
  });
}

export async function inspectMobileDashboardSafeArea(page: Page) {
  return page.evaluate(() => {
    const issues: string[] = [];
    if (window.innerWidth > 1024) return { issues };

    const guard = document.querySelector<HTMLElement>('[data-swan-mobile-dashboard-safe-area]');
    if (!guard) return { issues: ['missing mobile dashboard safe-area guard'] };

    const guardRect = guard.getBoundingClientRect();
    const guardStyle = window.getComputedStyle(guard);
    const main = document.querySelector<HTMLElement>('main');
    const visibleFixedControls = Array.from(document.querySelectorAll<HTMLElement>('body *')).filter((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return style.position === 'fixed'
        && rect.width > 0
        && rect.height > 0
        && rect.width <= 150
        && rect.height <= 150
        && rect.top < window.innerHeight / 2
        && style.visibility !== 'hidden'
        && style.display !== 'none';
    });

    if (guardStyle.position !== 'fixed') issues.push('mobile dashboard safe-area guard is not fixed');
    if (guardStyle.pointerEvents !== 'none') issues.push('mobile dashboard safe-area guard blocks taps');

    if (window.innerWidth <= 520) {
      const mainPaddingTop = main ? Number.parseFloat(window.getComputedStyle(main).paddingTop || '0') : 0;
      const maxControlBottom = Math.max(0, ...visibleFixedControls.map((control) => control.getBoundingClientRect().bottom));

      if (guardRect.height > 64) {
        issues.push(`mobile dashboard safe-area guard is too tall at ${Math.round(guardRect.height)}px`);
      }
      if (maxControlBottom > 108) {
        issues.push(`mobile dashboard fixed controls consume ${Math.round(maxControlBottom)}px`);
      }
      if (mainPaddingTop > 148) {
        issues.push(`mobile dashboard content starts too low at ${Math.round(mainPaddingTop)}px`);
      }
    }

    visibleFixedControls.forEach((control) => {
      const rect = control.getBoundingClientRect();
      const label = control.getAttribute('aria-label') || control.textContent?.trim() || control.tagName.toLowerCase();
      const coversControlBand = guardRect.top <= rect.top + 1 && guardRect.bottom >= rect.bottom + 8;
      if (!coversControlBand) {
        issues.push(`mobile dashboard safe-area guard does not cover ${label}`);
      }
    });

    return { issues };
  });
}

export async function inspectClientSelectorDropdownSurface(page: Page) {
  return page.evaluate(() => {
    const issues: string[] = [];
    const dropdown = document.querySelector<HTMLElement>('[role="listbox"][aria-label="Client list"]');
    if (!dropdown) return { issues: ['missing client selector listbox'] };

    const rect = dropdown.getBoundingClientRect();
    const style = window.getComputedStyle(dropdown);
    const visible = rect.width > 0
      && rect.height > 0
      && style.display !== 'none'
      && style.visibility !== 'hidden';

    if (!visible) return { issues };

    const alphaMatch = style.backgroundColor.match(/rgba?\(([^)]+)\)/);
    const alpha = alphaMatch
      ? Number.parseFloat(alphaMatch[1].split(',').at(3) ?? '1')
      : 1;

    if (alpha < 0.95) {
      issues.push(`client selector dropdown background alpha is ${alpha}`);
    }

    if (Number.parseInt(style.zIndex || '0', 10) < 100) {
      issues.push(`client selector dropdown z-index is ${style.zIndex || 'auto'}`);
    }

    return { issues };
  });
}

export async function inspectActivationQueueMobileFootprint(page: Page) {
  return page.evaluate(() => {
    const issues: string[] = [];
    if (window.innerWidth > 520) return { issues };

    const panel = document.querySelector<HTMLElement>('[data-swan-activation-queue-panel]');
    if (!panel) return { issues: ['missing paid activation queue panel'] };

    const panelRect = panel.getBoundingClientRect();
    const total = Number.parseInt(panel.getAttribute('data-swan-activation-queue-total') || '0', 10);
    const list = document.querySelector<HTMLElement>('[data-swan-activation-queue-list]');
    const toggle = document.querySelector<HTMLElement>('[data-swan-activation-queue-mobile-toggle]');

    if (panelRect.height > 220) {
      issues.push(`paid activation queue mobile footprint is ${Math.round(panelRect.height)}px`);
    }

    if (total > 0 && !toggle) {
      issues.push('paid activation queue is missing its mobile expand control');
    }

    if (toggle) {
      const toggleRect = toggle.getBoundingClientRect();
      if (toggleRect.width < 43 || toggleRect.height < 43) {
        issues.push(`paid activation queue mobile toggle touch target is ${Math.round(toggleRect.width)}x${Math.round(toggleRect.height)}`);
      }
    }

    if (list && total > 0) {
      const listStyle = window.getComputedStyle(list);
      if (listStyle.display !== 'none') {
        issues.push('paid activation queue rows are expanded by default on compact phone');
      }
    }

    return { issues };
  });
}

export function collectUnexpectedConsoleErrors(page: Page) {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  return consoleErrors;
}

/**
 * PRODUCT noise routes through the expiring suppressions registry (SWA-157); the
 * remaining branches are HARNESS EXHAUST and must never expire. This used to
 * hardcode 'preloaded using link preload' permanently, which meant the registry
 * entry could expire and fail the crawl while this gate swallowed it forever.
 */
export const isKnownConsoleNoise = (message: string, today: string = todayIso()) => (
  isSuppressedProductNoise(message, today)
  || /^Failed to load resource: the server responded with a status of 400 \(Bad Request\)$/.test(message)
  || /\/socket\.io\/.*blocked by CORS/i.test(message)
);

export const filterKnownConsoleNoise = (messages: string[]) => {
  const hasSocketCorsNoise = messages.some((message) => /\/socket\.io\/.*blocked by CORS/i.test(message));
  return messages.filter((message) => {
    if (isKnownConsoleNoise(message)) return false;
    if (hasSocketCorsNoise && /^Failed to load resource: net::ERR_FAILED$/.test(message)) return false;
    return true;
  });
};
