/**
 * COMPONENT: ExerciseCodexMatrix.targetButton
 * OWNER: Client Dashboard / Progress (Slice 11 — smart-target deep-link)
 * PURPOSE: Button-flavored PriorityItem for tappable "Next smart targets" on
 *          the client surface. Own file: the main styles sheet sits at its
 *          300-line cap (Rule 4).
 */

import styled from 'styled-components';
import { PriorityItem } from './ExerciseCodexMatrix.styles';

export const PriorityTargetButton = styled(PriorityItem).attrs({ as: 'button', type: 'button' })`
  background: none;
  border: none;
  width: 100%;
  padding: 0;
  cursor: pointer;
  text-align: left;

  &:hover span { color: var(--accent-primary, #60C0F0); }

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
    border-radius: 6px;
  }
`;

export default PriorityTargetButton;
