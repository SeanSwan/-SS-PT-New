import styled, { css, keyframes } from 'styled-components';
import { Loader } from 'lucide-react';

const RARITY_COLORS: Record<string, string> = {
  common: 'var(--swan-lavender, #4070C0)',
  rare: 'var(--accent-gold, #C6A84B)',
  epic: 'var(--accent-secondary, #8B5CF6)',
  legendary: 'var(--accent-primary, #60C0F0)',
};

const legendaryGlow = keyframes`
  0% { box-shadow: 0 0 6px color-mix(in srgb, var(--accent-gold, #C6A84B) 34%, transparent); }
  33% { box-shadow: 0 0 6px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 34%, transparent); }
  66% { box-shadow: 0 0 6px color-mix(in srgb, var(--accent-primary, #60C0F0) 34%, transparent); }
  100% { box-shadow: 0 0 6px color-mix(in srgb, var(--accent-gold, #C6A84B) 34%, transparent); }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

export const Panel = styled.div`padding: 0;`;

export const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 8px;
`;

export const Title = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const CrystalBadge = styled.div`
  padding: 6px 14px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
  font-family: 'Fira Code', monospace;
  font-size: 13px;
  color: var(--accent-primary, #60C0F0);
  display: flex;
  align-items: center;
  gap: 6px;
`;

export const FilterRow = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`;

export const FilterBtn = styled.button<{ $active: boolean }>`
  min-height: 44px;
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid ${({ $active }) => $active
    ? 'var(--accent-primary, #60C0F0)'
    : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent)'};
  background: ${({ $active }) => $active
    ? 'color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent)'
    : 'transparent'};
  color: ${({ $active }) => $active ? 'var(--accent-primary, #60C0F0)' : 'var(--text-secondary, #B8C7D6)'};
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  &:hover { border-color: var(--accent-primary, #60C0F0); }
`;

export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 14px;
`;

export const ItemCard = styled.div<{ $rarity: string; $owned: boolean }>`
  padding: 16px;
  border-radius: 12px;
  background: var(--bg-elevated, #141419);
  border: 2px solid ${({ $rarity }) => `color-mix(in srgb, ${RARITY_COLORS[$rarity] || RARITY_COLORS.common} 32%, transparent)`};
  ${({ $rarity }) => $rarity === 'legendary' ? css`
    animation: ${legendaryGlow} 3s ease-in-out infinite;
  ` : ''}
  opacity: ${({ $owned }) => $owned ? 0.7 : 1};
  transition: transform 0.15s;
  &:hover { transform: translateY(-2px); }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transition: none;
    &:hover { transform: none; }
  }
`;

export const ItemName = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin-bottom: 4px;
`;

export const ItemMeta = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
`;

export const RarityTag = styled.span<{ $rarity: string }>`
  color: ${({ $rarity }) => RARITY_COLORS[$rarity] || RARITY_COLORS.common};
  text-transform: uppercase;
  font-weight: 700;
`;

export const PriceTag = styled.span`
  color: var(--accent-primary, #60C0F0);
  display: flex;
  align-items: center;
  gap: 3px;
`;

export const BuyBtn = styled.button<{ $owned: boolean }>`
  min-height: 44px;
  width: 100%;
  border: none;
  border-radius: 8px;
  background: ${({ $owned }) => $owned
    ? 'color-mix(in srgb, var(--status-success, #10B981) 12%, transparent)'
    : 'linear-gradient(135deg, var(--surface-primary, #002060), var(--accent-secondary, #8B5CF6))'};
  color: ${({ $owned }) => $owned ? 'var(--status-success, #10B981)' : 'var(--text-primary, #E0ECF4)'};
  ${({ $owned }) => $owned ? 'border: 1px solid color-mix(in srgb, var(--status-success, #10B981) 24%, transparent);' : ''}
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: ${({ $owned }) => $owned ? 'default' : 'pointer'};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  &:disabled { opacity: 0.4; cursor: not-allowed; }
  &:hover:not(:disabled) { opacity: 0.85; }
`;

export const StatusMsg = styled.div<{ $type: 'success' | 'error' }>`
  padding: 10px 14px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: ${({ $type }) => $type === 'success'
    ? 'color-mix(in srgb, var(--status-success, #10B981) 10%, transparent)'
    : 'color-mix(in srgb, var(--status-danger, #EF4444) 10%, transparent)'};
  border: 1px solid ${({ $type }) => $type === 'success'
    ? 'color-mix(in srgb, var(--status-success, #10B981) 28%, transparent)'
    : 'color-mix(in srgb, var(--status-danger, #EF4444) 28%, transparent)'};
  color: ${({ $type }) => $type === 'success' ? 'var(--status-success, #10B981)' : 'var(--status-danger, #EF4444)'};
`;

export const LoadingState = styled.div`
  align-items: center;
  color: var(--text-secondary, #B8C7D6);
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
