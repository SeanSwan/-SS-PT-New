/**
 * LENS: week-ribbon (§5.2 #5) — program-first. A horizontal week strip
 * (read from PlannerDataContext — reads are legal, writes/fetches are not)
 * sits above the builder; tapping a week jumps the meso-day via
 * PlannerActionsContext (an L1-legal write path). Rolodex docks right.
 * 180ms expand, reduced-motion safe.
 */
import React from 'react';
import styled from 'styled-components';
import type { PlannerLensComponent } from '../../slots';
import { usePlannerData } from '../../../plannerContexts/PlannerDataContext';
import { usePlannerActions } from '../../../plannerContexts/PlannerActionsContext';

const Ribbon = styled.div`
  display: flex; gap: 8px; overflow-x: auto; padding: 6px 2px 10px;
  scroll-snap-type: x mandatory;
`;

const WeekChip = styled.button<{ $active: boolean }>`
  flex: 0 0 auto; scroll-snap-align: start; min-height: 44px; padding: 0 16px;
  border-radius: 10px; cursor: pointer;
  border: 1px solid var(--world-border, rgba(96, 192, 240, 0.15));
  background: ${({ $active }) => ($active
    ? 'color-mix(in srgb, var(--world-accent, var(--accent-primary, #60C0F0)) 16%, transparent)' : 'transparent')};
  color: var(--world-text, var(--text-primary, #E0ECF4));
  font-family: 'Sora', sans-serif; font-size: 0.78rem; font-weight: 800;
  transition: background 180ms ease;
  @media (prefers-reduced-motion: reduce) { transition: none; }
  &:focus-visible { outline: 2px solid var(--accent-glow, #8B5CF6); outline-offset: 2px; }
`;

const Body = styled.div<{ $teach: boolean }>`
  display: grid; gap: 14px;
  grid-template-columns: ${({ $teach }) => ($teach ? '1fr minmax(260px, 320px) minmax(240px, 300px)' : '1fr minmax(260px, 320px)')};
  @media (max-width: 1279px) { grid-template-columns: 1fr; }
`;

const WeekRibbon: PlannerLensComponent = ({ rolodex, builder, teach, coachDock, teachModeOpen }) => {
  const { generatedPlan, selectedMesoDay } = usePlannerData().local;
  const act = usePlannerActions();
  const sessionsPerWeek = generatedPlan?.planSummary.sessionsPerWeek ?? 0;
  const weekCount = generatedPlan?.planSummary.durationWeeks ?? 0;
  const activeWeek = sessionsPerWeek > 0 ? Math.floor((selectedMesoDay - 1) / sessionsPerWeek) : 0;

  return (
    <>
      {weekCount > 0 && (
        <Ribbon role="tablist" aria-label="Program weeks">
          {Array.from({ length: weekCount }, (_, week) => (
            <WeekChip
              key={week}
              type="button"
              role="tab"
              aria-selected={week === activeWeek}
              $active={week === activeWeek}
              onClick={() => act.setters.setSelectedMesoDay(week * sessionsPerWeek + 1)}
            >
              Week {week + 1}
            </WeekChip>
          ))}
        </Ribbon>
      )}
      <Body $teach={teachModeOpen}>
        {builder}
        {rolodex}
        {teach}
      </Body>
      {coachDock}
    </>
  );
};

export default WeekRibbon;
