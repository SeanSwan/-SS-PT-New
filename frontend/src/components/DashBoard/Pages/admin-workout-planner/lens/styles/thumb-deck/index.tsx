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

const Grid = styled.div`
  display: grid; gap: 16px; grid-template-columns: minmax(280px, 340px) 1fr;
  @media (max-width: 1279px) { display: none; }
`;

const Stage = styled.div`
  display: none;
  @media (max-width: 1279px) {
    display: block;
    padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px));
  }
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

const Sheet = styled.div`
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 91; max-height: 82dvh;
  overflow-y: auto; border-radius: 16px 16px 0 0;
  background: var(--world-surface-raised, var(--card-dark, #141419));
  border-top: 1px solid var(--world-border, rgba(96, 192, 240, 0.15));
  padding-bottom: env(safe-area-inset-bottom, 0px);
  @media (min-width: 1280px) { display: none; }
`;

const CoachLayer = styled.div`
  @media (max-width: 1279px) { position: fixed; right: 16px; bottom: 72px; z-index: 60; }
`;

const ThumbDeck: PlannerLensComponent = ({ rolodex, builder, teach, coachDock }) => {
  const [tab, setTab] = React.useState<'builder' | 'exercises'>('builder');
  return (
    <>
      <Grid>{rolodex}{builder}</Grid>
      <Stage>
        {builder}
        {teach}
        {tab === 'exercises' && (
          <>
            <SheetBackdrop onClick={() => setTab('builder')} aria-hidden />
            <Sheet role="dialog" aria-modal="true" aria-label="Exercise library">{rolodex}</Sheet>
          </>
        )}
      </Stage>
      {coachDock && <CoachLayer>{coachDock}</CoachLayer>}
      <Tabs aria-label="Planner sections">
        <Tab type="button" $active={tab === 'builder'} aria-pressed={tab === 'builder'} onClick={() => setTab('builder')}>Builder</Tab>
        <Tab type="button" $active={tab === 'exercises'} aria-pressed={tab === 'exercises'} onClick={() => setTab('exercises')}>Exercises</Tab>
      </Tabs>
    </>
  );
};

export default ThumbDeck;
