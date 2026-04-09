/**
 * Styled components for SupplementsTab — category filter + product catalog.
 * Hero/gap/footer styles → SupplementsTab.styles.ts
 * Extracted to keep all files under 300 lines (CLAUDE.md rule).
 * All colors use var(--token, #fallback) pattern per CLAUDE.md rule 6.
 */
import styled from 'styled-components';
import { motion } from 'framer-motion';

export const MiniProductChip = styled.button`
  padding: 4px 10px;
  background: var(--accent-secondary-subtle, rgba(139, 92, 246, 0.12));
  border: 1px solid var(--accent-secondary-border-25, rgba(139, 92, 246, 0.25));
  border-radius: 12px;
  color: var(--accent-secondary, #8B5CF6);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  min-height: 44px;
  &:hover { background: var(--accent-secondary-light, rgba(139, 92, 246, 0.20)); }
  &:focus-visible { outline: 2px solid var(--accent-secondary, #8B5CF6); outline-offset: 2px; }
`;

export const CategoryRow = styled.div`
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: thin;
  &::-webkit-scrollbar { height: 3px; }
  &::-webkit-scrollbar-thumb { background: var(--border-soft, rgba(96, 192, 240, 0.12)); border-radius: 3px; }
`;

export const CatChip = styled(motion.button)<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid ${p => p.$active
    ? 'var(--accent-secondary, #8B5CF6)'
    : 'var(--border-soft, rgba(96, 192, 240, 0.12))'};
  background: ${p => p.$active
    ? 'var(--accent-secondary-subtle, rgba(139, 92, 246, 0.12))'
    : 'transparent'};
  color: ${p => p.$active
    ? 'var(--accent-secondary, #8B5CF6)'
    : 'var(--text-secondary, rgba(224, 236, 244, 0.6))'};
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  min-height: 44px;
  &:hover { color: var(--text-primary, #E0ECF4); }
  &:focus-visible { outline: 2px solid var(--accent-primary, #60C0F0); outline-offset: 2px; }
`;

export const ProductGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

export const ProductCard = styled(motion.div)`
  background: var(--bg-elevated-90, rgba(20, 20, 25, 0.90));
  border: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
  border-radius: 10px;
  padding: 14px;
  &:hover { border-color: var(--accent-primary-hover, rgba(96, 192, 240, 0.20)); }
`;

/**
 * Expand/collapse trigger — full-width button, no interactive content nested inside.
 * ShopLink (anchor) lives in ExpandedDetail sibling div, not inside this button.
 */
export const ProductHeader = styled.button`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  text-align: left;
  min-height: 44px;
  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
    border-radius: 4px;
  }
`;

export const ProductName = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
`;

export const PickBadge = styled.span`
  display: flex;
  align-items: center;
  color: var(--accent-gold, #C6A84B);
`;

export const ProductMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text-muted, rgba(224, 236, 244, 0.5));
`;

export const ProductPrice = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: var(--accent-gold, #C6A84B);
`;

export const ProductRating = styled.span`
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  color: var(--accent-gold, #C6A84B);
`;

export const ProductDesc = styled.p`
  font-size: 13px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  margin: 8px 0;
  line-height: 1.4;
`;

export const BadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

export const ProductBadge = styled.span`
  padding: 3px 8px;
  background: var(--accent-primary-subtle, rgba(96, 192, 240, 0.10));
  border: 1px solid var(--accent-primary-border, rgba(96, 192, 240, 0.20));
  border-radius: 10px;
  font-size: 10px;
  font-weight: 500;
  color: var(--accent-primary, #60C0F0);
`;

export const ExpandedDetail = styled(motion.div)`
  overflow: hidden;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-soft, rgba(96, 192, 240, 0.08));
`;

export const NasmBox = styled.div`
  padding: 10px;
  background: var(--accent-secondary-faint, rgba(139, 92, 246, 0.06));
  border-radius: 6px;
  margin-bottom: 10px;
`;

export const NasmLabel = styled.span`
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--accent-secondary, #8B5CF6);
  display: block;
  margin-bottom: 4px;
`;

export const NasmText = styled.p`
  font-size: 13px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.7));
  margin: 0;
  line-height: 1.4;
`;

export const ShopLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  background: var(--accent-secondary, #8B5CF6);
  color: var(--color-on-accent, #fff);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  min-height: 44px;
  transition: box-shadow 0.15s;
  &:hover { box-shadow: 0 0 16px var(--accent-primary-glow, rgba(96, 192, 240, 0.40)); }
`;

export const ComingSoon = styled.span`
  font-size: 12px;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  font-style: italic;
`;
