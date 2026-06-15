/**
 * FILE: ClientCurrentWorkoutCard.styles.ts
 * PURPOSE: Local responsive action layout for the client current-workout card.
 */

import styled from 'styled-components';

export const CurrentWorkoutActionStack = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 0.5rem;

  @media (max-width: 560px) {
    width: 100%;

    > button {
      flex: 1 1 100%;
      white-space: normal;
      line-height: 1.15;
    }
  }
`;
