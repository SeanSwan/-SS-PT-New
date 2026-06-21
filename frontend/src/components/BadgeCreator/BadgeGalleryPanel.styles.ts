import styled, { css, keyframes } from 'styled-components';
import { Filter, Image, Loader } from 'lucide-react';

const legendaryGlow = keyframes`
  0% { border-color: var(--accent-gold, #C6A84B); box-shadow: 0 0 8px color-mix(in srgb, var(--accent-gold, #C6A84B) 30%, transparent); }
  33% { border-color: var(--accent-secondary, #8B5CF6); box-shadow: 0 0 8px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent); }
  66% { border-color: var(--accent-primary, #60C0F0); box-shadow: 0 0 8px color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent); }
  100% { border-color: var(--accent-gold, #C6A84B); box-shadow: 0 0 8px color-mix(in srgb, var(--accent-gold, #C6A84B) 30%, transparent); }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const RARITY_BORDERS: Record<string, string> = {
  common: '2px solid color-mix(in srgb, var(--swan-lavender, #4070C0) 40%, transparent)',
  rare: '2px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 60%, transparent)',
  epic: '2px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 60%, transparent)',
  legendary: '2px solid var(--accent-gold, #C6A84B)',
};

const RARITY_COLORS: Record<string, string> = {
  common: 'var(--swan-lavender, #4070C0)',
  rare: 'var(--accent-gold, #C6A84B)',
  epic: 'var(--accent-secondary, #8B5CF6)',
  legendary: 'var(--accent-gold, #C6A84B)',
};

const legendaryAnimation = css`
  animation: ${legendaryGlow} 3s ease-in-out infinite;
`;

export const Panel = styled.div`
  padding: 0;
`;

export const FilterBar = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
`;

export const FilterIcon = styled(Filter)`
  color: color-mix(in srgb, var(--text-secondary, #B8C7D6) 62%, transparent);
`;

export const FilterBtn = styled.button<{ $active: boolean }>`
  background: ${({ $active }) => $active
    ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent)'
    : 'transparent'};
  border: 1px solid ${({ $active }) => $active
    ? 'var(--accent-primary, #60C0F0)'
    : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent)'};
  border-radius: 8px;
  color: ${({ $active }) => $active
    ? 'var(--accent-primary, #60C0F0)'
    : 'color-mix(in srgb, var(--text-secondary, #B8C7D6) 72%, transparent)'};
  cursor: pointer;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 600;
  min-height: 44px;
  padding: 8px 14px;
  text-transform: capitalize;
  transition: border-color 150ms ease, background 150ms ease, color 150ms ease;

  &:hover,
  &:focus-visible {
    border-color: var(--accent-primary, #60C0F0);
    outline: none;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const BadgeGrid = styled.div`
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
`;

export const BadgeCard = styled.button<{ $rarity: string; $selected: boolean }>`
  background: var(--bg-elevated, #141419);
  border: ${({ $rarity }) => RARITY_BORDERS[$rarity] || RARITY_BORDERS.common};
  border-radius: 12px;
  color: inherit;
  cursor: pointer;
  padding: 14px;
  text-align: left;
  transition: transform 150ms ease;
  width: 100%;
  ${({ $rarity }) => $rarity === 'legendary' ? legendaryAnimation : ''}
  ${({ $selected }) => $selected ? 'outline: 2px solid var(--accent-primary, #60C0F0);' : 'outline: none;'}
  outline-offset: 2px;

  &:hover,
  &:focus-visible {
    transform: translateY(-2px);
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transition: none;
    &:hover,
    &:focus-visible { transform: none; }
  }
`;

export const BadgeImg = styled.div`
  align-items: center;
  aspect-ratio: 1;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 78%, transparent);
  border-radius: 8px;
  display: flex;
  justify-content: center;
  margin-bottom: 10px;
  overflow: hidden;
  width: 100%;

  img {
    height: 100%;
    object-fit: contain;
    width: 100%;
  }
`;

export const BadgeName = styled.div`
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const BadgeMeta = styled.div`
  align-items: center;
  display: flex;
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  gap: 6px;
`;

export const RarityTag = styled.span<{ $rarity: string }>`
  color: ${({ $rarity }) => RARITY_COLORS[$rarity] || RARITY_COLORS.common};
  font-weight: 700;
  text-transform: uppercase;
`;

export const AssignTag = styled.span`
  color: var(--accent-primary, #60C0F0);
  font-size: 10px;
`;

export const AssignPanel = styled.div`
  background: var(--bg-elevated, #141419);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  border-radius: 12px;
  margin-top: 20px;
  padding: 16px;
`;

export const AssignTitle = styled.h3`
  align-items: center;
  color: var(--text-primary, #E0ECF4);
  display: flex;
  flex-wrap: wrap;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 15px;
  font-weight: 700;
  gap: 8px;
  margin: 0 0 12px;
`;

export const AssignRow = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
`;

const assignmentField = css`
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 78%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  border-radius: 8px;
  color: var(--text-primary, #E0ECF4);
  flex: 1;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  min-height: 44px;
  min-width: 140px;
  padding: 8px 12px;
`;

export const AssignSelect = styled.select`
  ${assignmentField}

  option { background: var(--bg-elevated, #141419); }
`;

export const AssignInput = styled.input`
  ${assignmentField}
  flex: 2;
`;

export const AssignBtn = styled.button<{ $variant?: string }>`
  align-items: center;
  background: ${({ $variant }) => $variant === 'danger'
    ? 'color-mix(in srgb, var(--status-danger, #EF4444) 12%, transparent)'
    : 'linear-gradient(135deg, var(--surface-primary, #002060), var(--accent-secondary, #8B5CF6))'};
  border: ${({ $variant }) => $variant === 'danger'
    ? '1px solid color-mix(in srgb, var(--status-danger, #EF4444) 32%, transparent)'
    : 'none'};
  border-radius: 8px;
  color: ${({ $variant }) => $variant === 'danger'
    ? 'var(--status-danger, #EF4444)'
    : 'var(--text-primary, #E0ECF4)'};
  cursor: pointer;
  display: flex;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 600;
  gap: 6px;
  min-height: 44px;
  padding: 10px 20px;
  transition: opacity 150ms ease;

  &:hover { opacity: 0.85; }
  &:disabled { cursor: not-allowed; opacity: 0.4; }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

export const EmptyState = styled.div`
  color: color-mix(in srgb, var(--text-secondary, #B8C7D6) 62%, transparent);
  font-family: 'Sora', sans-serif;
  font-size: 14px;
  padding: 48px 16px;
  text-align: center;
`;

export const LoadingState = styled.div`
  align-items: center;
  color: color-mix(in srgb, var(--text-secondary, #B8C7D6) 76%, transparent);
  display: flex;
  gap: 8px;
  justify-content: center;
  padding: 48px;
`;

export const LoadingSpinner = styled(Loader)`
  animation: ${spin} 1s linear infinite;
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const StatusBanner = styled.div<{ $type: 'success' | 'error' }>`
  align-items: center;
  background: ${({ $type }) => $type === 'success'
    ? 'color-mix(in srgb, var(--status-success, #10B981) 10%, transparent)'
    : 'color-mix(in srgb, var(--status-danger, #EF4444) 10%, transparent)'};
  border: 1px solid ${({ $type }) => $type === 'success'
    ? 'color-mix(in srgb, var(--status-success, #10B981) 28%, transparent)'
    : 'color-mix(in srgb, var(--status-danger, #EF4444) 28%, transparent)'};
  border-radius: 8px;
  color: ${({ $type }) => $type === 'success'
    ? 'var(--status-success, #10B981)'
    : 'var(--status-danger, #EF4444)'};
  display: flex;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  gap: 8px;
  margin-bottom: 16px;
  padding: 10px 14px;
`;

export const EmptyIcon = styled(Image)`
  margin-bottom: 8px;
  opacity: 0.35;
`;

export const PlaceholderIcon = styled(Image)`
  opacity: 0.35;
`;
