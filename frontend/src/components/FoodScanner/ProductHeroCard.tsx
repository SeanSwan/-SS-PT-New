import React from 'react';
import { PackageSearch, ShieldCheck } from 'lucide-react';
import type { FoodProduct } from './productAnalysis.types';
import { foodScannerRatingLabel, ratingTone, sourceConfidenceForProduct } from './productAnalysis.logic';
import { Chip, HeaderGrid, MetaRow, ProductImage, ProductMeta, ProductTitle } from './ProductAnalysis.styles';
import { StyledBox } from '@/components/ui/StyledBox';

interface ProductHeroCardProps {
  product: FoodProduct;
}

const ProductHeroCard: React.FC<ProductHeroCardProps> = ({ product }) => {
  const tone = ratingTone(product.overallRating);
  const source = sourceConfidenceForProduct(product);

  return (
    <HeaderGrid $tone={tone}>
      <ProductImage $imageUrl={product.imageUrl} aria-label={`${product.name} image`}>
        {!product.imageUrl && <PackageSearch size={30} aria-hidden="true" />}
      </ProductImage>
      <div>
        <ProductTitle>{product.name}</ProductTitle>
        <ProductMeta>{product.brand || 'Brand not listed'}</ProductMeta>
        <MetaRow>
          <Chip $tone={tone}><ShieldCheck size={14} />Swan Score: {foodScannerRatingLabel(product.overallRating)}</Chip>
          <Chip>Source: {source.provider}</Chip>
          <Chip>Confidence: {source.confidence}</Chip>
          {product.lastVerified && <Chip>Verified: {new Date(product.lastVerified).toLocaleDateString()}</Chip>}
        </MetaRow>
        <StyledBox as={ProductMeta} $style={{ marginTop: '0.55rem' }}>{source.detail}</StyledBox>
      </div>
    </HeaderGrid>
  );
};

export default ProductHeroCard;
