/**
 * LENS: blueprint (§5.2 #7) — print/PDF-like single column. High contrast,
 * page-break rhythm, zero motion, no hover chrome. Info order: title →
 * week → day → exercise table → notes. Mirrors the PDF export layout so
 * what you see is what the client prints.
 */
import styled from 'styled-components';
import type { PlannerLensComponent } from '../../slots';

const Sheet = styled.div`
  max-width: 860px; margin: 0 auto; display: flex; flex-direction: column; gap: 18px;
  padding: 22px;
  background: var(--world-surface, var(--bg-base, #030712));
  border: 1px solid var(--world-border, rgba(96, 192, 240, 0.15));
  border-radius: 6px;
  color: var(--world-text, var(--text-primary, #E0ECF4));
  line-height: 1.5;
  /* Print calm: kill hover affordances inside this lens. */
  & *:hover { box-shadow: none !important; }
  @media print { border: none; background: #fff; color: #000; }
`;

const Aside = styled.details`
  border: 1px dashed var(--world-border, rgba(96, 192, 240, 0.15));
  border-radius: 6px; padding: 8px 12px;
  summary { min-height: 44px; display: flex; align-items: center; cursor: pointer;
    font-family: 'Sora', sans-serif; font-weight: 800; font-size: 0.8rem; }
`;

const Blueprint: PlannerLensComponent = ({ rolodex, builder, teach, coachDock }) => (
  <Sheet>
    {builder}
    <Aside>
      <summary>Exercise library</summary>
      {rolodex}
    </Aside>
    {teach && <Aside open><summary>Teach notes</summary>{teach}</Aside>}
    {coachDock}
  </Sheet>
);

export default Blueprint;
