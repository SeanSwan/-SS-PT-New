/**
 * FILE: HomeFeedFocusBanner.styles.ts
 * PURPOSE: Focused-feed banner styles for Home social drilldowns.
 */
import styled from 'styled-components';

export const FeedFocusPanel = styled.div`
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  gap: 0.85rem;
  align-items: center;
  padding: clamp(0.85rem, 2vw, 1rem);
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 28%, transparent);
  border-radius: 8px;
  background: linear-gradient(135deg, color-mix(in srgb, var(--surface-primary, #003080) 64%, transparent), color-mix(in srgb, var(--accent-secondary, #8B5CF6) 18%, transparent));
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent);
  min-width: 0;

  @media (max-width: 720px) {
    grid-template-columns: 42px minmax(0, 1fr);
  }
`;

export const FeedFocusIcon = styled.span`
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 36%, transparent);
  color: var(--accent-primary, #60C0F0);
  background: color-mix(in srgb, var(--bg-base, #030712) 54%, transparent);
`;

export const FeedFocusCopy = styled.div`
  display: grid;
  gap: 0.28rem;
  min-width: 0;
`;

export const FeedFocusMeta = styled.span`
  color: var(--accent-gold, #C6A84B);
  font: 900 0.68rem/1 var(--font-data, 'Fira Code', monospace);
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

export const FeedFocusTitle = styled.h3`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font: 900 clamp(0.95rem, 2vw, 1.08rem)/1.2 var(--font-heading, 'Plus Jakarta Sans', sans-serif);
  letter-spacing: 0;
`;

export const FeedFocusSubtitle = styled.p`
  margin: 0;
  color: color-mix(in srgb, var(--text-secondary, #B8C7D9) 88%, transparent);
  font: 700 0.8rem/1.45 var(--font-ui, 'Sora', sans-serif);
`;

export const FeedFocusBackButton = styled.button`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  padding: 0 0.9rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 38%, transparent);
  background: color-mix(in srgb, var(--bg-base, #030712) 64%, transparent);
  color: var(--text-primary, #E0ECF4);
  font: 900 0.74rem/1 var(--font-ui, 'Sora', sans-serif);
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 160ms ease, transform 160ms ease, box-shadow 160ms ease;

  &:hover {
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 18px color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  @media (max-width: 720px) {
    grid-column: 1 / -1;
    width: 100%;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover {
      transform: none;
    }
  }
`;
