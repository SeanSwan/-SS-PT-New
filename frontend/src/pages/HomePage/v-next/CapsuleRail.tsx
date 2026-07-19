/**
 * Home V-next — CapsuleRail (Kimi (b)1/(d): the 6 quick-nav capsules demoted OUT of the hero to a utility
 * rail below the fold — copy-freeze keeps every label verbatim, layout-freeze does not apply. This fixes
 * "8 interactive elements in the first viewport." 44px targets; a horizontal scroll-snap rail below 768px.
 */
import styled from 'styled-components';
import { Link } from 'react-router-dom';

// Labels FROZEN from the original hero capsules; destinations unchanged.
const CAPSULES: { label: string; to: string }[] = [
  { label: 'SwanStudios Social', to: '/user-dashboard' },
  { label: 'Client Dashboard', to: '/dashboard/client/overview' },
  { label: 'SwanStudios Photography', to: '/gallery' },
  { label: 'Waiver', to: '/waiver' },
  { label: 'Trainer Dashboard', to: '/dashboard/trainer/overview' },
  { label: 'Trainer Staff Review', to: '/contact' },
];

const Rail = styled.nav`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  padding: 20px var(--home-pad, 24px) 8px;
  max-width: 1100px;
  margin: 0 auto;
  @media (max-width: 768px) {
    flex-wrap: nowrap;
    overflow-x: auto;
    justify-content: flex-start;
    scroll-snap-type: x proximity;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
`;
const Capsule = styled(Link)`
  display: inline-flex;
  align-items: center;
  min-height: var(--home-target, 44px);
  padding: 0 16px;
  flex: 0 0 auto;
  scroll-snap-align: start;
  border-radius: 999px;
  border: 1px solid var(--home-ice-14);
  background: var(--home-glass);
  color: var(--home-ink-2);
  font: 600 13px / 1 var(--home-font-display, inherit);
  text-decoration: none;
  white-space: nowrap;
  transition: color 160ms var(--home-ease-standard), border-color 160ms var(--home-ease-standard),
    box-shadow 160ms var(--home-ease-standard);
  &:hover {
    color: var(--home-ink);
    border-color: color-mix(in oklab, var(--home-ice) 40%, transparent);
    box-shadow: 0 0 18px -8px var(--home-glow);
  }
`;

export function CapsuleRail() {
  return (
    <Rail aria-label="Quick links" data-testid="home-capsule-rail">
      {CAPSULES.map((c) => (
        <Capsule key={c.to + c.label} to={c.to}>
          {c.label}
        </Capsule>
      ))}
    </Rail>
  );
}
