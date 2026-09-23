/**
 * FILE: useWorkspacePanels.ts
 * PURPOSE: Open/closed state for the Coach Workspace's two side panels, in
 * agreement with the CSS docking rules (coachWorkspaceLayout.workspaceDocking).
 *
 * A docked panel is part of the grid; its toggle collapses it ('hidden'). A
 * panel that is not docked is a sheet; its toggle opens it ('open') over a
 * scrim. Escape closes the top sheet and returns focus to the button that opened
 * it. The shell's top offset is measured so the workspace fills the viewport
 * exactly below whatever dashboard chrome sits above it (`--ws-fit-top`).
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { workspaceDocking, type CoachWorkspaceLayout } from './coachWorkspaceLayout';

export type PanelState = 'default' | 'open' | 'hidden';

function useViewportWidth(): number {
  const [width, setWidth] = useState(() => (typeof window === 'undefined' ? 1440 : window.innerWidth));
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return width;
}

/** Fixed site chrome that can sit over the top of a dashboard page. */
const CHROME_SELECTORS = ['[data-swan-app-header]', '[data-swan-mobile-dashboard-safe-area]'];

/**
 * Fit the shell to the viewport below the site chrome. Measured on this route
 * (brain-v4 probe, 2026-09-22): the fixed app header ends at 64px while the
 * dashboard's desktop main padding is 24px, and on tablets/phones a fixed band
 * under the header ([data-swan-mobile-dashboard-safe-area], with the menu and back
 * buttons) is not cleared by the coach route's compact top padding — either one
 * would sit on top of the workspace header. The overlap is
 * measured (never guessed) and written as `--ws-chrome-overlap` (a margin) plus
 * `--ws-fit-top` (the height budget). The shell's own margin is subtracted before
 * measuring, so applying it cannot feed back into the next measurement.
 */
function useFitTop(shellRef: RefObject<HTMLElement>) {
  useLayoutEffect(() => {
    const shell = shellRef.current;
    if (!shell) return undefined;
    const apply = () => {
      const margin = parseFloat(getComputedStyle(shell).marginTop) || 0;
      const naturalTop = shell.getBoundingClientRect().top - margin;
      const chromeBottom = Math.max(0, ...CHROME_SELECTORS.map((selector) => {
        const el = document.querySelector<HTMLElement>(selector);
        if (!el) return 0;
        const cs = getComputedStyle(el);
        return cs.display !== 'none' && cs.position === 'fixed' ? el.getBoundingClientRect().bottom : 0;
      }));
      const overlap = Math.max(0, Math.round(chromeBottom - naturalTop));
      const top = Math.max(0, Math.round(naturalTop + window.scrollY) + overlap);
      const root = shell.closest<HTMLElement>('main[data-dashboard-scroll-root]');
      const bottom = root ? Math.round(parseFloat(getComputedStyle(root).paddingBottom) || 0) : 16;
      shell.style.setProperty('--ws-chrome-overlap', `${overlap}px`);
      shell.style.setProperty('--ws-fit-top', `${top}px`);
      shell.style.setProperty('--ws-fit-bottom', `${bottom}px`);
    };
    apply();
    // Chrome and padding settle after mount (lens + theme styles inject late), so
    // re-measure on the next frame, once more after styles land, and whenever the
    // scroll root or the shell's parent changes size.
    const frame = window.requestAnimationFrame(apply);
    const settle = window.setTimeout(apply, 600);
    window.addEventListener('resize', apply);
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(apply) : null;
    if (observer) {
      if (shell.parentElement) observer.observe(shell.parentElement);
      const root = shell.closest('main[data-dashboard-scroll-root]');
      if (root) observer.observe(root);
    }
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(settle);
      window.removeEventListener('resize', apply);
      observer?.disconnect();
    };
  }, [shellRef]);
}

export function useWorkspacePanels(layout: CoachWorkspaceLayout, shellRef: RefObject<HTMLElement>) {
  const width = useViewportWidth();
  const docking = workspaceDocking(layout, width);
  const [sidebar, setSidebar] = useState<PanelState>('default');
  const [inspector, setInspector] = useState<PanelState>('default');
  const lastTriggerRef = useRef<HTMLElement | null>(null);
  useFitTop(shellRef);

  // A sheet left open across a docking change (rotate, resize, lens switch) must not linger.
  useEffect(() => { if (docking.sidebarDocked && sidebar === 'open') setSidebar('default'); }, [docking.sidebarDocked, sidebar]);
  useEffect(() => { if (docking.inspectorDocked && inspector === 'open') setInspector('default'); }, [docking.inspectorDocked, inspector]);

  const sidebarVisible = docking.sidebarDocked || sidebar === 'open';
  const inspectorVisible = docking.inspectorDocked ? inspector !== 'hidden' : inspector === 'open';
  const sheetOpen = (!docking.sidebarDocked && sidebar === 'open') || (!docking.inspectorDocked && inspector === 'open');

  const remember = (event?: { currentTarget: EventTarget | null }) => {
    if (event?.currentTarget instanceof HTMLElement) lastTriggerRef.current = event.currentTarget;
  };
  /** The thread list is either docked (always shown) or a sheet this toggles. */
  const toggleSidebar = useCallback((event?: { currentTarget: EventTarget | null }) => {
    if (docking.sidebarDocked) return;
    remember(event);
    setInspector((s) => (s === 'open' ? 'default' : s));
    setSidebar((s) => (s === 'open' ? 'default' : 'open'));
  }, [docking.sidebarDocked]);
  const toggleInspector = useCallback((event?: { currentTarget: EventTarget | null }) => {
    remember(event);
    if (!docking.inspectorDocked) setSidebar((s) => (s === 'open' ? 'default' : s));
    setInspector((s) => (docking.inspectorDocked ? (s === 'hidden' ? 'default' : 'hidden') : (s === 'open' ? 'default' : 'open')));
  }, [docking.inspectorDocked]);
  /** Show the inspector (docked or as a sheet) — used by "/schedule", "/context". */
  const revealInspector = useCallback(() => {
    setInspector(docking.inspectorDocked ? 'default' : 'open');
    if (!docking.inspectorDocked) setSidebar((s) => (s === 'open' ? 'default' : s));
  }, [docking.inspectorDocked]);
  const closeSheets = useCallback(() => {
    setSidebar((s) => (s === 'open' ? 'default' : s));
    setInspector((s) => (s === 'open' ? 'default' : s));
    window.setTimeout(() => lastTriggerRef.current?.focus({ preventScroll: true }), 0);
  }, []);
  /** Close a thread sheet after picking a thread; a docked list stays put. */
  const afterThreadPick = useCallback(() => {
    if (!docking.sidebarDocked) setSidebar('default');
  }, [docking.sidebarDocked]);

  useEffect(() => {
    if (!sheetOpen) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      event.preventDefault();
      closeSheets();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeSheets, sheetOpen]);

  const shellAttributes = {
    'data-ws-layout': layout,
    ...(sidebar === 'open' && !docking.sidebarDocked ? { 'data-sidebar': 'open' } : {}),
    ...(inspector === 'open' && !docking.inspectorDocked ? { 'data-inspector': 'open' } : {}),
    ...(inspector === 'hidden' && docking.inspectorDocked ? { 'data-inspector': 'hidden' } : {}),
  } as Record<string, string>;

  return {
    docking, sidebarVisible, inspectorVisible, sheetOpen,
    toggleSidebar, toggleInspector, revealInspector, closeSheets, afterThreadPick, shellAttributes,
  };
}
