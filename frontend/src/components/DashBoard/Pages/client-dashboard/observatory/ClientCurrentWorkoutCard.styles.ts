/**
 * FILE: ClientCurrentWorkoutCard.styles.ts
 * PURPOSE: Local responsive action layout for the client current-workout card.
 */

import styled from 'styled-components';

export const CurrentWorkoutFlow = styled.ol`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
  list-style: none;
  margin: 0.9rem 0 0;
  padding: 0;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

export const CurrentWorkoutStep = styled.li`
  display: grid;
  gap: 0.35rem;
  min-width: 0;

  > button {
    justify-content: center;
    width: 100%;
    white-space: normal;
    line-height: 1.15;
  }
`;

export const CurrentWorkoutStepLabel = styled.span`
  color: var(--text-muted, #9AA8BD);
  font: 800 0.68rem/1 'Sora', sans-serif;
  letter-spacing: 0;
  text-transform: uppercase;
`;
