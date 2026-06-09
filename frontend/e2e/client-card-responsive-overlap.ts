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
