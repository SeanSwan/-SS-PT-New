import React, { memo, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { formatStorePrice, hasStockAvailable } from './storeCatalog';
import type { ProductVariant, StoreFulfillmentType, StoreItem } from './storeCatalog.types';
import { Action } from './ProductCard.styles';
import ProductVariantPicker from './ProductVariantPicker';
import { cssUrlValue, sanitizeImageUrl } from '../../../utils/imageUrl';

interface ProductCardProps {
  product: StoreItem;
  canViewPrices: boolean;
  canPurchase?: boolean;
  isAdding?: boolean;
  isCartBusy?: boolean;
  onAddToCart?: (product: StoreItem, variant: ProductVariant | null) => void;
}

const Card = styled.article`
  display: flex; flex-direction: column; min-width: 0; min-height: 100%; overflow: hidden;
  border: 1px solid rgba(96, 192, 240, 0.22); border-radius: 1.2rem;
  background: linear-gradient(145deg, rgba(0, 32, 96, 0.76), rgba(10, 10, 15, 0.94));
  box-shadow: 0 1.5rem 3rem rgba(0, 0, 0, 0.3); color: var(--text-primary, #e0ecf4);
  &:focus-within { border-color: var(--accent-primary, #60c0f0); box-shadow: 0 0 0 3px rgba(96, 192, 240, 0.18), 0 1.5rem 3rem rgba(0, 0, 0, 0.3); }
`;
const Media = styled.div<{ $imageUrl?: string | null }>`
  min-height: 12rem; background: linear-gradient(180deg, rgba(0, 32, 96, 0.08), rgba(0, 32, 96, 0.92)),
    ${({ $imageUrl }) => $imageUrl ? `url(${$imageUrl}) center / cover` : 'radial-gradient(circle at 70% 20%, rgba(198,168,75,.42), transparent 40%), linear-gradient(135deg, var(--accent-primary, #061c50), var(--bg-surface, #17132c))'};
  @media (max-width: 430px) { min-height: 10rem; }
`;
const Content = styled.div`display: flex; flex: 1; flex-direction: column; gap: 0.85rem; min-width: 0; padding: 1.35rem;`;
const ProductTitle = styled.h3`color: var(--text-heading, #e0ecf4); font-family: var(--font-drama, "Cormorant Garamond", Georgia, serif); font-size: clamp(1.5rem, 3vw, 2rem); line-height: 1.12; margin: 0; overflow-wrap: anywhere;`;
const Description = styled.p`color: var(--text-secondary, rgba(224,236,244,.8)); font-size: .94rem; line-height: 1.55; margin: 0; overflow-wrap: anywhere;`;
const Panel = styled.div`display: grid; gap: .2rem; min-height: 4.7rem; padding: .9rem; border: 1px solid rgba(96,192,240,.18); border-radius: .8rem; background: rgba(0,48,128,.2);`;
const Label = styled.span`color: var(--text-muted, rgba(224,236,244,.64)); font-size: .72rem; font-weight: 800; letter-spacing: .1em; text-transform: uppercase;`;
const Price = styled.span`color: var(--text-heading, #E0ECF4); font-family: var(--font-data, "Fira Code", monospace); font-size: 1.35rem; font-weight: 800; overflow-wrap: anywhere;`;
const Notice = styled.div`display: grid; gap: .4rem; color: var(--text-secondary, rgba(224,236,244,.8)); font-size: .82rem; line-height: 1.42;`;
const ProductBadge = styled.span`align-self: start; margin: 1rem 1rem 0; padding: .4rem .7rem; border: 1px solid rgba(198,168,75,.38); border-radius: 999px; color: var(--accent-gold, #c6a84b); font-size: .7rem; font-weight: 800; letter-spacing: .1em; text-transform: uppercase;`;

const FULFILLMENT_COPY: Record<StoreFulfillmentType, string> = {
  local_delivery: 'Local delivery or pickup.',
  pickup: 'Pickup product.',
  dropship: 'Ships from partner supplier.',
  self_ship: 'Ships from SwanStudios inventory.',
  none: 'Fulfillment details are being prepared.',
};
const firstVariant = (variants: ProductVariant[]): ProductVariant | null => (
  variants.find((variant) => Number.isInteger(variant.id) && variant.id > 0 && variant.isActive && hasStockAvailable(variant.stockQuantity))
    ?? variants.find((variant) => Number.isInteger(variant.id) && variant.id > 0 && variant.isActive)
    ?? variants.find((variant) => Number.isInteger(variant.id) && variant.id > 0) ?? null
);
const selectedPrice = (product: StoreItem, variant: ProductVariant | null): number | null => variant?.price ?? product.displayPrice;

const ProductCard: React.FC<ProductCardProps> = memo(({ product, canPurchase = false, isAdding = false, isCartBusy = false, onAddToCart }) => {
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(() => firstVariant(product.variants)?.id ?? null);
  const pickerVariants = useMemo(
    () => product.variants.map((variant) => (
      Number.isInteger(variant.id) && variant.id > 0
        ? variant
        : { ...variant, isActive: false }
    )),
    [product.variants],
  );
  useEffect(() => {
    if (!product.variants.some((variant) => variant.id === selectedVariantId)) setSelectedVariantId(firstVariant(product.variants)?.id ?? null);
  }, [product.variants, selectedVariantId]);
  const selectedVariant = useMemo(
    () => product.variants.find((variant) => variant.id === selectedVariantId) ?? firstVariant(product.variants),
    [product.variants, selectedVariantId]
  );
  const price = selectedPrice(product, selectedVariant);
  const availableStock = selectedVariant?.stockQuantity ?? product.stockQuantity;
  const variantInStock = product.variants.length > 0
    ? Boolean(selectedVariant && Number.isInteger(selectedVariant.id) && selectedVariant.id > 0 && selectedVariant.isActive && hasStockAvailable(availableStock))
    : false;
  const hasPrice = price != null;
  const ready = Number.isSafeInteger(product.id) && product.id > 0 && product.isActive && variantInStock && hasPrice;
  const safeImageUrl = sanitizeImageUrl(product.imageUrl);
  const imageCssValue = safeImageUrl ? cssUrlValue(safeImageUrl) : null;
  const returnUrl = typeof window !== 'undefined'
    ? `${window.location.pathname}${window.location.search}${window.location.hash}`
    : '/store';
  const loginHref = `/login?returnUrl=${encodeURIComponent(returnUrl)}`;
  const actionLabel = isAdding ? 'Adding…' : product.variants.length === 0 ? 'Options unavailable' : !canPurchase && ready ? 'Sign in to purchase' : !hasPrice ? 'Price unavailable' : !product.isActive || !variantInStock ? 'Sold out' : 'Add Product';

  return (
    <Card aria-label={`${product.name} product card`}>
      <ProductBadge>Recovery product</ProductBadge>
      <Media $imageUrl={imageCssValue} aria-hidden="true" />
      <Content>
        <ProductTitle>{product.name}</ProductTitle>
        <Description>{product.description || 'Product details are being prepared.'}</Description>
        {product.variants.length > 0 && (
          <ProductVariantPicker
            variants={pickerVariants}
            selectedVariantId={selectedVariant?.id ?? null}
            parentPrice={product.displayPrice}
            canViewPrices
            onSelect={(variant) => {
              if (Number.isInteger(variant.id) && variant.id > 0) setSelectedVariantId(variant.id);
            }}
          />
        )}
        <Panel aria-live="polite"><Label>Public price</Label><Price>{formatStorePrice(price)}</Price></Panel>
        <Notice><span>{FULFILLMENT_COPY[product.fulfillmentType]}</span>{product.isTaxable && <span>Applicable tax is calculated at checkout.</span>}<span>{!product.isActive ? 'Not available yet' : product.variants.length === 0 ? 'Choose an option when available' : !variantInStock ? 'Sold out' : !hasPrice ? 'Price unavailable' : 'Ready for cart'}</span></Notice>
        {!canPurchase && ready && !isAdding ? (
          <Action as="a" href={loginHref} $active aria-label={actionLabel}>{actionLabel}</Action>
        ) : (
          <Action type="button" $active={ready && canPurchase && !isAdding && !isCartBusy} disabled={!ready || !canPurchase || isAdding || isCartBusy} aria-disabled={!ready || !canPurchase || isCartBusy} aria-busy={isAdding} onClick={() => ready && canPurchase && !isCartBusy && onAddToCart?.(product, selectedVariant)}>{actionLabel}</Action>
        )}
      </Content>
    </Card>
  );
});

ProductCard.displayName = 'ProductCard';
export default ProductCard;
