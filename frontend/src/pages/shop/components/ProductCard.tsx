/**
 * ProductCard - Physical storefront product card.
 *
 * Responsibilities:
 * - Render non-training storefront products from real catalog payloads.
 * - Keep variant selection, price visibility, stock, tax, and fulfillment states honest.
 * - Add selected, stocked variants to the shared cart through the live store pipeline.
 *
 * Accessibility:
 * - Variant controls stay keyboard reachable through ProductVariantPicker.
 * - Touch targets are 44px+ and overflow-safe on mobile, QHD, and 4K layouts.
 */
import React, { memo, useMemo, useState } from 'react';
import styled from 'styled-components';
import { sanitizeImageUrl, cssUrlValue } from '../../../utils/imageUrl';
import ProductVariantPicker from './ProductVariantPicker';
import { Action } from './ProductCard.styles';
import type { ProductVariant, StoreFulfillmentType, StoreItem } from './storeCatalog.types';
import { formatStorePrice, hasStockAvailable } from './storeCatalog';

interface ProductCardProps {
  product: StoreItem;
  canViewPrices: boolean;
  canPurchase?: boolean;
  isAdding?: boolean;
  onAddToCart?: (product: StoreItem, variant: ProductVariant | null) => void;
}

const Card = styled.article`
  min-height: 520px;
  border: 1px solid var(--border-elegant, rgba(96, 192, 240, 0.22));
  border-radius: 16px;
  background:
    linear-gradient(145deg, var(--surface-deep, rgba(0, 32, 96, 0.7)), var(--surface-card, rgba(10, 10, 15, 0.92)));
  box-shadow: var(--shadow-elevated, 0 20px 48px rgba(0, 0, 0, 0.32));
  color: var(--text-primary, #E0ECF4);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  min-width: 0;

  @media (max-width: 768px) {
    min-height: auto;
  }
`;

const Media = styled.div<{ $imageUrl?: string | null }>`
  min-height: 210px;
  background:
    linear-gradient(
      180deg,
      var(--media-overlay-start, rgba(0, 32, 96, 0.05)),
      var(--media-overlay-end, rgba(0, 32, 96, 0.88))
    ),
    ${({ $imageUrl }) => {
      const safe = $imageUrl ? sanitizeImageUrl($imageUrl) : null;
      return safe ? `url(${cssUrlValue(safe)})` : 'linear-gradient(135deg, var(--bg-secondary, #002060), var(--surface-card, #141419))';
    }};
  background-position: center;
  background-size: cover;
  position: relative;

  @media (max-width: 430px) {
    min-height: 180px;
  }
`;

const ProductBadge = styled.span`
  position: absolute;
  top: 1rem;
  right: 1rem;
  border: 1px solid var(--accent-primary-soft, rgba(96, 192, 240, 0.34));
  border-radius: 999px;
  background: var(--surface-glass, rgba(0, 48, 128, 0.56));
  color: var(--accent-primary, #60C0F0);
  font-family: var(--font-ui, "Sora", sans-serif);
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  max-width: min(70%, 12rem);
  overflow-wrap: anywhere;
  padding: 0.48rem 0.8rem;
  text-align: right;
  text-transform: uppercase;
`;

const Content = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
  padding: 1.35rem;

  @media (max-width: 430px) {
    padding: 1rem;
  }
`;

const Title = styled.h3`
  color: var(--text-heading, #E0ECF4);
  font-family: var(--font-drama, "Cormorant Garamond", Georgia, serif);
  font-size: clamp(1.55rem, 3vw, 2rem);
  line-height: 1.12;
  margin: 0;
  overflow-wrap: anywhere;
`;

const Description = styled.p`
  color: var(--text-secondary, rgba(224, 236, 244, 0.8));
  font-family: var(--font-body, "Plus Jakarta Sans", sans-serif);
  font-size: 0.94rem;
  line-height: 1.55;
  margin: 0;
  overflow-wrap: anywhere;
`;

const PricePanel = styled.div`
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.18));
  border-radius: 14px;
  background: var(--surface-elevated, rgba(0, 48, 128, 0.24));
  display: grid;
  gap: 0.25rem;
  min-width: 0;
  padding: 1rem;
`;

const PriceLabel = styled.span`
  color: var(--text-muted, rgba(224, 236, 244, 0.62));
  font-family: var(--font-ui, "Sora", sans-serif);
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const Price = styled.span`
  color: var(--text-primary, #E0ECF4);
  font-family: var(--font-data, "Fira Code", monospace);
  font-size: 1.45rem;
  font-weight: 800;
  overflow-wrap: anywhere;
`;

const NoticeStack = styled.div`
  display: grid;
  gap: 0.55rem;
`;

const Notice = styled.div`
  border-left: 3px solid var(--accent-gold, #C6A84B);
  border-radius: 10px;
  background: var(--surface-glass, rgba(0, 48, 128, 0.22));
  color: var(--text-secondary, rgba(224, 236, 244, 0.82));
  font-size: 0.85rem;
  line-height: 1.45;
  overflow-wrap: anywhere;
  padding: 0.72rem 0.85rem;
`;

const firstSelectableVariant = (variants: ProductVariant[]): ProductVariant | null => (
  variants.find((variant) => variant.isActive && hasStockAvailable(variant.stockQuantity))
  ?? variants[0]
  ?? null
);
const FULFILLMENT_COPY: Record<StoreFulfillmentType, string> = {
  local_delivery: 'Local delivery / pickup only for first release.',
  pickup: 'Pickup product.',
  dropship: 'Ships from partner supplier.',
  self_ship: 'Ships from SwanStudios inventory.',
  none: 'Digital or service fulfillment.',
};
const DEFAULT_PRODUCT_DESCRIPTION = 'Fresh SwanStudios product details are being prepared.';
const TAX_CHECKOUT_NOTICE = 'Taxable products show product sales tax in Stripe tax checkout.';
const productStatusMessage = (
  product: StoreItem,
  productHasStock: boolean,
  variantHasStock: boolean,
  selectedVariant: ProductVariant | null
): string => {
  if (!product.isActive) return 'Not available yet';
  if (!selectedVariant) return 'Variant details pending';
  if (!productHasStock || !variantHasStock) return 'Sold out';
  return 'Ready for cart';
};

const getSelectedVariant = (
  variants: ProductVariant[],
  selectedVariantId: number | null
): ProductVariant | null => (
  variants.find((variant) => variant.id === selectedVariantId) ?? firstSelectableVariant(variants)
);

const hasSelectedVariantStock = (
  selectedVariant: ProductVariant | null,
  variants: ProductVariant[]
): boolean => (
  selectedVariant ? hasStockAvailable(selectedVariant.stockQuantity) : variants.length === 0
);

const getPriceCopy = (canViewPrices: boolean, displayedPrice: number | null | undefined) => ({
  label: canViewPrices ? 'Selected Price' : 'Price Access',
  value: canViewPrices ? formatStorePrice(displayedPrice) : 'By invitation',
});

const getProductNotices = (product: StoreItem, productStatus: string): string[] => (
  [
    FULFILLMENT_COPY[product.fulfillmentType],
    product.isTaxable ? TAX_CHECKOUT_NOTICE : null,
    productStatus,
  ].filter(Boolean) as string[]
);

const getInitialVariantId = (variants: ProductVariant[]): number | null => (
  firstSelectableVariant(variants)?.id ?? null
);

const getVariantPickerId = (variant: ProductVariant | null): number | null => (
  variant?.id ?? null
);

const getDisplayedPrice = (
  selectedVariant: ProductVariant | null,
  parentPrice: number
): number => (
  selectedVariant?.price ?? parentPrice
);

const getProductDescription = (description: string): string => (
  description || DEFAULT_PRODUCT_DESCRIPTION
);

const getActionLabel = (
  canPurchase: boolean,
  isAdding: boolean,
  productStatus: string
): string => {
  if (!canPurchase) return 'Purchase by invitation';
  if (isAdding) return 'Adding...';
  if (productStatus !== 'Ready for cart') return productStatus;
  return 'Add Product';
};

const ProductCard: React.FC<ProductCardProps> = memo(({
  product,
  canViewPrices,
  canPurchase = false,
  isAdding = false,
  onAddToCart,
}) => {
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(
    () => getInitialVariantId(product.variants)
  );

  const selectedVariant = useMemo(
    () => getSelectedVariant(product.variants, selectedVariantId),
    [product.variants, selectedVariantId]
  );

  const displayedPrice = getDisplayedPrice(selectedVariant, product.displayPrice);
  const productHasStock = hasStockAvailable(product.stockQuantity);
  const variantHasStock = hasSelectedVariantStock(selectedVariant, product.variants);
  const productStatus = productStatusMessage(product, productHasStock, variantHasStock, selectedVariant);
  const priceCopy = getPriceCopy(canViewPrices, displayedPrice);
  const productNotices = getProductNotices(product, productStatus);
  const pickerVariantId = getVariantPickerId(selectedVariant);
  const productDescription = getProductDescription(product.description);
  const canAddProduct = canPurchase
    && !isAdding
    && productStatus === 'Ready for cart'
    && Boolean(selectedVariant);
  const actionLabel = getActionLabel(canPurchase, isAdding, productStatus);

  const handleAddProduct = () => {
    if (!canAddProduct) return;
    onAddToCart?.(product, selectedVariant);
  };

  return (
    <Card aria-label={`${product.name} product card`}>
      <Media $imageUrl={product.imageUrl}>
        <ProductBadge>Product</ProductBadge>
      </Media>
      <Content>
        <Title>{product.name}</Title>
        <Description>{productDescription}</Description>
        <ProductVariantPicker
          variants={product.variants}
          selectedVariantId={pickerVariantId}
          parentPrice={product.displayPrice}
          canViewPrices={canViewPrices}
          onSelect={(variant) => setSelectedVariantId(variant.id)}
        />
        <PricePanel aria-live="polite">
          <PriceLabel>{priceCopy.label}</PriceLabel>
          <Price>{priceCopy.value}</Price>
        </PricePanel>
        <NoticeStack>
          {productNotices.map((notice) => (
            <Notice key={notice}>{notice}</Notice>
          ))}
        </NoticeStack>
        <Action
          type="button"
          $active={canAddProduct}
          disabled={!canAddProduct}
          aria-disabled={!canAddProduct}
          aria-busy={isAdding}
          onClick={handleAddProduct}
        >
          {actionLabel}
        </Action>
      </Content>
    </Card>
  );
});

ProductCard.displayName = 'ProductCard';

export default ProductCard;
