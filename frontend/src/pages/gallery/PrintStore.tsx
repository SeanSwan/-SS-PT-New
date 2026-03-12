/**
 * PrintStore — Print-on-Demand product selection for gallery photos
 * Crystalline Swan palette · 3D tilt product cards · VaultDrawer checkout
 * Lazy-loaded to keep main bundle small (per AI Village Performance guidance)
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { VaultDrawer } from '../../components/ui/crystalline-primitives/VaultDrawer';
import { GildedButton } from '../../components/ui/crystalline-primitives/GildedButton';
import { CrystallineSkeleton } from '../../components/ui/crystalline-primitives/CrystallineSkeleton';

// ── Types ──
interface PrintSize { size: string; price: number; }
interface PrintProduct { type: string; label: string; sizes: PrintSize[]; }

interface PrintStoreProps {
  photoId: number;
  photoUrl: string;
  photoName: string;
  galleryToken: string;
  onClose: () => void;
}

// ── Product Icons ──
const PRODUCT_ICONS: Record<string, string> = {
  print: '🖼️',
  canvas: '🎨',
  metal: '✨',
  poster: '📐',
  photobook: '📖',
};

// ── 3D Tilt Card ──
const tiltShine = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

const CardWrapper = styled(motion.div)<{ $selected: boolean }>`
  position: relative;
  background: ${p => p.$selected ? 'rgba(198, 168, 75, 0.15)' : 'rgba(0, 48, 128, 0.6)'};
  border: 1px solid ${p => p.$selected ? 'rgba(198, 168, 75, 0.5)' : 'rgba(96, 192, 240, 0.15)'};
  border-radius: 16px;
  padding: 20px;
  cursor: pointer;
  transition: border-color 0.3s, background 0.3s;
  transform-style: preserve-3d;
  will-change: transform;

  &:hover {
    border-color: ${p => p.$selected ? 'rgba(198, 168, 75, 0.7)' : 'rgba(96, 192, 240, 0.4)'};
  }

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 16px;
    background: linear-gradient(90deg, transparent 0%, rgba(224, 236, 244, 0.03) 50%, transparent 100%);
    background-size: 200% 100%;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s;
  }

  &:hover::after {
    opacity: 1;
    animation: ${tiltShine} 1.5s ease-in-out;
  }
`;

const CardIcon = styled.span`
  font-size: 2rem;
  display: block;
  margin-bottom: 8px;
`;

const CardTitle = styled.h4`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1rem;
  font-weight: 600;
  color: #E0ECF4;
  margin: 0 0 4px;
`;

const CardPrice = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.875rem;
  color: #C6A84B;
`;

const ProductGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 24px;

  @media (max-width: 430px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
`;

const SizeSelector = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 24px;
`;

const SizeChip = styled.button<{ $selected: boolean }>`
  padding: 8px 16px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid ${p => p.$selected ? '#C6A84B' : 'rgba(96, 192, 240, 0.2)'};
  background: ${p => p.$selected ? 'rgba(198, 168, 75, 0.2)' : 'rgba(0, 48, 128, 0.4)'};
  color: ${p => p.$selected ? '#C6A84B' : '#E0ECF4'};
  font-family: 'Fira Code', monospace;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: ${p => p.$selected ? '#C6A84B' : 'rgba(96, 192, 240, 0.4)'};
  }

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 2px;
  }
`;

const PhotoPreview = styled.div`
  width: 100%;
  max-width: 300px;
  margin: 0 auto 24px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(198, 168, 75, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);

  img {
    width: 100%;
    height: auto;
    display: block;
  }
`;

const SectionLabel = styled.h3`
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: 1.25rem;
  color: #60C0F0;
  margin: 0 0 12px;
`;

const TotalLine = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-top: 1px solid rgba(96, 192, 240, 0.15);
  margin-bottom: 16px;

  .label {
    font-family: 'Sora', sans-serif;
    font-size: 1rem;
    color: rgba(224, 236, 244, 0.7);
  }

  .price {
    font-family: 'Fira Code', monospace;
    font-size: 1.5rem;
    font-weight: 600;
    color: #C6A84B;
  }
`;

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

const PrintStore: React.FC<PrintStoreProps> = ({ photoId, photoUrl, photoName, galleryToken, onClose }) => {
  const [products, setProducts] = useState<PrintProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<PrintProduct | null>(null);
  const [selectedSize, setSelectedSize] = useState<PrintSize | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Fetch products on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/gallery/print-products`)
      .then(r => r.json())
      .then(data => {
        if (data.success) setProducts(data.products);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // 3D tilt handler (throttled via rAF per AI Village guidance)
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const rafRef = useRef<number>(0);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>, type: string) => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const card = cardRefs.current.get(type);
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(1000px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`;
    });
  }, []);

  const handleMouseLeave = useCallback((type: string) => {
    const card = cardRefs.current.get(type);
    if (card) card.style.transform = 'perspective(1000px) rotateY(0) rotateX(0)';
  }, []);

  const handleCheckout = async () => {
    if (!selectedProduct || !selectedSize) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/gallery/print-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${galleryToken}`,
        },
        body: JSON.stringify({
          photoId,
          productType: selectedProduct.type,
          size: selectedSize.size,
          quantity,
        }),
      });
      const data = await res.json();
      if (data.success && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert(data.error || 'Failed to create order');
      }
    } catch {
      alert('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const total = selectedSize ? (selectedSize.price * quantity).toFixed(2) : '0.00';

  return (
    <VaultDrawer
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div style={{ position: 'relative' }}>
        <button
          onClick={onClose}
          aria-label="Close print store"
          style={{
            position: 'absolute', top: -8, right: -8,
            width: 44, height: 44, border: '1px solid rgba(224,236,244,0.15)',
            borderRadius: '50%', background: 'transparent', color: '#E0ECF4',
            fontSize: '1.25rem', cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}
        >✕</button>

        <SectionLabel>Print Your Moment</SectionLabel>
        <p style={{ color: 'rgba(224,236,244,0.6)', fontFamily: 'Sora, sans-serif', fontSize: '0.875rem', margin: '0 0 20px' }}>
          Order premium prints of &ldquo;{photoName}&rdquo; — delivered to your door.
        </p>

        <PhotoPreview>
          <img src={photoUrl} alt={photoName} loading="lazy" />
        </PhotoPreview>

        {loading ? (
          <ProductGrid>
            {[1,2,3,4,5].map(i => <CrystallineSkeleton key={i} style={{ height: 120 }} />)}
          </ProductGrid>
        ) : (
          <>
            <SectionLabel>Choose Product</SectionLabel>
            <ProductGrid>
              {products.map(p => (
                <CardWrapper
                  key={p.type}
                  $selected={selectedProduct?.type === p.type}
                  ref={el => { if (el) cardRefs.current.set(p.type, el); }}
                  onMouseMove={e => handleMouseMove(e, p.type)}
                  onMouseLeave={() => handleMouseLeave(p.type)}
                  onClick={() => { setSelectedProduct(p); setSelectedSize(null); }}
                  role="radio"
                  aria-checked={selectedProduct?.type === p.type}
                >
                  <CardIcon>{PRODUCT_ICONS[p.type] || '🖼️'}</CardIcon>
                  <CardTitle>{p.label}</CardTitle>
                  <CardPrice>from ${Math.min(...p.sizes.map(s => s.price)).toFixed(2)}</CardPrice>
                </CardWrapper>
              ))}
            </ProductGrid>

            <AnimatePresence>
              {selectedProduct && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <SectionLabel>Choose Size</SectionLabel>
                  <SizeSelector>
                    {selectedProduct.sizes.map(s => (
                      <SizeChip
                        key={s.size}
                        $selected={selectedSize?.size === s.size}
                        onClick={() => setSelectedSize(s)}
                      >
                        {s.size} — ${s.price.toFixed(2)}
                      </SizeChip>
                    ))}
                  </SizeSelector>
                </motion.div>
              )}
            </AnimatePresence>

            {selectedSize && (
              <>
                <TotalLine>
                  <span className="label">{selectedProduct?.label} — {selectedSize.size} × {quantity}</span>
                  <span className="price">${total}</span>
                </TotalLine>

                <GildedButton
                  onClick={handleCheckout}
                  disabled={submitting}
                  whileTap={{ scale: 0.98 }}
                >
                  {submitting ? 'Processing...' : `Order for $${total}`}
                </GildedButton>
              </>
            )}
          </>
        )}
      </div>
    </VaultDrawer>
  );
};

export default PrintStore;
