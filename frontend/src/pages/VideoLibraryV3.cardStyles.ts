import styled, { css } from 'styled-components';

const reducedMotion = css`
  @media (prefers-reduced-motion: reduce) {
    transition: none !important;
    transform: none !important;
  }
`;

const focusRing = css`
  &:focus-visible {
    outline: 2px solid var(--focus-ring, #60C0F0);
    outline-offset: 3px;
  }
`;

const resetButton = css`
  appearance: none;
  border: 0;
  font: inherit;
  text-align: left;
`;

export const CollectionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 14px;
  margin-bottom: 2.5rem;

  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }

  @media (max-width: 320px) {
    gap: 10px;
    margin-bottom: 2rem;
  }

  @media (min-width: 2560px) {
    grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
    gap: 18px;
  }

  @media (min-width: 3840px) {
    grid-template-columns: repeat(auto-fill, minmax(440px, 1fr));
    gap: 24px;
  }
`;

export const CollectionCard = styled.button`
  ${resetButton}
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  background: ${({ theme }) => theme.background.surface};
  border: ${({ theme }) => theme.borders.card};
  border-radius: 14px;
  padding: 14px 18px;
  color: inherit;
  cursor: pointer;
  transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
  ${focusRing}
  ${reducedMotion}

  ${({ theme }) => theme.effects.glassmorphism && css`
    backdrop-filter: blur(10px);
  `}

  &:hover:not(:disabled) {
    transform: translateY(-3px);
    border: ${({ theme }) => theme.borders.elegant};
    box-shadow: ${({ theme }) => theme.shadows.elevation};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.58;
  }
`;

export const CollectionThumb = styled.div<{ $hasImage?: boolean }>`
  width: 56px;
  height: 56px;
  border-radius: 12px;
  flex-shrink: 0;
  background: ${({ theme }) => theme.gradients.glass};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.primary};
  opacity: ${({ $hasImage }) => ($hasImage ? 1 : 0.72)};
  overflow: hidden;
`;

export const CollectionImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

export const CollectionBody = styled.div`
  flex: 1;
  min-width: 0;
`;

export const CollectionTitle = styled.h3`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 0.95rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text.heading};
  margin: 0 0 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const CollectionMeta = styled.div`
  display: flex;
  gap: 10px;
  font-size: 0.78rem;
  color: ${({ theme }) => theme.text.muted};
  text-transform: capitalize;
`;

export const CollectionArrow = styled.div`
  color: ${({ theme }) => theme.text.muted};
  flex-shrink: 0;
  transition: color 0.2s ease;
  ${reducedMotion}

  ${CollectionCard}:hover:not(:disabled) & {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

export const VideoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 22px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 16px;
  }

  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }

  @media (max-width: 320px) {
    gap: 12px;
  }

  @media (min-width: 2560px) {
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 28px;
  }

  @media (min-width: 3840px) {
    grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
    gap: 36px;
  }
`;

export const VideoCard = styled.button`
  ${resetButton}
  width: 100%;
  background: linear-gradient(160deg, color-mix(in srgb, var(--surface-primary, #003080) 64%, transparent), color-mix(in srgb, var(--bg-elevated, #141419) 92%, transparent));
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  border-radius: 16px;
  overflow: hidden;
  color: inherit;
  cursor: pointer;
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent);
  transition: transform 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
  ${focusRing}
  ${reducedMotion}

  ${({ theme }) => theme.effects.glassmorphism && css`
    backdrop-filter: blur(10px);
  `}

  &:hover:not(:disabled) {
    transform: translateY(-4px);
    border-color: color-mix(in srgb, var(--accent-gold, #C6A84B) 46%, transparent);
    box-shadow: ${({ theme }) => theme.shadows.elevation}, 0 0 26px color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  }

  &:disabled { cursor: not-allowed; opacity: 0.58; }
`;

export const ThumbnailWrap = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: ${({ theme }) => theme.background.elevated};
  overflow: hidden;
`;

export const Thumbnail = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

export const ThumbnailPlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.primary};
  opacity: 0.42;
`;

export const PlayOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--bg-base, #030712) 58%, transparent);
  color: ${({ theme }) => theme.text.primary};
  opacity: 0;
  transition: opacity 0.25s ease;
  ${reducedMotion}

  ${VideoCard}:hover:not(:disabled) & {
    opacity: 1;
  }
`;

export const DurationBadge = styled.div`
  position: absolute;
  bottom: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
  background: color-mix(in srgb, var(--bg-base, #030712) 86%, transparent);
  color: ${({ theme }) => theme.text.primary};
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 0.75rem;
  font-weight: 600;
`;

export const CardBody = styled.div`
  padding: 14px 16px;
`;

export const CardTitle = styled.h3`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 0.95rem;
  font-weight: 600;
  color: ${({ theme }) => theme.text.heading};
  margin: 0 0 6px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

export const ContentTag = styled.span`
  display: inline-block;
  font-size: 0.7rem;
  color: ${({ theme }) => theme.text.muted};
  background: ${({ theme }) => theme.background.elevated};
  border-radius: 6px;
  padding: 3px 8px;
  text-transform: capitalize;
  margin-bottom: 10px;
`;

export const CardFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding-top: 8px;
  border-top: ${({ theme }) => theme.borders.subtle};
`;

export const ViewCount = styled.span`
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.78rem;
  color: ${({ theme }) => theme.text.muted};
`;

export const LockedBadge = styled.span`
  font-size: 0.7rem;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.accent};
`;
