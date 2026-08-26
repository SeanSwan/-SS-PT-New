/**
 * AtelierLibrary.styles.ts — the Assets grid.
 *
 * Kept next to the component rather than folded into AtelierCompose.styles because a
 * library is a different shape from a composer: a responsive grid of many small things,
 * not a ladder of a few large ones. Tokens with literal fallbacks throughout (rule 6),
 * dark-first, and every control clears 44px (rule 2).
 */

import styled from 'styled-components';

export const FilterRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px;
  margin: 12px 0 16px;
`;

/* auto-fill rather than auto-fit: a single asset should sit at its natural width instead
   of stretching across the whole panel, which reads as a failure state. */
export const AssetGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 14px;
`;

export const AssetCard = styled.article`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  border-radius: 12px;
  border: 1px solid var(--surface-dark, #1A1A24);
  background: var(--surface-dark, #1A1A24);
`;

export const AssetThumb = styled.div`
  display: grid;
  place-items: center;
  min-height: 108px;
  border-radius: 8px;
  background: linear-gradient(160deg, var(--midnight-sapphire, #002060), var(--bg-base, #030712));
  color: var(--text-primary, #E0ECF4);
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  letter-spacing: 0.04em;
`;

export const AssetMeta = styled.div`
  color: var(--text-primary, #E0ECF4);
  font-size: 0.78rem;
  strong { text-transform: capitalize; }
  span { color: var(--text-secondary, rgba(224, 236, 244, 0.62)); }
`;
