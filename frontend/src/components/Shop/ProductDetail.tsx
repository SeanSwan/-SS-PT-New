import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../hooks/use-toast';
import { mapStorefrontItemToStoreItem } from '../../pages/shop/components/storeCatalog';
import type { StoreItem } from '../../pages/shop/components/storeCatalog.types';
import ProductDetailContent from './ProductDetailContent';
import PricingInquiryModal from '../../pages/shop/components/PricingInquiryModal';
import { sanitizeImageUrl, cssUrlValue } from '../../utils/imageUrl';
import {
  BackButton,
  ErrorMessage,
  LoadingSpinner,
  ProductDetailContainer,
  ProductDetailViewport,
} from './ProductDetail.styles';
import type { ProductDetailCartPayload } from './ProductDetailContent';

const getProductImageBackground = (product: StoreItem): string | null => {
  const safeImg = sanitizeImageUrl(product.imageUrl);
  return safeImg ? `url(${cssUrlValue(safeImg)})` : null;
};

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { authAxios, isAuthenticated, user } = useAuth();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [product, setProduct] = useState<StoreItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState(false);
  const [showPricingInquiry, setShowPricingInquiry] = useState(false);
  const [loadedIdentity, setLoadedIdentity] = useState<string | null>(null);
  const requestGeneration = useRef(0);
  const addGeneration = useRef(0);
  const [retryKey, setRetryKey] = useState(0);
  const prefersReducedMotion = useReducedMotion();
  const identity = `${id}:${isAuthenticated ? `user:${user?.id ?? 'unknown'}` : 'guest'}`;
  const latestIdentity = useRef(identity);
  latestIdentity.current = identity;

  useEffect(() => {
    const generation = ++requestGeneration.current;
    let mounted = true;
    const requestIdentity = identity;

    if (!id) {
      setProduct(null);
      setError('Product not found');
      setLoading(false);
      return () => { mounted = false; };
    }

    setProduct(null);
    setShowPricingInquiry(false);
    setLoadedIdentity(null);
    setLoading(true);
    setError(null);

    const fetchProduct = async () => {
      try {
        const client = isAuthenticated ? authAxios : axios;
        const response = await client.get(`/api/storefront/${encodeURIComponent(id)}`);
        if (!mounted || generation !== requestGeneration.current || latestIdentity.current !== requestIdentity) return;

        if (response.data?.success && response.data.item) {
          setProduct(mapStorefrontItemToStoreItem(response.data.item));
          setLoadedIdentity(requestIdentity);
        } else {
          setError('We could not load this product. Please try again.');
        }
      } catch {
        if (!mounted || generation !== requestGeneration.current || latestIdentity.current !== requestIdentity) return;
        setError('We could not load this product. Please try again.');
      } finally {
        if (mounted && generation === requestGeneration.current && latestIdentity.current === requestIdentity) {
          setLoading(false);
        }
      }
    };

    void fetchProduct();
    return () => {
      mounted = false;
      requestGeneration.current += 1;
    };
  }, [authAxios, id, identity, isAuthenticated, retryKey]);

  const handleAddToCart = useCallback(async (payload: ProductDetailCartPayload) => {
    if (!isAuthenticated) {
      const returnUrl = `${window.location.pathname}${window.location.search}`;
      navigate(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
      return;
    }

    if (addGeneration.current !== 0) return;
    addGeneration.current = 1;

    setAddingToCart(true);
    try {
      await addToCart(payload);
      toast({ title: 'Added to cart', description: `${payload.name || 'Item'} is ready for checkout.` });
    } catch (caught: unknown) {
      toast({
        title: 'Unable to add item',
        description: 'We could not confirm that addition. Review your cart before trying again.',
        variant: 'destructive',
      });
    } finally {
      addGeneration.current = 0;
      setAddingToCart(false);
    }
  }, [addToCart, isAuthenticated, navigate, toast]);

  const handlePricingRequest = useCallback(() => {
    if (!product) return;
    if (product.itemKind === 'physical_product') navigate(`/contact?subject=${encodeURIComponent(`Availability for ${product.name}`)}`);
    else setShowPricingInquiry(true);
  }, [navigate, product]);

  const handleBack = useCallback(() => navigate('/shop'), [navigate]);

  if (loading) {
    return (
      <ProductDetailContainer aria-busy="true">
        <LoadingSpinner aria-label="Loading product details" />
      </ProductDetailContainer>
    );
  }

  if (error || !product || loadedIdentity !== identity) {
    return (
      <ProductDetailContainer>
        <BackButton type="button" onClick={handleBack}>← Back to Shop</BackButton>
        {error ? <><ErrorMessage role="alert">{error}</ErrorMessage><BackButton type="button" onClick={() => setRetryKey(value => value + 1)}>Retry product details</BackButton></> : <LoadingSpinner aria-label="Loading product details" />}
      </ProductDetailContainer>
    );
  }

  return (
    <AnimatePresence>
      <motion.div initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }} animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}>
        <ProductDetailContainer data-product-detail>
          <ProductDetailViewport />
          <BackButton type="button" onClick={handleBack}>← Back to Shop</BackButton>
          <ProductDetailContent
            product={product}
            isAuthenticated={isAuthenticated}
            addingToCart={addingToCart}
            onAddToCart={handleAddToCart}
            onRequestPricing={handlePricingRequest}
            imageBackground={getProductImageBackground(product)}
          />
          {showPricingInquiry && createPortal(
            <PricingInquiryModal package={product} prefillName={[user?.firstName, user?.lastName].filter(Boolean).join(' ')} prefillEmail={user?.email ?? ''} onClose={() => setShowPricingInquiry(false)} />,
            document.body,
          )}
        </ProductDetailContainer>
      </motion.div>
    </AnimatePresence>
  );
};

export default ProductDetail;
