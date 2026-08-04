/**
 * LENS: focus-lane (§5.2 #8) — one section at a time, giant type, minimal
 * chrome, explicit Next/Back, NO motion (a11y-first: low-vision, cognitive
 * load, reduced-motion by default). Survives 200% zoom: everything is a
 * single max-width column with relative units.
 */
import React from 'react';
import styled from 'styled-components';
import type { PlannerLensComponent } from '../../slots';

const Lane = styled.div`
  max-width: 52rem; margin: 0 auto; display: flex; flex-direction: column; gap: 1.2rem;
  font-size: 1.25rem;
`;

const NavRow = styled.div` display: flex; justify-content: space-between; gap: 1rem; `;

const NavButton = styled.button`
  min-height: 56px; padding: 0 1.6rem; border-radius: 12px; cursor: pointer;
  border: 2px solid var(--world-border, rgba(96, 192, 240, 0.25));
  background: var(--btn-primary-bg, #002060);
  color: var(--world-text, var(--text-primary, #E0ECF4));
  font-family: 'Sora', sans-serif; font-size: 1.05rem; font-weight: 800;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  &:focus-visible { outline: 3px solid var(--accent-glow, #8B5CF6); outline-offset: 3px; }
`;

const SectionLabel = styled.p`
  margin: 0; font-family: 'Sora', sans-serif; font-size: 1rem; font-weight: 800;
  color: var(--world-text-dim, var(--text-secondary, #9fb3c8));
`;

const SECTIONS = ['Builder', 'Exercises', 'Coach'] as const;

const FocusLane: PlannerLensComponent = ({ rolodex, builder, teach, coachDock }) => {
  const [index, setIndex] = React.useState(0);
  const section = SECTIONS[index];
  return (
    <Lane>
      <SectionLabel aria-live="polite">Section {index + 1} of {SECTIONS.length}: {section}</SectionLabel>
      {section === 'Builder' && <>{builder}{teach}</>}
      {section === 'Exercises' && rolodex}
      {section === 'Coach' && (coachDock ?? <SectionLabel>Coach is not available for this viewer.</SectionLabel>)}
      <NavRow>
        <NavButton type="button" disabled={index === 0} onClick={() => setIndex(i => Math.max(0, i - 1))}>
          ← Back
        </NavButton>
        <NavButton type="button" disabled={index === SECTIONS.length - 1} onClick={() => setIndex(i => Math.min(SECTIONS.length - 1, i + 1))}>
          Next →
        </NavButton>
      </NavRow>
    </Lane>
  );
};

export default FocusLane;
