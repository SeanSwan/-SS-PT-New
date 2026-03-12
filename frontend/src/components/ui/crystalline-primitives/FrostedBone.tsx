/**
 * FrostedBone — SVG overlay for kinematic skeleton lines (AI Form Analysis)
 * Frost White lines with Ice Wing drop-shadow glow
 */
import styled from 'styled-components';

export const FrostedBone = styled.svg`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 5;

  line {
    stroke: rgba(224, 236, 244, 0.3); /* Frost White */
    stroke-width: 2px;
    stroke-linecap: round;
    filter: drop-shadow(0 0 4px rgba(96, 192, 240, 0.5)); /* Ice Wing glow */
  }
`;
