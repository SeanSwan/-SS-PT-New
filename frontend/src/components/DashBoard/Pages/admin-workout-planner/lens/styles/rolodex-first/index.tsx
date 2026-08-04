/**
 * LENS: rolodex-first (§5.2 #9) — the library is the hero; the builder is a
 * persistent bottom tray showing what's in the session. Info order: search →
 * facets → grid → tray. 150ms card lift lives in the Rolodex's own hover
 * styles; this lens adds none (reduced-motion trivially safe).
 */
import styled from 'styled-components';
import type { PlannerLensComponent } from '../../slots';

const Hero = styled.div`
  display: grid; gap: 14px; grid-template-columns: 1fr;
  padding-bottom: 40dvh; /* clears the tray */
`;

const Tray = styled.div`
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 40;
  max-height: 38dvh; overflow-y: auto;
  background: var(--world-surface-raised, var(--card-dark, #141419));
  border-top: 1px solid var(--world-border, rgba(96, 192, 240, 0.15));
  padding: 10px 14px calc(10px + env(safe-area-inset-bottom, 0px));
`;

const SideNotes = styled.div` display: flex; flex-direction: column; gap: 12px; `;

const RolodexFirst: PlannerLensComponent = ({ rolodex, builder, teach, coachDock }) => (
  <>
    <Hero>
      {rolodex}
      <SideNotes>{teach}{coachDock}</SideNotes>
    </Hero>
    <Tray aria-label="Session tray">{builder}</Tray>
  </>
);

export default RolodexFirst;
