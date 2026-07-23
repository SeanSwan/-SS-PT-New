/**
 * FILE: TrainerHomeTab.layoutStyles.ts
 * PURPOSE: Client-observatory parity layout for the canonical trainer home.
 *
 * Mirrors the client dashboard shell: wide page frame, full hero, primary work
 * column, and right rail. Trainer-specific workflow lives in child modules.
 */

import styled from 'styled-components';

export const TrainerHomePageShell = styled.section`
  width: 100%;
  max-width: 1720px;
  margin: 0 auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  background:
    radial-gradient(circle at 18% 0%, color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent), transparent 34%),
    radial-gradient(circle at 88% 12%, color-mix(in srgb, var(--accent-secondary, #8B5CF6) 9%, transparent), transparent 32%);

  @media (max-width: 768px) {
    padding: 1rem;
  }

  @media (max-width: 414px) {
    padding: 0.85rem;
    gap: 1rem;
  }
`;

export const TrainerHomeMainGrid = styled.section`
  display: grid;
  /* min-width: 0 on BOTH tracks so neither can force the grid past its
     container (the dashboard content area clips overflow-x, so a hard 320px
     rail floor pushed content off-screen on narrower desktop/tablet widths). */
  grid-template-columns: minmax(0, 1.45fr) minmax(0, 0.7fr);
  gap: 1.35rem;
  align-items: start;

  @media (max-width: 1180px) {
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
  gap: 1rem;
`;
