/**
 * FILE: CoachConsoleDock.menuKeys.ts
 * PURPOSE: Keyboard navigation for the dock More menu (roving focus + Escape).
 * Split from CoachConsoleDock to honor the 300-line file cap.
 */
import type { KeyboardEvent } from 'react';

function focusMenuItem(target: EventTarget | null, direction: 1 | -1 | 'first' | 'last') {
  const menu = target instanceof HTMLElement ? target.closest('[role="menu"]') : null;
  if (!menu) return;
  const items = Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"], [role="menuitemcheckbox"]'))
    .filter((item) => !(item instanceof HTMLButtonElement && item.disabled));
  if (!items.length) return;
  const activeIndex = items.findIndex((item) => item === document.activeElement);
  let nextIndex = 0;
  if (direction === 'first') nextIndex = 0;
  else if (direction === 'last') nextIndex = items.length - 1;
  else if (activeIndex < 0) nextIndex = direction === -1 ? items.length - 1 : 0;
  else nextIndex = (activeIndex + direction + items.length) % items.length;
  items[nextIndex]?.focus();
}

export function createMoreMenuKeyDownHandler(closeMenu: () => void) {
  return (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeMenu();
      return;
    }
    const keyActions: Record<string, 1 | -1 | 'first' | 'last'> = {
      ArrowDown: 1,
      ArrowRight: 1,
      ArrowUp: -1,
      ArrowLeft: -1,
      Home: 'first',
      End: 'last',
    };
    const action = keyActions[event.key];
    if (!action) return;
    event.preventDefault();
    event.stopPropagation();
    focusMenuItem(event.target, action);
  };
}
