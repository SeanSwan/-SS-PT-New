/**
 * FILE: ClientDashboardHome.priorityStyles.ts
 * PURPOSE: Keep the client Home columns ordered around workout-first mobile use.
 *
 * HOW IT FITS IN THE APP: ClientDashboardHome composes these two grid rails.
 * KEY DECISION: Desktop preserves the profile-first story, while phones place
 * the real current workout ahead of secondary identity and program detail.
 */
import styled from 'styled-components';

export const PrimaryStack = styled.div`
  display: grid;
  gap: 14px;
  min-width: 0;

  @media (max-width: 600px) {
    > [data-testid='client-program-shelf'] {
      order: -1;

      > [data-testid='current-workout-card'] {
        order: -1;
      }
    }
  }
`;

export const RightRail = styled.aside`
  display: grid;
  align-content: start;
  gap: 14px;
  min-width: 0;
`;
