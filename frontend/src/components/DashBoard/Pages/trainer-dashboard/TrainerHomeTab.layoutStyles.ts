/**
 * FILE: TrainerHomeTab.layoutStyles.ts
 * PURPOSE: Wide command-surface layout for the canonical trainer home.
 *
 * Keeps the TrainerHomeTab component under the project line cap while giving
 * the trainer dashboard the same observatory-grade composition as client home.
 */

import styled from 'styled-components';

export const TrainerHomeHeroGrid = styled.section`
  width: 100%;
  max-width: 1720px;
  display: grid;
  grid-template-columns: minmax(0, 1.28fr) minmax(340px, 0.72fr);
  gap: 1rem;
  align-items: stretch;

  @media (max-width: 1120px) {
    grid-template-columns: 1fr;
  }
`;

export const TrainerHeroPanel = styled.div`
  min-width: 0;
  display: grid;
  align-content: stretch;
`;

export const TrainerHomeMainGrid = styled.section`
  width: 100%;
  max-width: 1720px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(340px, 0.42fr);
  gap: 1rem;
  align-items: start;

  @media (max-width: 1120px) {
    grid-template-columns: 1fr;
  }
`;

export const TrainerHomePrimaryColumn = styled.div`
  min-width: 0;
  display: grid;
  gap: 1rem;
`;

export const TrainerHomeSideColumn = styled.aside`
  min-width: 0;
  display: grid;
  gap: 0.75rem;
  position: sticky;
  top: 1rem;

  @media (max-width: 1120px) {
    position: static;
  }
`;
