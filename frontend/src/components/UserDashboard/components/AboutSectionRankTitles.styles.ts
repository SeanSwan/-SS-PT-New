/**
 * Styles for the About-section Swan rank title ladder.
 */
import styled from 'styled-components';
import { InfoCard } from './AboutSection.styles';

export const RankTitlesCard = styled(InfoCard)`
  margin-top: 2rem;
`;

export const RankTitleSummary = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 1rem;
  align-items: center;
  padding: 1rem;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
  border-radius: 12px;
  background:
    linear-gradient(135deg,
      color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent),
      color-mix(in srgb, var(--accent-secondary, #8B5CF6) 10%, transparent)
    ),
    color-mix(in srgb, var(--bg-base, #0A0A0F) 76%, transparent);

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

export const RankTitleSummaryCopy = styled.div`
  min-width: 0;
`;

export const RankTitleEyebrow = styled.p`
  margin: 0 0 0.35rem;
  color: var(--accent-primary, #60C0F0);
  font: 800 0.72rem/1 var(--font-data, 'Fira Code', monospace);
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

export const RankTitleActive = styled.p`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font: 800 clamp(1rem, 1.7vw, 1.25rem)/1.2 var(--font-heading, 'Plus Jakarta Sans', sans-serif);
  overflow-wrap: anywhere;
`;

export const RankTitleMeta = styled.p`
  margin: 0.4rem 0 0;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 72%, transparent);
  font: 600 0.86rem/1.4 var(--font-ui, 'Sora', sans-serif);
`;

export const RankTitleCount = styled.span`
  justify-self: end;
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0.55rem 0.85rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 45%, transparent);
  color: var(--accent-gold, #C6A84B);
  background: color-mix(in srgb, var(--accent-gold, #C6A84B) 10%, transparent);
  font: 800 0.8rem/1 var(--font-data, 'Fira Code', monospace);

  @media (max-width: 720px) {
    justify-self: start;
  }
`;

export const RankTitleList = styled.div`
  display: grid;
  gap: 0.65rem;
  max-height: min(620px, 62vh);
  overflow: auto;
  padding: 1rem 0.15rem 0.15rem;
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 55%, transparent) transparent;
`;

export const RankTitleRow = styled.div<{ $earned?: boolean; $selected?: boolean }>`
  display: grid;
  grid-template-columns: 4.8rem minmax(0, 1fr) auto;
  gap: 0.75rem;
  align-items: center;
  min-height: 58px;
  padding: 0.72rem;
  border-radius: 12px;
  border: 1px solid ${({ $selected, $earned }) => ($selected
    ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 55%, transparent)'
    : $earned
      ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent)'
      : 'color-mix(in srgb, var(--text-muted, #64748b) 18%, transparent)')};
  background: ${({ $selected, $earned }) => ($selected
    ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 13%, var(--bg-base, #0A0A0F))'
    : $earned
      ? 'color-mix(in srgb, var(--bg-base, #0A0A0F) 72%, transparent)'
      : 'color-mix(in srgb, var(--bg-base, #0A0A0F) 86%, transparent)')};
  opacity: ${({ $earned }) => ($earned ? 1 : 0.68)};

  @media (max-width: 620px) {
    grid-template-columns: 3.8rem minmax(0, 1fr);
  }
`;

export const RankTitleNumber = styled.span`
  color: var(--accent-primary, #60C0F0);
  font: 900 0.78rem/1 var(--font-data, 'Fira Code', monospace);
`;

export const RankTitleCopy = styled.div`
  min-width: 0;
`;

export const RankTitleName = styled.p`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font: 800 0.95rem/1.25 var(--font-ui, 'Sora', sans-serif);
  overflow-wrap: anywhere;
`;

export const RankTitleRange = styled.p`
  margin: 0.25rem 0 0;
  color: var(--text-muted, #64748b);
  font: 700 0.74rem/1.2 var(--font-data, 'Fira Code', monospace);
  text-transform: uppercase;
`;

export const RankTitleAction = styled.button<{ $selected?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-width: 112px;
  min-height: 44px;
  padding: 0.5rem 0.75rem;
  border-radius: 999px;
  border: 1px solid ${({ $selected }) => ($selected
    ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 55%, transparent)'
    : 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 38%, transparent)')};
  background: ${({ $selected }) => ($selected
    ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent)'
    : 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 14%, transparent)')};
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  font: 800 0.74rem/1 var(--font-ui, 'Sora', sans-serif);

  &:disabled {
    cursor: not-allowed;
    opacity: 0.72;
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  @media (max-width: 620px) {
    grid-column: 2;
    justify-self: start;
  }
`;