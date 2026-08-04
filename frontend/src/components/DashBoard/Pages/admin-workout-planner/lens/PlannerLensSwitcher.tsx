/**
 * COMPONENT: PlannerLensSwitcher (S22 — JARVIS blueprint §5.4, rulings A3/A5)
 * PURPOSE: Pick a Planner Lens. Mobile = bottom-sheet carousel with
 * scroll-snap and an 85%-width next-card peek (pagination dots are DROPPED
 * per ruling A5 — snap + peek carries position). Desktop = grid. Cards are
 * role=button + aria-pressed; the active card wears a Wing Purple border +
 * an Ice Wing check (Arctic Cyan is data-only, ruling A3). Reduced motion
 * disables lift + smooth scrolling. Renders ONLY inside the lens host —
 * with PLANNER_LENS_STYLES off it cannot mount anywhere.
 */

import React from 'react';
import styled from 'styled-components';
import { Check } from 'lucide-react';
import { plannerLensRegistry, type PlannerLensId } from './registry';

const OpenButton = styled.button`
  min-height: 44px; padding: 0 14px; border-radius: 10px; cursor: pointer;
  margin-bottom: 12px;
  background: transparent; border: 1px solid var(--world-border, rgba(96, 192, 240, 0.15));
  color: var(--world-text-dim, var(--text-secondary, #9fb3c8));
  font-family: 'Sora', sans-serif; font-size: 0.78rem; font-weight: 800;
  &:focus-visible { outline: 2px solid var(--accent-glow, #8B5CF6); outline-offset: 2px; }
`;

const Backdrop = styled.div`
  position: fixed; inset: 0; z-index: 90;
  background: color-mix(in srgb, var(--deep-dark, #0A0A0F) 62%, transparent);
  display: flex; align-items: flex-end; justify-content: center;
  @media (min-width: 1280px) { align-items: center; }
`;

const SheetPanel = styled.div`
  z-index: 91; width: 100%; max-height: 78dvh; overflow-y: auto;
  background: var(--world-surface-raised, var(--card-dark, #141419));
  border: 1px solid var(--world-border, rgba(96, 192, 240, 0.15));
  border-radius: 16px 16px 0 0;
  padding: 14px 14px calc(14px + env(safe-area-inset-bottom, 0px));
  @media (min-width: 1280px) { max-width: 880px; border-radius: 16px; }
`;

const CardRail = styled.div`
  display: flex; gap: 12px; overflow-x: auto;
  scroll-snap-type: x mandatory; scroll-behavior: smooth;
  @media (prefers-reduced-motion: reduce) { scroll-behavior: auto; }
  @media (min-width: 1280px) {
    display: grid; grid-template-columns: repeat(3, 1fr); overflow: visible;
  }
`;

const LensCard = styled.div<{ $active: boolean }>`
  flex: 0 0 85%; scroll-snap-align: start; cursor: pointer;
  min-height: 96px; padding: 14px; border-radius: 14px;
  background: var(--world-surface, var(--bg-base, #030712));
  border: 2px solid ${({ $active }) => ($active
    ? 'var(--accent-glow, #8B5CF6)' : 'var(--world-border, rgba(96, 192, 240, 0.15))')};
  transition: transform 150ms ease;
  &:hover { transform: translateY(-2px); }
  @media (prefers-reduced-motion: reduce) { transition: none; &:hover { transform: none; } }
  &:focus-visible { outline: 2px solid var(--accent-glow, #8B5CF6); outline-offset: 3px; }
`;

const CardName = styled.p`
  margin: 0; display: flex; align-items: center; gap: 8px;
  font-family: 'Sora', sans-serif; font-size: 0.88rem; font-weight: 800;
  color: var(--world-text, var(--text-primary, #E0ECF4));
  svg { color: var(--world-accent, var(--accent-primary, #60C0F0)); } /* Ice Wing check (A3) */
`;

const CardBlurb = styled.p`
  margin: 6px 0 0; font-family: 'Sora', sans-serif; font-size: 0.76rem;
  color: var(--world-text-dim, var(--text-secondary, #9fb3c8));
`;

export interface PlannerLensSwitcherProps {
  activeLensId: PlannerLensId;
  onSelect: (id: PlannerLensId) => void;
}

const PlannerLensSwitcher: React.FC<PlannerLensSwitcherProps> = ({ activeLensId, onSelect }) => {
  const [open, setOpen] = React.useState(false);
  const entries = Object.values(plannerLensRegistry).filter(Boolean);

  return (
    <>
      <OpenButton type="button" aria-expanded={open} onClick={() => setOpen(true)}>
        Planner style: {plannerLensRegistry[activeLensId]?.name ?? activeLensId}
      </OpenButton>
      {open && (
        <Backdrop onClick={() => setOpen(false)}>
          <SheetPanel role="dialog" aria-modal="true" aria-label="Choose a planner style" onClick={event => event.stopPropagation()}>
            <CardRail>
              {entries.map(entry => (
                <LensCard
                  key={entry!.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={entry!.id === activeLensId}
                  $active={entry!.id === activeLensId}
                  onClick={() => { onSelect(entry!.id); setOpen(false); }}
                  onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(entry!.id); setOpen(false); } }}
                >
                  <CardName>
                    {entry!.id === activeLensId && <Check size={16} aria-hidden />}
                    {entry!.name}
                  </CardName>
                  <CardBlurb>{entry!.blurb}</CardBlurb>
                </LensCard>
              ))}
            </CardRail>
          </SheetPanel>
        </Backdrop>
      )}
    </>
  );
};

export default PlannerLensSwitcher;
