/**
 * Client workout-plan responsive probes.
 *
 * Purpose: validates the Training Plans/program vault surface at phone and
 * desktop widths without relying on screenshots alone.
 */
import type { Page } from '@playwright/test';

export async function inspectClientWorkoutPlanLayout(page: Page) {
  return page.evaluate(() => {
    const issues: string[] = [];
    const panel = Array.from(document.querySelectorAll<HTMLElement>('section[aria-label$="saved workout plans"]'))
      .find((element) => element.getBoundingClientRect().width > 0);

    if (!panel) return { overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth), issues: ['missing saved workout plans panel'] };

    const visible = (element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    };
    const labelFor = (element: HTMLElement) => (
      element.getAttribute('aria-label')
      || element.getAttribute('id')
      || element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 96)
      || element.tagName.toLowerCase()
    );
    const overlapArea = (a: DOMRect, b: DOMRect) => (
      Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
      * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
    );
    const checkGroup = (group: HTMLElement) => {
      const groupRect = group.getBoundingClientRect();
      const children = Array.from(group.children).filter((child): child is HTMLElement => (
        child instanceof HTMLElement && visible(child)
      ));

      children.forEach((child) => {
        const rect = child.getBoundingClientRect();
        if (rect.left < groupRect.left - 1 || rect.right > groupRect.right + 1) {
          issues.push(`${labelFor(child)} escapes ${labelFor(group)} horizontally`);
        }
      });

      for (let i = 0; i < children.length; i += 1) {
        for (let j = i + 1; j < children.length; j += 1) {
          if (overlapArea(children[i].getBoundingClientRect(), children[j].getBoundingClientRect()) > 2) {
            issues.push(`${labelFor(children[i])} overlaps ${labelFor(children[j])} in ${labelFor(group)}`);
          }
        }
      }
    };

    Array.from(panel.querySelectorAll<HTMLElement>('*')).forEach((element) => {
      if (!visible(element)) return;
      const style = window.getComputedStyle(element);
      if ((style.display.includes('flex') || style.display.includes('grid')) && element.children.length > 1) {
        checkGroup(element);
      }
    });

    const panelRect = panel.getBoundingClientRect();
    Array.from(panel.querySelectorAll<HTMLElement>('button, select, [role="button"]')).forEach((control) => {
      if (!visible(control)) return;
      const rect = control.getBoundingClientRect();
      if (rect.width < 43 || rect.height < 43) {
        issues.push(`${labelFor(control)} touch target is ${Math.round(rect.width)}x${Math.round(rect.height)}`);
      }
      if (rect.left < panelRect.left - 1 || rect.right > panelRect.right + 1) {
        issues.push(`${labelFor(control)} escapes saved workout plans panel`);
      }
    });

    Array.from(panel.querySelectorAll<HTMLElement>('h1,h2,h3,h4,p,span,strong,label,button')).forEach((textNode) => {
      if (!visible(textNode)) return;
      const rect = textNode.getBoundingClientRect();
      if (rect.left < panelRect.left - 1 || rect.right > panelRect.right + 1) {
        issues.push(`${labelFor(textNode)} text escapes saved workout plans panel`);
      }
      if (textNode.scrollWidth > textNode.clientWidth + 2) {
        issues.push(`${labelFor(textNode)} text overflows ${textNode.clientWidth}px`);
      }
    });

    return { overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth), issues };
  });
}
