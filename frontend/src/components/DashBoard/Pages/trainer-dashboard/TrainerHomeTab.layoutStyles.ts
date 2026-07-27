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
  /* Wide law (design.md section 10): cap ~2240px, not 1720px, and fluid padding
     so the 4K screen doesn't leave a cramped island. */
  max-width: 2240px;
  margin: 0 auto;
  padding: clamp(1rem, 3vw, 4rem);
  /* Fill the viewport height so the grid's stretched columns absorb the space
     as breathing room inside surfaces, not a dead band between them. */
  min-height: calc(100dvh - 64px);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  background:
    radial-gradient(circle at 18% 0%, color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent), transparent 34%),
    radial-gradient(circle at 88% 12%, color-mix(in srgb, var(--accent-secondary, #8B5CF6) 9%, transparent), transparent 32%);

  @media (max-width: 414px) {
    gap: 1rem;
  }
`;

export const TrainerHomeMainGrid = styled.section`
  display: grid;
  /* both tracks minmax(0,...) so neither forces the grid past the clipped
     content area; align-items:stretch fills height (kills the 4K void). */
  grid-template-columns: minmax(0, 1.45fr) minmax(0, 0.7fr);
  gap: 1.35rem;
  align-items: stretch;
  flex: 1;

  @media (max-width: 1180px) {
    grid-template-columns: 1fr;
    align-items: start;
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
