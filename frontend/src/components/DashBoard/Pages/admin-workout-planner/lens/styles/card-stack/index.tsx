/**
 * LENS: card-stack (§5.2 #4) — one day at a time. The builder is a single
 * roomy centered column (max 760px); the Rolodex and Teach ride explicit
 * toggles so exactly one thing holds attention. 250ms x-slide on section
 * change, disabled under prefers-reduced-motion. Rolodex stays ≤1 tap (L4).
 */
import React from 'react';
import styled from 'styled-components';
import type { PlannerLensComponent } from '../../slots';

const Column = styled.div`
  max-width: 760px; margin: 0 auto; display: flex; flex-direction: column; gap: 14px;
  & > * { transition: transform 250ms ease; }
  @media (prefers-reduced-motion: reduce) { & > * { transition: none; } }
`;

const ToggleRow = styled.div` display: flex; gap: 10px; justify-content: center; `;

const Toggle = styled.button<{ $active: boolean }>`
  min-height: 44px; padding: 0 16px; border-radius: 999px; cursor: pointer;
  border: 1px solid var(--world-border, rgba(96, 192, 240, 0.15));
  background: ${({ $active }) => ($active
    ? 'color-mix(in srgb, var(--world-accent, var(--accent-primary, #60C0F0)) 16%, transparent)' : 'transparent')};
  color: var(--world-text, var(--text-primary, #E0ECF4));
  font-family: 'Sora', sans-serif; font-size: 0.8rem; font-weight: 800;
  &:focus-visible { outline: 2px solid var(--accent-glow, #8B5CF6); outline-offset: 2px; }
`;

const CardStack: PlannerLensComponent = ({ rolodex, builder, teach, coachDock }) => {
  const [libraryOpen, setLibraryOpen] = React.useState(false);
  return (
    <Column>
      <ToggleRow>
        <Toggle type="button" $active={!libraryOpen} aria-pressed={!libraryOpen} onClick={() => setLibraryOpen(false)}>Today&rsquo;s card</Toggle>
        <Toggle type="button" $active={libraryOpen} aria-pressed={libraryOpen} onClick={() => setLibraryOpen(true)}>Exercises</Toggle>
      </ToggleRow>
      {libraryOpen ? rolodex : builder}
      {teach}
      {coachDock}
    </Column>
  );
};

export default CardStack;
