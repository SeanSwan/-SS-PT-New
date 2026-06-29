/**
 * ============================================================================
 * FILE: HomeCommunityFeed.styles.ts
 * PURPOSE: C12 glass-panel styling for the live Home community stream.
 * HOW IT FITS: Imported only by HomeCommunityFeed, the canonical feed surface
 * inside /user-dashboard Home after /social/feed redirects into the dashboard.
 * KEY DECISIONS:
 * - Styled-components only; no Material UI or utility classes.
 * - Crystalline Swan token fallbacks keep the panel dark-first and branded.
 * - Motion is limited to a light button transition with reduced-motion support.
 * ============================================================================
 */
import styled from 'styled-components';

export const FeedSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: clamp(0.85rem, 1.8vw, 1.1rem);
  min-width: 0;
`;

export const FeedSignalHeader = styled.header`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 1rem;
  align-items: center;
  padding: clamp(0.9rem, 2vw, 1.1rem);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
  border-radius: 8px;
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--surface-primary, #003080) 72%, transparent),
      color-mix(in srgb, var(--bg-elevated, #141419) 90%, transparent)
    );
  box-shadow:
    0 18px 44px color-mix(in srgb, var(--bg-base, #030712) 52%, transparent),
    inset 0 1px 0 color-mix(in srgb, var(--text-primary, #E0ECF4) 14%, transparent);
  min-width: 0;

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
    align-items: start;
  }
`;

export const FeedSignalCopy = styled.div`
  display: grid;
  gap: 0.42rem;
  min-width: 0;
`;

export const FeedTitleRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  align-items: center;
  min-width: 0;
`;

export const FeedTitle = styled.h2`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font: 800 clamp(1.05rem, 2vw, 1.25rem)/1.2 var(--font-heading, 'Plus Jakarta Sans', sans-serif);
  letter-spacing: 0;
`;

export const FeedHint = styled.p`
  margin: 0;
  color: color-mix(in srgb, var(--text-secondary, #B8C7D9) 86%, transparent);
  font: 600 0.86rem/1.55 var(--font-ui, 'Sora', sans-serif);
  max-width: 42rem;
`;

export const FeedStatusPill = styled.span`
  justify-self: end;
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  max-width: 100%;
  padding: 0.35rem 0.8rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 38%, transparent);
  background: color-mix(in srgb, var(--bg-base, #030712) 56%, transparent);
  color: var(--accent-gold, #C6A84B);
  font: 800 0.74rem/1.1 var(--font-ui, 'Sora', sans-serif);
  text-transform: uppercase;
  white-space: nowrap;
  letter-spacing: 0;

  @media (max-width: 620px) {
    justify-self: start;
    white-space: normal;
  }
`;

export const FeedStatePanel = styled.div`
  display: grid;
  gap: 0.9rem;
  justify-items: start;
  padding: clamp(1rem, 2.6vw, 1.35rem);
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 22%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-elevated, #141419) 82%, transparent);
  min-width: 0;
`;

export const CenteredRow = styled.div`
  display: flex;
  justify-content: center;
  width: 100%;
  padding: 1.1rem 0;
`;

export const ErrorCopy = styled.p`
  margin: 0;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 82%, transparent);
  font: 700 0.9rem/1.5 var(--font-ui, 'Sora', sans-serif);
`;

export const RetryButton = styled.button`
  min-height: 44px;
  padding: 0 1.1rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 42%, transparent);
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--primary, #002060) 88%, transparent),
      color-mix(in srgb, var(--accent-secondary, #8B5CF6) 42%, transparent)
    );
  color: var(--text-primary, #E0ECF4);
  font: 800 0.8rem/1 var(--font-ui, 'Sora', sans-serif);
  cursor: pointer;
  transition: border-color 160ms ease, transform 160ms ease, box-shadow 160ms ease;

  &:hover {
    border-color: var(--accent-secondary, #8B5CF6);
    box-shadow: 0 0 20px color-mix(in srgb, var(--accent-primary, #60C0F0) 26%, transparent);
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover {
      transform: none;
    }
  }
`;

export const EndOfFeed = styled.p`
  margin: 0;
  padding: 0.55rem 0.25rem 0;
  color: color-mix(in srgb, var(--text-secondary, #B8C7D9) 78%, transparent);
  font: 700 0.78rem/1.45 var(--font-ui, 'Sora', sans-serif);
  text-align: center;
`;

export const FeedEnrichmentSourceBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  margin: -0.35rem 16px 16px;
  padding: 0.7rem 0.8rem;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-base, #030712) 38%, transparent);

  @media (min-width: 768px) {
    margin: -0.35rem 20px 20px;
  }
`;
export const FeedEnrichmentStack = styled.div`
  display: grid;
  gap: 0.8rem;
  min-width: 0;
`;

export const FeedEnrichmentCard = styled.article`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(120px, 0.34fr);
  gap: 0.85rem;
  align-items: center;
  min-width: 0;
  padding: clamp(0.85rem, 2vw, 1rem);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  border-radius: 8px;
  background:
    linear-gradient(
      140deg,
      color-mix(in srgb, var(--surface-primary, #003080) 46%, transparent),
      color-mix(in srgb, var(--bg-elevated, #141419) 88%, transparent)
    );
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--text-primary, #E0ECF4) 9%, transparent);

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
  }
`;

export const FeedEnrichmentCopy = styled.div`
  display: grid;
  gap: 0.45rem;
  min-width: 0;
`;

export const FeedEnrichmentLabel = styled.span`
  color: var(--accent-primary, #60C0F0);
  font: 900 0.68rem/1 var(--font-data, 'Fira Code', monospace);
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

export const FeedEnrichmentTitle = styled.h3`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font: 900 1rem/1.24 var(--font-heading, 'Plus Jakarta Sans', sans-serif);
  letter-spacing: 0;
`;

export const FeedEnrichmentSummary = styled.p`
  margin: 0;
  color: color-mix(in srgb, var(--text-secondary, #B8C7D9) 86%, transparent);
  font: 700 0.82rem/1.5 var(--font-ui, 'Sora', sans-serif);
`;

export const FeedEnrichmentMeta = styled.span`
  color: color-mix(in srgb, var(--accent-gold, #C6A84B) 90%, transparent);
  font: 800 0.68rem/1.35 var(--font-ui, 'Sora', sans-serif);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

export const FeedEnrichmentMediaImage = styled.img`
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  background: var(--bg-base, #030712);
  object-fit: cover;
`;

export const FeedEnrichmentMediaVideo = styled.video`
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  background: var(--bg-base, #030712);
  object-fit: cover;
`;

export const FeedEnrichmentLink = styled.a`
  min-height: 44px;
  width: fit-content;
  max-width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 0.85rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 36%, transparent);
  color: var(--accent-primary, #60C0F0);
  text-decoration: none;
  font: 900 0.74rem/1 var(--font-ui, 'Sora', sans-serif);

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;
