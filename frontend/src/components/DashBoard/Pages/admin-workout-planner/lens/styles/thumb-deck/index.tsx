/**
 * LENS: thumb-deck (§5.2 #2) — gym-floor mobile-first. Bottom tabs
 * (Builder | Exercises), Rolodex as a sheet, Coach floated above the fold,
 * roomy 48px targets. Info order: day → rows → actions. Desktop renders the
 * two-panel grid (no teach column — Teach rides its own toggle in the
 * builder). Layout-only: slots + no fetching.
 */
import React from 'react';
import styled from 'styled-components';
import type { PlannerLensComponent } from '../../slots';

const Layout = styled.div`
  display: grid; gap: 16px; grid-template-columns: minmax(280px, 340px) 1fr;
  grid-template-areas: 'rolodex stage' 'teach .';
  @media (max-width: 1279px) { display: block; }
`;

const Stage = styled.div`
  grid-area: stage;
  display: block;
  min-width: 0;
`;

const Tabs = styled.nav`
  display: none;
  @media (max-width: 1279px) {
    display: flex; position: fixed; left: 0; right: 0; bottom: 0; z-index: 50;
    height: calc(48px + env(safe-area-inset-bottom, 0px));
    padding-bottom: env(safe-area-inset-bottom, 0px);
    background: var(--world-surface, var(--bg-base, #030712));
    border-top: 1px solid var(--world-border, rgba(96, 192, 240, 0.15));
  }
`;

const Tab = styled.button<{ $active: boolean }>`
  flex: 1; min-height: 48px; border: none; cursor: pointer; background: transparent;
  color: ${({ $active }) => ($active ? 'var(--world-accent, var(--accent-primary, #60C0F0))' : 'var(--world-text-dim, var(--text-secondary, #9fb3c8))')};
  border-top: 2px solid ${({ $active }) => ($active ? 'var(--world-accent, var(--accent-primary, #60C0F0))' : 'transparent')};
  font-family: 'Sora', sans-serif; font-size: 0.78rem; font-weight: 800;
  &:focus-visible { outline: 2px solid var(--accent-glow, #8B5CF6); outline-offset: -2px; }
`;

const SheetBackdrop = styled.div`
  position: fixed; inset: 0; z-index: 90;
  background: color-mix(in srgb, var(--deep-dark, #0A0A0F) 62%, transparent);
  @media (min-width: 1280px) { display: none; }
`;

const RolodexSurface = styled.div<{ $mobileOpen: boolean }>`
  grid-area: rolodex;
  min-width: 0;
  @media (max-width: 1279px) {
    display: ${({ $mobileOpen }) => ($mobileOpen ? 'block' : 'none')};
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 91; max-height: 82dvh;
    overflow-y: auto; border-radius: 16px 16px 0 0;
    background: var(--world-surface-raised, var(--card-dark, #141419));
    border-top: 1px solid var(--world-border, rgba(96, 192, 240, 0.15));
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
`;

const TeachSurface = styled.div`
  grid-area: teach;
  min-width: 0;
  @media (max-width: 1279px) {
    padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px));
  }
`;

const CoachLayer = styled.div`
  @media (max-width: 1279px) { position: fixed; right: 16px; bottom: 72px; z-index: 60; }
`;

const ThumbDeck: PlannerLensComponent = ({ rolodex, builder, teach, coachDock }) => {
  const [tab, setTab] = React.useState<'builder' | 'exercises'>('builder');
  const [mobileViewport, setMobileViewport] = React.useState(() =>
    typeof window.matchMedia !== 'function' || window.matchMedia('(max-width: 1279px)').matches,
  );
  const sheetOpen = mobileViewport && tab === 'exercises';
  const sheetRef = React.useRef<HTMLDivElement | null>(null);
  const stageRef = React.useRef<HTMLDivElement | null>(null);
  const teachRef = React.useRef<HTMLDivElement | null>(null);
  const tabsRef = React.useRef<HTMLElement | null>(null);
  const coachRef = React.useRef<HTMLDivElement | null>(null);
  const exercisesTabRef = React.useRef<HTMLButtonElement | null>(null);
  const wasOpenRef = React.useRef(false);

  React.useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const query = window.matchMedia('(max-width: 1279px)');
    const syncViewport = (event: MediaQueryListEvent) => {
      setMobileViewport(event.matches);
      if (!event.matches) setTab('builder');
    };
    setMobileViewport(query.matches);
    query.addEventListener('change', syncViewport);
    return () => query.removeEventListener('change', syncViewport);
  }, []);

  React.useLayoutEffect(() => {
    const background = [stageRef.current, teachRef.current, tabsRef.current, coachRef.current]
      .filter((node): node is HTMLElement => Boolean(node));
    for (const node of background) {
      node.toggleAttribute('inert', sheetOpen);
      if (sheetOpen) node.setAttribute('aria-hidden', 'true');
      else node.removeAttribute('aria-hidden');
    }
    if (sheetOpen) {
      const first = sheetRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      (first ?? sheetRef.current)?.focus();
    } else if (wasOpenRef.current) {
      exercisesTabRef.current?.focus();
    }
    wasOpenRef.current = sheetOpen;
    return () => {
      for (const node of background) {
        node.removeAttribute('inert');
        node.removeAttribute('aria-hidden');
      }
    };
  }, [sheetOpen]);

  const closeSheet = () => setTab('builder');
  const onSheetKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') { event.preventDefault(); closeSheet(); return; }
    if (event.key !== 'Tab' || !sheetRef.current) return;
    const focusables = Array.from(sheetRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ));
    if (focusables.length === 0) { event.preventDefault(); sheetRef.current.focus(); return; }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  return (
    <>
      <Layout>
        {sheetOpen && (
          <SheetBackdrop onClick={closeSheet} aria-hidden />
        )}
        <RolodexSurface
          ref={sheetRef}
          $mobileOpen={sheetOpen}
          role={sheetOpen ? 'dialog' : undefined}
          aria-modal={sheetOpen ? 'true' : undefined}
          aria-label={sheetOpen ? 'Exercise library' : undefined}
          tabIndex={sheetOpen ? -1 : undefined}
          onKeyDown={sheetOpen ? onSheetKeyDown : undefined}
        >
          {rolodex}
        </RolodexSurface>
        <Stage ref={stageRef} data-testid="thumb-deck-stage" data-thumb-deck-region="stage">
          {builder}
        </Stage>
        <TeachSurface ref={teachRef} data-testid="thumb-deck-teach" data-thumb-deck-region="teach">
          {teach}
        </TeachSurface>
      </Layout>
      {coachDock && <CoachLayer ref={coachRef} data-testid="thumb-deck-coach">{coachDock}</CoachLayer>}
      <Tabs ref={tabsRef} aria-label="Planner sections" data-testid="thumb-deck-tabs">
        <Tab type="button" $active={tab === 'builder'} aria-pressed={tab === 'builder'} onClick={() => setTab('builder')}>Builder</Tab>
        <Tab ref={exercisesTabRef} type="button" $active={sheetOpen} aria-pressed={sheetOpen} onClick={() => setTab('exercises')}>Exercises</Tab>
      </Tabs>
    </>
  );
};

export default ThumbDeck;
