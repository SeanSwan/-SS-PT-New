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

export async function inspectClientTrainingShellLayout(page: Page) {
  return page.evaluate(() => {
    const issues: string[] = [];
    const visible = (element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    };
    const labelFor = (element: HTMLElement) => (
      element.getAttribute('aria-label')
      || element.getAttribute('title')
      || element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 96)
      || element.tagName.toLowerCase()
    );
    const overlapArea = (a: DOMRect, b: DOMRect) => (
      Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
      * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
    );
    const checkChildren = (group: HTMLElement) => {
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

    const subSections = document.querySelector<HTMLElement>('[role="tablist"][aria-label="Training sub-sections"]');
    const commandBar = Array.from(document.querySelectorAll<HTMLElement>('section[aria-label$="Swan daily training command"]'))
      .find(visible);
    if (!subSections) issues.push('missing Training sub-sections tablist');
    if (!commandBar) issues.push('missing Swan daily training command bar');

    if (subSections) {
      const style = window.getComputedStyle(subSections);
      if (window.innerWidth <= 767 && subSections.scrollWidth > subSections.clientWidth + 2 && style.overflowX !== 'auto') {
        issues.push('training sub-section rail clips without horizontal scroll');
      }
      Array.from(subSections.querySelectorAll<HTMLElement>('[role="tab"]')).forEach((tab) => {
        if (!visible(tab)) return;
        const rect = tab.getBoundingClientRect();
        if (rect.width < 43 || rect.height < 43) {
          issues.push(`${labelFor(tab)} training tab touch target is ${Math.round(rect.width)}x${Math.round(rect.height)}`);
        }
      });
    }

    if (commandBar) {
      checkChildren(commandBar);
      Array.from(commandBar.querySelectorAll<HTMLElement>('form, div')).forEach((group) => {
        if (visible(group)) checkChildren(group);
      });
      Array.from(commandBar.querySelectorAll<HTMLElement>('button, input')).forEach((control) => {
        if (!visible(control)) return;
        const rect = control.getBoundingClientRect();
        if (rect.width < 43 || rect.height < 43) {
          issues.push(`${labelFor(control)} command control touch target is ${Math.round(rect.width)}x${Math.round(rect.height)}`);
        }
        if (rect.right > commandBar.getBoundingClientRect().right + 1) {
          issues.push(`${labelFor(control)} command control escapes command bar`);
        }
      });
    }

    return { overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth), issues };
  });
}

export async function inspectClientCurrentWorkoutCardLayout(page: Page) {
  return page.evaluate(() => {
    const issues: string[] = [];
    const card = Array.from(document.querySelectorAll<HTMLElement>('[data-testid="current-workout-card"]'))
      .find((element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      });
    const visible = (element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    };
    if (!card) {
      return { overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth), issues: ['missing current workout card'] };
    }

    const labelFor = (element: HTMLElement) => (
      element.getAttribute('aria-label')
      || element.getAttribute('data-testid')
      || element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 96)
      || element.tagName.toLowerCase()
    );
    const cardRect = card.getBoundingClientRect();

    Array.from(card.querySelectorAll<HTMLElement>('button, [role="button"]')).forEach((control) => {
      if (!visible(control)) return;
      const rect = control.getBoundingClientRect();
      if (rect.width < 43 || rect.height < 43) {
        issues.push(`${labelFor(control)} touch target is ${Math.round(rect.width)}x${Math.round(rect.height)}`);
      }
      if (rect.left < cardRect.left - 1 || rect.right > cardRect.right + 1) {
        issues.push(`${labelFor(control)} escapes current workout card`);
      }
      if (control.scrollWidth > control.clientWidth + 2) {
        issues.push(`${labelFor(control)} text overflows ${control.clientWidth}px`);
      }
    });

    Array.from(card.querySelectorAll<HTMLElement>('h1,h2,h3,h4,p,span,strong,button')).forEach((textNode) => {
      if (!visible(textNode)) return;
      const rect = textNode.getBoundingClientRect();
      if (rect.left < cardRect.left - 1 || rect.right > cardRect.right + 1) {
        issues.push(`${labelFor(textNode)} text escapes current workout card`);
      }
      if (textNode.scrollWidth > textNode.clientWidth + 2) {
        issues.push(`${labelFor(textNode)} text overflows ${textNode.clientWidth}px`);
      }
    });

    return { overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth), issues };
  });
}

export async function inspectClientPlanVaultCardLayout(page: Page) {
  return page.evaluate(() => {
    const issues: string[] = [];
    const card = document.querySelector<HTMLElement>('[data-testid="client-plan-vault-card"]');
    const visible = (element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    };
    if (!card || !visible(card)) {
      return { overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth), issues: ['missing client plan vault card'] };
    }

    const labelFor = (element: HTMLElement) => (
      element.getAttribute('aria-label')
      || element.getAttribute('data-testid')
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

    checkGroup(card);
    Array.from(card.querySelectorAll<HTMLElement>('[aria-label$="plan arc"], div')).forEach((group) => {
      if (visible(group)) checkGroup(group);
    });
    Array.from(card.querySelectorAll<HTMLElement>('button, [role="button"]')).forEach((control) => {
      if (!visible(control)) return;
      const rect = control.getBoundingClientRect();
      if (rect.width < 43 || rect.height < 43) {
        issues.push(`${labelFor(control)} touch target is ${Math.round(rect.width)}x${Math.round(rect.height)}`);
      }
    });
    Array.from(card.querySelectorAll<HTMLElement>('h1,h2,h3,h4,p,span,strong,button')).forEach((textNode) => {
      if (!visible(textNode)) return;
      if (textNode.scrollWidth > textNode.clientWidth + 2) {
        issues.push(`${labelFor(textNode)} text overflows ${textNode.clientWidth}px`);
      }
    });

    return { overflowX: Math.max(0, document.documentElement.scrollWidth - window.innerWidth), issues };
  });
}
