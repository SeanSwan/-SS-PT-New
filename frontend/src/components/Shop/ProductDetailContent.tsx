import React, { useEffect, useMemo, useState } from 'react';
import { cssUrlValue, sanitizeImageUrl } from '../../utils/imageUrl';
import { formatStorePrice, hasStockAvailable, isPhysicalProduct } from '../../pages/shop/components/storeCatalog';
import type { ProductVariant, StoreItem } from '../../pages/shop/components/storeCatalog.types';
import { StyledBox } from '@/components/ui/StyledBox';
import {
  CartActions,
  FeaturesList,
  FeaturesTitle,
  ImageContainer,
  ImagePlaceholder,
  InfoContainer,
  InquiryButton,
  InventoryMessage,
  PriceDetail,
  PriceDetails,
  ProductContent,
  ProductDescription,
  ProductImage,
  ProductName,
  ProductPrice,
  PurchaseButton,
  PurchasePanel,
  QuantityButton,
  QuantityControl,
  QuantityDisplay,
  ThemeBadge,
  UnavailablePrice,
  VariantField,
} from './ProductDetail.styles';

export interface ProductDetailCartPayload {
  id: number;
  storefrontItemId: number;
  productVariantId?: number | null;
  name: string;
  quantity: number;
  price?: number;
}

interface ProductDetailContentProps {
  product: StoreItem;
  isAuthenticated: boolean;
  addingToCart: boolean;
  onAddToCart: (payload: ProductDetailCartPayload) => void;
  onRequestPricing: () => void;
  imageBackground?: string | null;
}

export const formatProductPrice = (value: number | null | undefined): string => (
  value === null || value === undefined || !Number.isFinite(value)
    ? 'Pricing unavailable'
    : formatStorePrice(value)
);

export const getSelectedVariant = (product: StoreItem, variantId: number | null): ProductVariant | null => (
  variantId === null ? null : product.variants.find((variant) => (
    variant.id === variantId
    && Number.isSafeInteger(variant.id)
    && variant.id > 0
    && variant.isActive
  )) || null
);

const parseFeatures = (value: string | null | undefined): string[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((feature): feature is string => typeof feature === 'string') : [];
  } catch {
    return [];
  }
};

const getPrice = (product: StoreItem, variant: ProductVariant | null): number | null => (
  variant?.price ?? product.displayPrice ?? null
);

const ProductDetailContent: React.FC<ProductDetailContentProps> = ({
  product,
  isAuthenticated,
  addingToCart,
  onAddToCart,
  onRequestPricing,
  imageBackground,
}) => {
  const activeVariants = useMemo(() => product.variants.filter((variant) => (
    variant.isActive && Number.isSafeInteger(variant.id) && variant.id > 0
  )), [product.variants]);
  const availableVariants = useMemo(() => activeVariants.filter((variant) => hasStockAvailable(variant.stockQuantity)), [activeVariants]);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(availableVariants[0]?.id ?? null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    setSelectedVariantId(availableVariants[0]?.id ?? null);
    setQuantity(1);
  }, [product.id, availableVariants]);

  const isPhysical = isPhysicalProduct(product);
  const selectedVariant = getSelectedVariant(product, selectedVariantId);
  const selectedPrice = isPhysical && product.variants.length > 0 && !selectedVariant
    ? null
    : getPrice(product, selectedVariant);
  const selectedStock = isPhysical && product.variants.length > 0 && !selectedVariant
    ? 0
    : selectedVariant?.stockQuantity ?? product.stockQuantity;
  const hasPrice = selectedPrice !== null && Number.isFinite(selectedPrice) && selectedPrice > 0;
  const hasStock = !isPhysical || hasStockAvailable(selectedStock);
  const features = parseFeatures(product.includedFeatures);
  const canPurchase = product.isActive
    && Number.isSafeInteger(product.id)
    && product.id > 0
    && hasPrice
    && hasStock
    && (!isPhysical || Boolean(selectedVariant))
    && (isPhysical || isAuthenticated);
  const maxQuantity = typeof selectedStock === 'number' && selectedStock > 0 ? selectedStock : Number.MAX_SAFE_INTEGER;
  const effectiveQuantity = Math.min(quantity, maxQuantity);
  const priceLabel = hasPrice ? formatProductPrice(selectedPrice) : 'Pricing unavailable';

  const handleAdd = () => {
    if (!canPurchase) return;
    onAddToCart({
      id: product.id,
      storefrontItemId: product.id,
      productVariantId: selectedVariant?.id ?? null,
      name: product.name,
      quantity: effectiveQuantity,
      ...(hasPrice ? { price: selectedPrice as number } : {}),
    });
  };

  return (
    <ProductContent>
      <ImageContainer>
        {(() => {
          const safeImage = imageBackground === undefined ? sanitizeImageUrl(product.imageUrl) : null;
          return safeImage
            ? <StyledBox as={ProductImage} $style={{ backgroundImage: `url(${cssUrlValue(safeImage)})` }} />
            : imageBackground
              ? <StyledBox as={ProductImage} $style={{ backgroundImage: imageBackground }} />
            : <ImagePlaceholder>No image available</ImagePlaceholder>;
        })()}
        <ThemeBadge>{product.theme || 'Store item'}</ThemeBadge>
      </ImageContainer>

      <InfoContainer>
        <ProductName>{product.name}</ProductName>
        <ProductPrice>
          {isPhysical || isAuthenticated ? priceLabel : <UnavailablePrice>Training pricing is by invitation</UnavailablePrice>}
        </ProductPrice>

        {isPhysical && activeVariants.length > 0 && (
          <VariantField>
            Variant
            <select
              aria-label="Product variant"
              value={selectedVariantId ?? ''}
              onChange={(event) => setSelectedVariantId(Number(event.target.value))}
              disabled={addingToCart}
            >
              {activeVariants.map((variant) => (
                <option key={variant.id} value={variant.id} disabled={!hasStockAvailable(variant.stockQuantity)}>
                  {variant.label}{hasStockAvailable(variant.stockQuantity) ? '' : ' — out of stock'}
                </option>
              ))}
            </select>
          </VariantField>
        )}

        {isPhysical && selectedVariant && selectedStock !== null && selectedStock !== undefined && (
          <InventoryMessage>{selectedStock > 0 ? `${selectedStock} available` : 'Out of stock'}</InventoryMessage>
        )}

        {!isPhysical && (product.packageType === 'fixed' || product.packageType === 'monthly') && (
          <PriceDetails>
            {product.packageType === 'fixed' && product.sessions !== null && product.sessions !== undefined && (
              <PriceDetail><span>Sessions</span><span>{product.sessions}</span></PriceDetail>
            )}
            {product.packageType === 'monthly' && product.months !== null && product.months !== undefined && (
              <PriceDetail><span>Duration</span><span>{product.months} months</span></PriceDetail>
            )}
            {product.packageType === 'monthly' && product.sessionsPerWeek !== null && product.sessionsPerWeek !== undefined && (
              <PriceDetail><span>Sessions per week</span><span>{product.sessionsPerWeek}</span></PriceDetail>
            )}
            {product.totalSessions !== null && product.totalSessions !== undefined && (
              <PriceDetail><span>Total sessions</span><span>{product.totalSessions}</span></PriceDetail>
            )}
            {product.pricePerSession !== null && product.pricePerSession !== undefined && (
              <PriceDetail><span>Price per session</span><span>{formatProductPrice(product.pricePerSession)}</span></PriceDetail>
            )}
          </PriceDetails>
        )}

        <PurchasePanel aria-label="Purchase options">
          {hasPrice && (isPhysical || isAuthenticated) && (
            <div aria-label="Selected item price"><strong>{priceLabel}</strong> <span>per item</span></div>
          )}
          {isPhysical && product.variants.length === 0 && <InventoryMessage role="status">Product options are temporarily unavailable.</InventoryMessage>}
          {isPhysical && product.variants.length > 0 && !hasStock && <InventoryMessage role="status">This variant is unavailable.</InventoryMessage>}
          {!isPhysical && (!isAuthenticated || !hasPrice) && <UnavailablePrice>Ask about this package and training price access.</UnavailablePrice>}
          {canPurchase ? (
            <CartActions>
              <QuantityControl aria-label="Quantity">
                <QuantityButton type="button" onClick={() => setQuantity(Math.max(1, effectiveQuantity - 1))} disabled={addingToCart || effectiveQuantity <= 1} aria-label="Decrease quantity">−</QuantityButton>
                <QuantityDisplay aria-live="polite">{effectiveQuantity}</QuantityDisplay>
                <QuantityButton type="button" onClick={() => setQuantity(Math.min(maxQuantity, effectiveQuantity + 1))} disabled={addingToCart || effectiveQuantity >= maxQuantity} aria-label="Increase quantity">+</QuantityButton>
              </QuantityControl>
              <PurchaseButton type="button" onClick={handleAdd} disabled={addingToCart}>
                {addingToCart ? 'Adding…' : isPhysical && !isAuthenticated ? 'Sign in to buy' : 'Add to cart'}
              </PurchaseButton>
            </CartActions>
          ) : (
            <InquiryButton type="button" onClick={onRequestPricing}>
              {isPhysical ? 'Ask about availability' : 'Ask about pricing'}
            </InquiryButton>
          )}
        </PurchasePanel>
        <ProductDescription>{product.description}</ProductDescription>
        {features.length > 0 && (
          <><FeaturesTitle>Included features</FeaturesTitle><FeaturesList>{features.map((feature) => <li key={feature}>{feature}</li>)}</FeaturesList></>
        )}

      </InfoContainer>
    </ProductContent>
  );
};

export default ProductDetailContent;
