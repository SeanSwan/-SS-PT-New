import { useEffect, type RefObject } from 'react';
import type { DrawerSide } from './CoachCommandCenter.types';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

type DrawerEffectProps = {
  commandFormRef: RefObject<HTMLFormElement>;
  commandText: string;
  drawer: DrawerSide | null;
  leftRailRef: RefObject<HTMLElement>;
  onCloseDrawer: (restoreFocus?: boolean) => void;
  rightRailRef: RefObject<HTMLElement>;
  shellRef: RefObject<HTMLDivElement>;
};

export function useCoachCommandCenterDrawerEffects({
  commandFormRef,
  commandText,
  drawer,
  leftRailRef,
  onCloseDrawer,
  rightRailRef,
  shellRef,
}: DrawerEffectProps) {
  useEffect(() => {
    const syncDockSpace = () => {
      const dockHeight = commandFormRef.current?.getBoundingClientRect().height ?? 0;
      shellRef.current?.style.setProperty('--mobile-dock-space', `${Math.ceil(dockHeight + 18)}px`);
    };

    syncDockSpace();
    window.addEventListener('resize', syncDockSpace);
    return () => window.removeEventListener('resize', syncDockSpace);
  }, [commandFormRef, commandText, drawer, shellRef]);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return undefined;

    const mainStage = shell.querySelector<HTMLElement>('.main-stage');
    const leftRail = leftRailRef.current as (HTMLElement & { inert?: boolean }) | null;
    const rightRail = rightRailRef.current as (HTMLElement & { inert?: boolean }) | null;
    const main = mainStage as (HTMLElement & { inert?: boolean }) | null;

    [leftRail, rightRail].forEach((rail) => {
      if (!rail) return;
      const isMobile = typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 860px)').matches;
      rail.setAttribute('role', 'dialog');
      rail.setAttribute('aria-modal', drawer ? 'true' : 'false');
      rail.inert = drawer ? rail.dataset.drawer !== drawer : isMobile;
    });

    if (main) {
      main.inert = Boolean(drawer);
      main.setAttribute('aria-hidden', drawer ? 'true' : 'false');
    }

    if (!drawer) return undefined;

    const rail = drawer === 'left' ? leftRailRef.current : rightRailRef.current;
    window.setTimeout(() => rail?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus(), 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseDrawer();
        return;
      }

      if (event.key !== 'Tab' || !rail) return;
      const focusable = Array.from(rail.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (element) => !element.hasAttribute('disabled') && element.offsetParent !== null,
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [drawer, leftRailRef, onCloseDrawer, rightRailRef, shellRef]);

  useEffect(() => () => {
    [
      leftRailRef.current,
      rightRailRef.current,
      shellRef.current?.querySelector<HTMLElement>('.main-stage'),
    ].forEach((node) => {
      if (!node) return;
      (node as HTMLElement & { inert?: boolean }).inert = false;
      node.removeAttribute('aria-hidden');
    });
  }, [leftRailRef, rightRailRef, shellRef]);
}
