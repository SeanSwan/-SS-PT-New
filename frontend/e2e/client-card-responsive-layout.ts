/**
 * Responsive client-card layout probes for Playwright smoke tests.
 *
 * Purpose: checks card/detail overflow, touch targets, fixed mobile overlays,
 * and unexpected browser errors without capturing production data.
 */
import type { Page } from '@playwright/test';

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
          issues.push(`${labelFor(control)} fixed control overlaps ${labelFor(card)} card`);
        }
      });
    });

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

export const isKnownConsoleNoise = (message: string) => (
  /preloaded using link preload/i.test(message)
  || /^Failed to load resource: the server responded with a status of 400 \(Bad Request\)$/.test(message)
);
