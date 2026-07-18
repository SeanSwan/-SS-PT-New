/**
 * Dashboards v2 — LogSessionHero (KIMI-DASHBOARDS §2.4). The trainer density's ONE action-fill element:
 * a 56px CTA to start logging, with now/next session context. Full-width hand, 320px ≥ desk. This is
 * the only element allowed to carry --dash-action fill on the trainer surface (action-budget §2.5).
 * The sticky-bottom-bar variant is composed by the density on hand/lap; this is the in-flow hero.
 */
import styled from 'styled-components';
import type { SessionRow } from '../types';

const Hero = styled.section`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px 20px;
  border-radius: var(--dash-r-panel, 18px);
  background: var(--dash-glass);
  border: 1px solid var(--dash-line-strong);
`;
const Context = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 16px;
`;
const Now = styled.span`
  font: 700 16px / 1.2 var(--dash-font-display, inherit);
  color: var(--dash-ink);
`;
const Next = styled.span`
  font-size: 13px;
  color: var(--dash-ink-2);
`;
const CTA = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 56px;
  padding: 0 24px;
  width: 100%;
  border-radius: 999px;
  background: var(--dash-action);
  color: var(--dash-canvas, #0b0f14);
  font: 700 16px / 1 var(--dash-font-display, inherit);
  text-decoration: none;
  transition: filter 120ms ease;
  &:hover {
    filter: brightness(1.06);
  }
  &:focus-visible {
    outline: 2px solid var(--dash-action);
    outline-offset: 2px;
  }
  @media (min-width: 1024px) {
    width: 320px;
  }
`;

export interface LogSessionHeroProps {
  now: SessionRow | null;
  next: SessionRow | null;
  minutesUntilNext: number | null;
  href?: string;
}

export function LogSessionHero({ now, next, minutesUntilNext, href = '/dashboard/trainer/log' }: LogSessionHeroProps) {
  return (
    <Hero data-testid="dash-log-hero">
      <Context>
        <Now>{now ? `Now: ${now.clientRef} · ${now.startLabel}` : 'No session in progress'}</Now>
        {next ? (
          <Next>
            Next: {next.clientRef} · {next.startLabel}
            {minutesUntilNext != null ? ` (${minutesUntilNext}m)` : ''}
          </Next>
        ) : (
          <Next>No more sessions today</Next>
        )}
      </Context>
      <CTA href={href}>Start logging</CTA>
    </Hero>
  );
}
