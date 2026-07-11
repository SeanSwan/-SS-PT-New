import { useEffect, useState, type RefObject } from 'react';
import type { DrawerSide } from './CoachCommandCenter.types';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
const MAIN_REGION_SELECTOR = '.client-bar, .tab-bar, .tab-content, .console-dock';
const DRAWER_MEDIA_QUERY = '(max-width: 1279px)';

type InertElement = HTMLElement & { inert?: boolean };

type DrawerEffectProps = {
  commandFormRef: RefObject<HTMLFormElement>;
  commandText: string;
  drawer: DrawerSide | null;
  leftRailRef: RefObject<HTMLElement>;
  onCloseDrawer: (restoreFocus?: boolean) => void;
  rightRailRef: RefObject<HTMLElement>;
  shellRef: RefObject<HTMLDivElement>;
};

function isDrawerViewport(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(DRAWER_MEDIA_QUERY).matches;
}

function setHidden(node: InertElement, hidden: boolean) {
  node.inert = hidden;
  if (hidden) node.setAttribute('aria-hidden', 'true');
  else node.removeAttribute('aria-hidden');
}

function getMainRegions(shell: HTMLElement): InertElement[] {
  return Array.from(shell.querySelectorAll<InertElement>(MAIN_REGION_SELECTOR));
}

export function useCoachCommandCenterDrawerEffects({
  commandFormRef,
  commandText,
  drawer,
  leftRailRef,
  onCloseDrawer,
  rightRailRef,
  shellRef,
}: DrawerEffectProps) {
  const [drawerViewport, setDrawerViewport] = useState(isDrawerViewport);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const mediaQuery = window.matchMedia(DRAWER_MEDIA_QUERY);
    const syncViewport = () => setDrawerViewport(mediaQuery.matches);

    syncViewport();
    mediaQuery.addEventListener('change', syncViewport);
    return () => mediaQuery.removeEventListener('change', syncViewport);
  }, []);


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

    const mainRegions = getMainRegions(shell);
    const leftRail = leftRailRef.current as InertElement | null;
    const rightRail = rightRailRef.current as InertElement | null;
    const isBlockingDrawer = Boolean(drawer && (drawerViewport || drawer === 'left'));

    [leftRail, rightRail].forEach((rail) => {
      if (!rail) return;
      const railSide = rail.dataset.drawer as DrawerSide | undefined;
      const isActiveDrawer = drawer === railSide;
      const isInlineLeftRail = railSide === 'left' && !isActiveDrawer;
      const isInlineRightRail = railSide === 'right' && !drawerViewport;
      const isInlineRail = isInlineLeftRail || isInlineRightRail;
      const isClosedDrawer = !isInlineRail && !isActiveDrawer;

      if (isInlineRail) {
        rail.setAttribute('role', 'complementary');
        rail.removeAttribute('aria-modal');
        if (isInlineRightRail) rail.setAttribute('aria-hidden', 'false');
        else rail.removeAttribute('aria-hidden');
        rail.inert = false;
        return;
      }

      rail.setAttribute('role', 'dialog');
      rail.setAttribute('aria-modal', isActiveDrawer ? 'true' : 'false');
      rail.setAttribute('aria-hidden', isClosedDrawer ? 'true' : 'false');
      rail.inert = isClosedDrawer || (drawer ? !isActiveDrawer : false);
    });

    mainRegions.forEach((region) => setHidden(region, isBlockingDrawer));

    if (!drawer) return undefined;

    const rail = drawer === 'left' ? leftRailRef.current : rightRailRef.current;
    const isModalDrawer = drawerViewport || drawer === 'left';
    const focusTimer = isModalDrawer
      ? window.setTimeout(() => rail?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus(), 0)
      : null;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseDrawer();
        return;
      }

      if (!isModalDrawer || event.key !== 'Tab' || !rail) return;
      const focusable = Array.from(rail.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true',
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
    return () => {
      if (focusTimer !== null) window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [drawer, drawerViewport, leftRailRef, onCloseDrawer, rightRailRef, shellRef]);

  useEffect(() => () => {
    const shell = shellRef.current;
    [leftRailRef.current, rightRailRef.current, ...(shell ? getMainRegions(shell) : [])].forEach((node) => {
      if (!node) return;
      setHidden(node as InertElement, false);
    });
  }, [leftRailRef, rightRailRef, shellRef]);
}
