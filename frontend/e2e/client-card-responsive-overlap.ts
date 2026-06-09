/**
 * Nested client-card overlap probes for responsive smoke tests.
 *
 * Purpose: catches section-level visual collisions inside admin/trainer client
 * cards, including text that overflows into quick-action button rows.
 * Privacy: DOM-only inspection; no production data is captured.
 */
import type { Page } from '@playwright/test';

export async function inspectNestedClientCardLayout(page: Page) {
  return page.evaluate(() => {
    const issues: string[] = [];
    const visible = (element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    };
    const labelFor = (element: HTMLElement) =>
      element.getAttribute('data-swan-card-section')
      || element.getAttribute('aria-label')
      || element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 80)
      || element.tagName.toLowerCase();
    const overlapArea = (a: DOMRect, b: DOMRect) => (
      Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
      * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
    );

    document.querySelectorAll<HTMLElement>('[data-swan-client-card]').forEach((card) => {
      const sections = Array.from(card.querySelectorAll<HTMLElement>('[data-swan-card-section]')).filter(visible);
      for (let i = 0; i < sections.length; i += 1) {
        for (let j = i + 1; j < sections.length; j += 1) {
          if (sections[i].contains(sections[j]) || sections[j].contains(sections[i])) continue;
          if (overlapArea(sections[i].getBoundingClientRect(), sections[j].getBoundingClientRect()) > 8) {
            issues.push(`${labelFor(sections[i])} overlaps ${labelFor(sections[j])} in ${labelFor(card)}`);
          }
        }
      }
    });

    return { issues };
  });
}

export async function inspectClientWorkspaceTopBar(page: Page) {
  return page.evaluate(() => {
    const issues: string[] = [];
    if (window.innerWidth > 520) return { issues };

    const topbar = document.querySelector<HTMLElement>('[data-swan-client-workspace-topbar]');
    const actions = document.querySelector<HTMLElement>('[data-swan-client-workspace-actions]');
    const selector = topbar?.querySelector<HTMLElement>('[aria-haspopup="listbox"]');
    if (!topbar || !actions || !selector) return { issues: ['missing client workspace top bar'] };

    const topbarRect = topbar.getBoundingClientRect();
    const selectorRect = selector.getBoundingClientRect();
    if (topbarRect.height > 112) issues.push(`client workspace top bar is ${Math.round(topbarRect.height)}px tall`);
    if (selectorRect.height > 50) issues.push(`client selector compact height is ${Math.round(selectorRect.height)}px`);
    if (topbar.scrollWidth > topbar.clientWidth + 12) issues.push('client workspace top bar has horizontal overflow');

    Array.from(actions.querySelectorAll<HTMLElement>('button')).forEach((button) => {
      const rect = button.getBoundingClientRect();
      if (rect.width < 43 || rect.height < 43) {
        const label = button.getAttribute('aria-label') || button.textContent?.trim() || 'top action';
        issues.push(`${label} top action touch target is ${Math.round(rect.width)}x${Math.round(rect.height)}`);
      }
    });

    return { issues };
  });
}

export async function inspectClientDetailTabLabelFit(page: Page) {
  return page.evaluate(() => {
    const issues: string[] = [];
    if (window.innerWidth > 768) return { issues };

    const tabs = Array.from(document.querySelectorAll<HTMLElement>('[role="tablist"][aria-label="Client detail tabs"] [role="tab"]'));
    if (!tabs.length) return { issues: ['missing client detail tabs'] };

    tabs.forEach((tab) => {
      const label = tab.textContent?.trim().replace(/\s+/g, ' ') || tab.id;
      const labelEl = tab.querySelector<HTMLElement>('span');
      if (!labelEl) return;
      if (labelEl.scrollWidth > labelEl.clientWidth + 1) {
        issues.push(`${label} tab label clips ${labelEl.scrollWidth}px into ${labelEl.clientWidth}px`);
      }
    });

    return { issues };
  });
}

export async function inspectSelectedClientActionStripFootprint(page: Page) {
  return page.evaluate(() => {
    const issues: string[] = [];
    if (window.innerWidth > 520) return { issues };

    const strip = document.querySelector<HTMLElement>('section[aria-label*="daily training actions"]');
    if (!strip) return { issues: ['missing selected client daily action strip'] };

    const rect = strip.getBoundingClientRect();
    if (rect.height > 220) issues.push(`daily action strip is ${Math.round(rect.height)}px tall`);
    if (strip.scrollWidth > strip.clientWidth + 12) issues.push('daily action strip has horizontal overflow');

    Array.from(strip.querySelectorAll<HTMLElement>('button')).forEach((button) => {
      const buttonRect = button.getBoundingClientRect();
      if (buttonRect.width < 43 || buttonRect.height < 43) {
        const label = button.getAttribute('aria-label') || button.textContent?.trim() || 'daily action';
        issues.push(`${label} touch target is ${Math.round(buttonRect.width)}x${Math.round(buttonRect.height)}`);
      }
    });

    return { issues };
  });
}
