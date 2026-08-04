/**
 * ExplanationsStrip
 * PURPOSE: Render the generator's `explanations` — the surfaced safety rail.
 *          Found by the SWA-105 phase-2 hostile loop: slices 1–4 emit the
 *          day-type contract verdict, small-class collapse, equipment
 *          feasibility warnings, relaxations and brain provenance, and the
 *          Builder rendered NONE of it. A safety rail nobody can see is a
 *          Trailhead-Truth failure waiting for an audit.
 * PARENTS: ClassPreviewPanel (above the board, below the timing badges).
 * STATE: none — pure render of GeneratedBootcamp.explanations.
 * SWA-105 Phase 2 F1 | AUTHOR: Claude Fable 5 | CREATED: 2026-08-03
 */
import React from 'react';
import styled, { css } from 'styled-components';
import type { BootcampExplanation } from '../../hooks/useBootcampAPI';

/** Types whose message is a WARNING the trainer should read before class. */
const WARN_TYPES = new Set([
  'equipment_feasibility', 'relaxation', 'brain_fallback', 'small_class', 'finisher_policy', 'overflow',
]);

const Strip = styled.ul`
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Row = styled.li<{ $warn: boolean }>`
  display: flex;
  gap: 10px;
  align-items: flex-start;
  font-size: 0.85rem;
  font-weight: 600;
  line-height: 1.45;
  padding: 8px 12px;
  border-radius: 10px;
  ${({ $warn }) => ($warn
    ? css`
      background: rgba(198, 168, 75, 0.12);
      border: 1px solid rgba(198, 168, 75, 0.5);
      color: var(--accent-luxury, #c6a84b);
    `
    : css`
      background: rgba(96, 192, 240, 0.08);
      border: 1px solid rgba(96, 192, 240, 0.25);
      color: var(--text-primary, #e0ecf4);
    `)}
`;

const TypeTag = styled.span`
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
  opacity: 0.8;
  padding-top: 1px;
`;

export interface ExplanationsStripProps {
  explanations: BootcampExplanation[] | undefined;
}

const ExplanationsStrip: React.FC<ExplanationsStripProps> = ({ explanations }) => {
  if (!explanations || explanations.length === 0) return null;
  return (
    <Strip data-testid="explanations-strip" aria-label="How this class was built">
      {explanations.map((explanation, index) => {
        const warn = WARN_TYPES.has(explanation.type);
        return (
          <Row key={`${explanation.type}-${index}`} $warn={warn} data-testid={`explanation-${explanation.type}`}>
            <TypeTag>{explanation.type.replace(/_/g, ' ')}</TypeTag>
            <span>{explanation.message}</span>
          </Row>
        );
      })}
    </Strip>
  );
};

export default ExplanationsStrip;
