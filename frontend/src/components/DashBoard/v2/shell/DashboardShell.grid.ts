/**
 * Dashboards v2 — layout primitives (KIMI-DASHBOARDS §5). Keyed off [data-viewport] (the lens owns
 * the cuts); no bespoke @media in v2. StatBand, split grids, cells. Tokens only.
 */
import styled from 'styled-components';

/** 4-up stat band → 2×2 on hand. */
export const StatBand = styled.div`
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, 1fr);
  :root[data-viewport='hand'] & {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
`;

/** A 12-col working grid; children set their span via data-span; stacks on hand/lap. */
export const Grid = styled.div`
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(12, 1fr);
  align-items: start;
  :root[data-viewport='hand'] &,
  :root[data-viewport='lap'] & {
    grid-template-columns: 1fr;
  }
  :root[data-viewport='wall'] & {
    gap: 32px;
  }
`;

/** A grid cell spanning N of 12 columns (desk/wall); full width when stacked. */
export const Cell = styled.section<{ $span: number }>`
  grid-column: span ${(p) => p.$span};
  min-width: 0;
  :root[data-viewport='hand'] &,
  :root[data-viewport='lap'] & {
    grid-column: 1 / -1;
  }
`;

/** A panel surface (card chrome) for chart/table blocks. */
export const Panel = styled.div`
  padding: var(--dash-pad, 20px);
  background: var(--dash-panel);
  border: 1px solid var(--dash-line);
  border-radius: var(--dash-r-panel);
  box-shadow: var(--dash-elev-1);
`;
