import styled, { css, keyframes } from 'styled-components';
import { Image, Loader, Share2, ShoppingBag } from 'lucide-react';

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

export const Header = styled.div`
  align-items: center;
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
`;

export const HeaderIcon = styled(ShoppingBag)`
  color: var(--accent-primary, #60C0F0);
`;

export const Title = styled.h3`
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16px;
  font-weight: 700;
  margin: 0;
`;

export const Count = styled.span`
  color: color-mix(in srgb, var(--text-secondary, #B8C7D6) 70%, transparent);
  font-family: 'Fira Code', monospace;
  font-size: 12px;
`;

export const Grid = styled.div`
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
`;

export const Card = styled.div<{ $rarity: string }>`
  background: var(--bg-elevated, #141419);
  border: ${({ $rarity }) => RARITY_BORDERS[$rarity] || RARITY_BORDERS.common};
  border-radius: 12px;
  overflow: hidden;
  transition: transform 150ms ease;
  ${({ $rarity }) => $rarity === 'legendary' ? legendaryAnimation : ''}

  &:hover { transform: translateY(-2px); }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transition: none;
    &:hover { transform: none; }
  }
`;

export const CardImg = styled.div`
  align-items: center;
  aspect-ratio: 1;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 78%, transparent);
  display: flex;
  justify-content: center;
  width: 100%;

  img {
    height: 100%;
    object-fit: contain;
    width: 100%;
  }
`;

export const CardBody = styled.div`
  padding: 12px;
`;

export const CardName = styled.div`
  color: var(--text-primary, #E0ECF4);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const RarityTag = styled.span<{ $rarity: string }>`
  color: ${({ $rarity }) => RARITY_COLORS[$rarity] || RARITY_COLORS.common};
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
`;

export const ClaimBtn = styled.button`
  align-items: center;
  background: linear-gradient(135deg, var(--surface-primary, #002060), var(--accent-secondary, #8B5CF6));
  border: none;
  border-radius: 8px;
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  display: flex;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 600;
  gap: 6px;
  justify-content: center;
  margin-top: 8px;
  min-height: 44px;
  padding: 8px 12px;
  transition: opacity 150ms ease;
  width: 100%;

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
  padding: 60px 16px;
  text-align: center;
`;

export const EmptyIcon = styled(Share2)`
  margin-bottom: 8px;
  opacity: 0.35;
`;

export const EmptyHint = styled.div`
  font-size: 12px;
  margin-top: 4px;
  opacity: 0.72;
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

export const PlaceholderIcon = styled(Image)`
  opacity: 0.35;
`;
