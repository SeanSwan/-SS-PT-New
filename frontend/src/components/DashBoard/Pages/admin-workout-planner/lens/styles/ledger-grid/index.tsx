/**
 * LENS: ledger-grid (§5.2 #3) — dense desktop ledger. Compact type scale,
 * tabular figures, zero motion; Rolodex is a narrow rail; builder dominates.
 * Info order: exercise → sets → load. For power users doing multi-week bulk
 * edits. Keyboard-first inline editing inside rows is a post-taste-cut
 * deepening item (rows are slot-opaque here) — recorded in S20 breadcrumb.
 */
import styled from 'styled-components';
import type { PlannerLensComponent } from '../../slots';

const Ledger = styled.div<{ $teach: boolean }>`
  display: grid; gap: 10px;
  grid-template-columns: ${({ $teach }) => ($teach ? 'minmax(220px, 260px) 1fr minmax(240px, 300px)' : 'minmax(220px, 260px) 1fr')};
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
  /* Densify every panel this lens hosts — presentation only. */
  & input, & button { font-variant-numeric: tabular-nums; }
  @media (max-width: 1279px) { grid-template-columns: 1fr; }
`;

const DockRow = styled.div` margin-top: 10px; `;

const LedgerGrid: PlannerLensComponent = ({ rolodex, builder, teach, coachDock, teachModeOpen }) => (
  <>
    <Ledger $teach={teachModeOpen}>
      {rolodex}
      {builder}
      {teach}
    </Ledger>
    {coachDock && <DockRow>{coachDock}</DockRow>}
  </>
);

export default LedgerGrid;
