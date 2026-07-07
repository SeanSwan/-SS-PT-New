/**
 * ProductVariantPicker - Accessible product variant selector.
 *
 * Responsibilities:
 * - Show real product variants sorted by the shared catalog mapper.
 * - Hide variant prices from visitors without price access.
 * - Preserve 44px+ touch targets and overflow-safe copy on small phones.
 */
import React from 'react';
import styled from 'styled-components';
import type { ProductVariant } from './storeCatalog.types';
import { formatStorePrice, hasStockAvailable } from './storeCatalog';

interface ProductVariantPickerProps {
  variants: ProductVariant[];
  selectedVariantId: number | null;
  parentPrice: number;
  canViewPrices: boolean;
  onSelect: (variant: ProductVariant) => void;
}

const PickerWrap = styled.div`
  display: grid;
  gap: 0.65rem;
`;

const PickerLabel = styled.div`
  color: var(--text-secondary, rgba(224, 236, 244, 0.78));
  font-family: var(--font-ui, "Sora", sans-serif);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const VariantGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
  min-width: 0;

  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

const VariantButton = styled.button<{ $selected: boolean }>`
  min-height: 56px;
  width: 100%;
  border: 1px solid ${({ $selected }) =>
    $selected
      ? 'var(--accent-primary, #60C0F0)'
      : 'var(--border-subtle, rgba(96, 192, 240, 0.22))'};
  border-radius: 12px;
  background: ${({ $selected }) =>
    $selected
      ? 'var(--surface-selected, rgba(96, 192, 240, 0.16))'
      : 'var(--surface-elevated, rgba(0, 48, 128, 0.24))'};
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;
  display: grid;
  gap: 0.25rem;
  min-width: 0;
  padding: 0.7rem 0.85rem;
  text-align: left;
  transition: border-color 180ms ease, background 180ms ease, transform 180ms ease;

  &:hover:not(:disabled) {
    transform: translateY(-1px);
    border-color: var(--accent-secondary, #8B5CF6);
  }

  &:focus-visible {
    outline: 2px solid var(--focus-ring, #8B5CF6);
    outline-offset: 3px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.58;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover:not(:disabled) {
      transform: none;
    }
  }
`;

const VariantName = styled.span`
  font-family: var(--font-ui, "Sora", sans-serif);
  font-size: 0.92rem;
  font-weight: 700;
  line-height: 1.25;
  overflow-wrap: anywhere;
`;

const VariantMeta = styled.span`
  color: var(--text-muted, rgba(224, 236, 244, 0.64));
  font-family: var(--font-data, "Fira Code", monospace);
  font-size: 0.74rem;
  line-height: 1.35;
  overflow-wrap: anywhere;
`;

const EmptyVariants = styled.div`
  min-height: 48px;
  border: 1px dashed var(--border-subtle, rgba(96, 192, 240, 0.26));
  border-radius: 12px;
  color: var(--text-secondary, rgba(224, 236, 244, 0.78));
  display: flex;
  align-items: center;
  padding: 0.85rem;
`;

const variantPrice = (variant: ProductVariant, parentPrice: number) => (
  variant.price ?? parentPrice
);

const stockLabel = (variant: ProductVariant): string => {
  if (!variant.isActive) return 'Unavailable';
  if (variant.stockQuantity === 0) return 'Sold out';
  if (typeof variant.stockQuantity === 'number') return `${variant.stockQuantity} left`;
  return 'Made fresh';
};

const ProductVariantPicker: React.FC<ProductVariantPickerProps> = ({
  variants,
  selectedVariantId,
  parentPrice,
  canViewPrices,
  onSelect,
}) => {
  if (!variants.length) {
    return (
      <PickerWrap>
        <PickerLabel>Variants</PickerLabel>
        <EmptyVariants>Variant details are pending.</EmptyVariants>
      </PickerWrap>
    );
  }

  return (
    <PickerWrap>
      <PickerLabel>Choose Variant</PickerLabel>
      <VariantGrid role="radiogroup" aria-label="Product variants">
        {variants.map((variant) => {
          const disabled = !variant.isActive || !hasStockAvailable(variant.stockQuantity);
          const selected = selectedVariantId === variant.id;

          return (
            <VariantButton
              key={variant.id}
              type="button"
              role="radio"
              aria-checked={selected}
              $selected={selected}
              disabled={disabled}
              onClick={() => onSelect(variant)}
            >
              <VariantName>{variant.label}</VariantName>
              <VariantMeta>
                {canViewPrices ? formatStorePrice(variantPrice(variant, parentPrice)) : 'By invitation'} - {stockLabel(variant)}
              </VariantMeta>
            </VariantButton>
          );
        })}
      </VariantGrid>
    </PickerWrap>
  );
};

export default ProductVariantPicker;
