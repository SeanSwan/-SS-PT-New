/**
 * FILE: ClientObservatoryFeed.styles.ts
 * PURPOSE: Feed, composer, quick action, and widget styling for overview.
 */

import styled from 'styled-components';
import { focusRing, ObservatoryCard, ButtonBase } from './ClientObservatoryShell.styles';

export const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(240px, 0.9fr) minmax(280px, 1.1fr);
  gap: 1rem;

  @media (max-width: 820px) {
    grid-template-columns: 1fr;
  }
`;

export const ReelCard = styled(ObservatoryCard)`
  min-height: 360px;
`;

export const ReelImage = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: saturate(1.08) contrast(1.03);
`;

export const ReelOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 1rem;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--bg-base, #0A0A0F) 42%, transparent), transparent 38%),
    linear-gradient(0deg, color-mix(in srgb, var(--bg-base, #0A0A0F) 88%, transparent), transparent 58%);
`;

export const ReelChip = styled.span`
  width: fit-content;
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border-radius: 999px;
  padding: 0.4rem 0.72rem;
  color: var(--text-primary, #E0ECF4);
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 72%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
  font: 800 0.75rem/1 'Sora', sans-serif;
`;

export const ReelTitle = styled.h3`
  margin: 0 0 0.45rem;
  color: var(--text-primary, #E0ECF4);
  font: 900 clamp(1.6rem, 3vw, 2.45rem)/1 'Plus Jakarta Sans', sans-serif;
`;

export const ComposerCard = styled(ObservatoryCard)``;

export const ComposerForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
`;

export const ComposerTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
`;

export const CategoryRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
`;

export const CategoryPill = styled.button<{ $active: boolean }>`
  min-height: 44px;
  border-radius: 999px;
  border: 1px solid ${({ $active }) => (
    $active
      ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 45%, transparent)'
      : 'color-mix(in srgb, var(--text-primary, #E0ECF4) 13%, transparent)'
  )};
  color: ${({ $active }) => ($active ? 'var(--accent-primary, #60C0F0)' : 'var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 68%, transparent))')};
  background: ${({ $active }) => (
    $active
      ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent)'
      : 'transparent'
  )};
  padding: 0.42rem 0.72rem;
  font: 800 0.75rem/1 'Sora', sans-serif;
  cursor: pointer;
  ${focusRing}
`;

export const ComposerTextarea = styled.textarea`
  width: 100%;
  min-height: 124px;
  resize: vertical;
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 72%, transparent);
  color: var(--text-primary, #E0ECF4);
  padding: 0.95rem;
  font: 600 0.95rem/1.55 'Sora', sans-serif;
  ${focusRing}

  &::placeholder {
    color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 42%, transparent));
  }
`;

export const ComposerActions = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

export const MiniActionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.6rem;

  @media (max-width: 640px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

export const MiniAction = styled.button`
  min-height: 70px;
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
  background: color-mix(in srgb, var(--bg-elevated, #141419) 82%, transparent);
  color: var(--text-primary, #E0ECF4);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 0.38rem;
  padding: 0.8rem;
  cursor: pointer;
  ${focusRing}

  svg { color: var(--accent-primary, #60C0F0); }
  span { font: 800 0.78rem/1.1 'Sora', sans-serif; }
`;

export const FeedCard = styled(ObservatoryCard)``;

export const FeedHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.9rem;
`;

export const PostList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

export const PostItem = styled.article`
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr) minmax(120px, 0.22fr);
  gap: 0.85rem;
  align-items: stretch;
  border-radius: 16px;
  padding: 0.8rem;
  border: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent);
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 56%, transparent);

  @media (max-width: 640px) {
    grid-template-columns: 48px minmax(0, 1fr);
  }
`;

export const PostAvatar = styled.img`
  width: 58px;
  height: 58px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 38%, transparent);

  @media (max-width: 640px) {
    width: 48px;
    height: 48px;
  }
`;

export const PostBody = styled.div`
  min-width: 0;
`;

export const PostMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.65rem;
  color: var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 46%, transparent));
  font: 700 0.76rem/1.3 'Sora', sans-serif;
`;

export const PostAuthor = styled.strong`
  color: var(--text-primary, #E0ECF4);
`;

export const PostContent = styled.p`
  margin: 0.35rem 0 0;
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 76%, transparent));
  font: 600 0.88rem/1.5 'Sora', sans-serif;
`;

export const PostMedia = styled.img`
  width: 100%;
  height: 100%;
  min-height: 84px;
  object-fit: cover;
  border-radius: 12px;

  @media (max-width: 640px) {
    display: none;
  }
`;

export const EmptyState = styled.div`
  min-height: 150px;
  display: grid;
  place-items: center;
  text-align: center;
  border-radius: 16px;
  border: 1px dashed color-mix(in srgb, var(--accent-primary, #60C0F0) 25%, transparent);
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 66%, transparent));
  font: 700 0.9rem/1.5 'Sora', sans-serif;
`;

export const WidgetCard = styled(ObservatoryCard)``;

export const WidgetHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
`;

export const WidgetList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
`;

export const WidgetRow = styled.div`
  min-height: 52px;
  border-radius: 14px;
  padding: 0.72rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 58%, transparent);
  border: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent);
`;

export const WidgetLabel = styled.span`
  color: var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 70%, transparent));
  font: 700 0.78rem/1.35 'Sora', sans-serif;
`;

export const WidgetValue = styled.strong`
  color: var(--text-primary, #E0ECF4);
  font: 900 0.9rem/1.1 'Fira Code', monospace;
`;

export const SmallButton = styled(ButtonBase)`
  min-height: 44px;
  padding: 0.55rem 0.75rem;
  color: var(--accent-primary, #60C0F0);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
`;
