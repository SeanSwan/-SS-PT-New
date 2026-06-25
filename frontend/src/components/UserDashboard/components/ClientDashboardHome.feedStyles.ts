/**
 * FILE: ClientDashboardHome.feedStyles.ts
 * PURPOSE: Feed, composer, tags, and compact data visual styles.
 */
import styled from 'styled-components';

export const ComposerForm = styled.form`
  display: grid;
  gap: 12px;
  padding: 16px;
`;

export const ComposerTextArea = styled.textarea`
  width: 100%;
  min-height: 86px;
  resize: vertical;
  border: 1px solid var(--client-line);
  border-radius: 8px;
  background: color-mix(in srgb, var(--client-panel-soft) 86%, transparent);
  color: var(--client-text);
  padding: 12px;
  font: inherit;
  line-height: 1.45;

  &::placeholder {
    color: var(--client-faint);
  }

  &:focus {
    border-color: var(--client-line-strong);
    outline: 2px solid color-mix(in srgb, var(--client-mint) 28%, transparent);
    outline-offset: 2px;
  }
`;

export const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

export const MoodChip = styled.button<{ $active?: boolean }>`
  min-height: 44px;
  padding: 0 13px;
  border: 1px solid ${({ $active }) => ($active ? 'var(--client-line-strong)' : 'var(--client-line)')};
  border-radius: 999px;
  background: ${({ $active }) => ($active ? 'color-mix(in srgb, var(--client-mint) 18%, transparent)' : 'transparent')};
  color: ${({ $active }) => ($active ? 'var(--client-text)' : 'var(--client-muted)')};
  font: inherit;
  font-size: 0.76rem;
  font-weight: 800;
  cursor: pointer;
`;

export const MediaPreviewShell = styled.div`
  display: grid;
  grid-template-columns: minmax(92px, 128px) minmax(0, 1fr) minmax(132px, auto);
  gap: 12px;
  align-items: center;
  padding: 10px;
  border: 1px solid var(--client-line);
  border-radius: 8px;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--client-panel-strong) 48%, transparent), transparent),
    color-mix(in srgb, var(--client-panel-soft) 78%, transparent);

  @media (max-width: 620px) {
    grid-template-columns: 92px minmax(0, 1fr);

    button {
      grid-column: 1 / -1;
    }
  }
`;

export const MediaPreviewFrame = styled.div`
  min-height: 74px;
  aspect-ratio: 4 / 3;
  border-radius: 8px;
  overflow: hidden;
  background: color-mix(in srgb, var(--client-black) 48%, transparent);
  border: 1px solid var(--client-line-strong);

  img,
  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
`;

export const MediaPreviewCopy = styled.div`
  min-width: 0;
  display: grid;
  gap: 3px;

  strong {
    min-width: 0;
    overflow: hidden;
    color: var(--client-text);
    font-size: 0.82rem;
    line-height: 1.25;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

export const ComposerFooter = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

export const FeedPost = styled.article`
  display: grid;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid var(--client-line);
`;

export const PostHeader = styled.header`
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;

  img {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    object-fit: cover;
    border: 1px solid var(--client-line-strong);
  }
`;

export const PostMedia = styled.div`
  position: relative;
  min-height: 188px;
  border-radius: 8px;
  overflow: hidden;
  background: color-mix(in srgb, var(--client-panel-soft) 78%, transparent);

  img,
  video {
    width: 100%;
    height: 100%;
    min-height: 188px;
    object-fit: cover;
    display: block;
  }
`;

export const PostMediaButton = styled.button`
  position: relative;
  width: 100%;
  min-height: 188px;
  padding: 0;
  border: 0;
  border-radius: 8px;
  overflow: hidden;
  background: color-mix(in srgb, var(--client-panel-soft) 78%, transparent);
  cursor: zoom-in;

  img {
    width: 100%;
    height: 100%;
    min-height: 188px;
    object-fit: cover;
    display: block;
  }

  &:focus-visible {
    outline: 3px solid var(--client-mint);
    outline-offset: 2px;
  }
`;

export const SocialStats = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  color: var(--client-muted);
  font-size: 0.82rem;
`;

export const InsightGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
  }
`;

export const InsightTile = styled.div`
  min-height: 106px;
  padding: 12px;
  border: 1px solid var(--client-line);
  border-radius: 8px;
  background: color-mix(in srgb, var(--client-panel-soft) 74%, transparent);
`;

export const Sparkline = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 4px;
  align-items: end;
  height: 28px;
  margin-top: 10px;
`;

export const SparkBar = styled.span<{ $height: number }>`
  display: block;
  height: ${({ $height }) => `${Math.max(5, Math.min(28, $height))}px`};
  border-radius: 999px;
  background: linear-gradient(180deg, var(--client-mint), var(--client-blue));
`;

export const TagGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 16px;
`;

export const TagPill = styled.button`
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid var(--client-line);
  border-radius: 999px;
  background: color-mix(in srgb, var(--client-panel-soft) 62%, transparent);
  color: var(--client-muted);
  font: inherit;
  font-size: 0.74rem;
  font-weight: 700;
`;
