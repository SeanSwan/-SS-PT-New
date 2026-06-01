import styled, { keyframes } from 'styled-components';

const surfaceGlass = 'color-mix(in srgb, var(--surface-dark, #1A1A24) 72%, transparent)';
const surfaceSolid = 'color-mix(in srgb, var(--surface-dark, #1A1A24) 96%, var(--bg-base, #030712))';
const cyanLine = 'color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent)';
const cyanHover = 'color-mix(in srgb, var(--accent-primary, #60C0F0) 7%, transparent)';
const lavenderLine = 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 40%, transparent)';
const lavenderFill = 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 16%, transparent)';
const mutedText = 'color-mix(in srgb, var(--text-primary, #E0ECF4) 48%, transparent)';
const faintText = 'color-mix(in srgb, var(--text-primary, #E0ECF4) 34%, transparent)';
const errorFill = 'color-mix(in srgb, var(--surface-dark, #1A1A24) 55%, transparent)';
const shadowColor = 'color-mix(in srgb, var(--bg-base, #030712) 40%, transparent)';

const shimmer = keyframes`
  0% { opacity: 0.62; }
  50% { opacity: 1; }
  100% { opacity: 0.62; }
`;

export const WidgetContainer = styled.div<{ $compact?: boolean }>`
  background: ${surfaceGlass};
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid ${cyanLine};
  border-radius: 14px;
  padding: ${({ $compact }) => ($compact ? '12px' : '16px')};
  position: relative;

  @supports not (backdrop-filter: blur(16px)) {
    background: ${surfaceSolid};
    box-shadow: 0 4px 24px ${shadowColor};
  }
`;

export const WidgetHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
`;

export const HeaderTitle = styled.h3`
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: 1rem;
  font-weight: 600;
  color: var(--accent-primary, #60C0F0);
  margin: 0;
`;

export const TabRow = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;
`;

export const TabBtn = styled.button<{ $active?: boolean }>`
  width: 44px;
  height: 44px;
  border-radius: 8px;
  border: 1px solid ${({ $active }) => ($active ? lavenderLine : cyanLine)};
  background: ${({ $active }) => ($active ? lavenderFill : 'transparent')};
  color: ${({ $active }) => ($active ? 'var(--text-primary, #E0ECF4)' : mutedText)};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s cubic-bezier(0.16, 1, 0.3, 1), color 0.2s ease;

  &:hover {
    background: ${lavenderFill};
    color: var(--text-primary, #E0ECF4);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const RefreshBtn = styled.button`
  width: 44px;
  height: 44px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: ${faintText};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  margin-left: 4px;

  &:hover {
    color: var(--accent-primary, #60C0F0);
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const CacheBadge = styled.span`
  position: absolute;
  top: 8px;
  right: 8px;
  font-family: 'Fira Code', monospace;
  font-size: 0.55rem;
  color: ${faintText};
  text-transform: uppercase;
  letter-spacing: 0.1em;
`;

export const ContentArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 400px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: ${cyanLine};
    border-radius: 2px;
  }
`;

export const ArticleRow = styled.a`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 8px;
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
  min-height: 44px;
  transition: background 0.15s ease;

  &:hover {
    background: ${cyanHover};
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  &[aria-disabled='true'] {
    opacity: 0.55;
    pointer-events: none;
  }
`;

export const VideoRow = styled(ArticleRow)`
  padding: 8px;
`;

export const VideoThumb = styled.img`
  width: 64px;
  height: 36px;
  border-radius: 4px;
  object-fit: cover;
  flex-shrink: 0;
`;

export const ArticleContent = styled.div`
  flex: 1;
  min-width: 0;
`;

export const ArticleTitle = styled.div`
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-primary, #E0ECF4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const ArticleMeta = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 0.6rem;
  color: ${faintText};
  margin-top: 2px;
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
`;

export const ExternalIcon = styled.span`
  flex-shrink: 0;
  opacity: 0.42;
  display: inline-flex;
`;

export const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 32px 0;
  color: ${mutedText};
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  animation: ${shimmer} 1.5s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const ErrorState = styled.div`
  padding: 16px;
  text-align: center;
  color: var(--text-primary, #E0ECF4);
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  border-left: 3px solid var(--error, #ef4444);
  background: ${errorFill};
  border-radius: 0 8px 8px 0;
`;

export const EmptyState = styled.div`
  padding: 24px;
  text-align: center;
  color: ${faintText};
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
`;
