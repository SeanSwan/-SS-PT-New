/**
 * HomepageDesignLab.tsx — Admin preview page for cinematic homepage variants.
 *
 * Renders all 3 variants in a chromeless full-viewport portal overlay.
 * Uses ReactDOM.createPortal to escape WorkspaceContainer's animated DOM tree.
 * Selection state is ephemeral (component state only, no backend persistence).
 */

import React, { useState, useCallback, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, X, Star, Zap, Feather, ArrowRight } from 'lucide-react';

// Lazy-load variants to avoid shipping all 3 in the admin chunk
const VariantA = lazy(() => import('../../../../pages/HomePage/cinematic/variants/VariantA'));
const VariantB = lazy(() => import('../../../../pages/HomePage/cinematic/variants/VariantB'));
const VariantC = lazy(() => import('../../../../pages/HomePage/cinematic/variants/VariantC'));

// ─── Types ───────────────────────────────────────────────────────────

type VariantId = 'A' | 'B' | 'C';

interface VariantMeta {
  id: VariantId;
  name: string;
  preset: string;
  description: string;
  icon: React.FC<{ size?: number }>;
  recommended: boolean;
  component: React.LazyExoticComponent<React.FC>;
}

const VARIANTS: VariantMeta[] = [
  {
    id: 'A',
    name: 'Enchanted Apex',
    preset: 'Preset F',
    description: 'Warm enchanted forest, bioluminescent particles, gold-leaf UI, high fantasy energy.',
    icon: Star,
    recommended: false,
    component: VariantA,
  },
  {
    id: 'B',
    name: 'Crystalline Swan',
    preset: 'Preset F-Alt',
    description: 'Frozen enchanted forest, aurora borealis, sapphire glass. Brand-exact match to SwanStudios logo palette.',
    icon: Feather,
    recommended: true,
    component: VariantB,
  },
  {
    id: 'C',
    name: 'Hybrid Editorial',
    preset: 'F-Alt + Low Motion',
    description: 'Crystalline Swan palette with editorial restraint, fewer particles, sharper hierarchy, premium professional feel.',
    icon: Zap,
    recommended: false,
    component: VariantC,
  },
];

// ─── Styled Components ───────────────────────────────────────────────

const LabContainer = styled.div`
  padding: 0;
`;

const Header = styled.div`
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-family: 'Plus Jakarta Sans', 'Source Sans 3', sans-serif;
  font-size: 1.75rem;
  font-weight: 700;
  color: #fff;
  margin: 0 0 0.5rem;
`;

const Subtitle = styled.p`
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
  line-height: 1.6;
`;

const VariantGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
  margin-bottom: 2rem;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const VariantCard = styled(motion.div)<{ $active: boolean; $recommended: boolean }>`
  position: relative;
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(10px);
  border: 2px solid ${({ $active, $recommended }) =>
    $active ? '#C6A84B' : $recommended ? 'rgba(96, 192, 240, 0.4)' : 'rgba(255, 255, 255, 0.08)'};
  border-radius: 1.5rem;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    border-color: ${({ $active }) => ($active ? '#C6A84B' : 'rgba(255, 255, 255, 0.2)')};
    background: rgba(255, 255, 255, 0.06);
  }
`;

const RecommendedBadge = styled.div`
  position: absolute;
  top: -10px;
  right: 1rem;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  background: linear-gradient(135deg, #C6A84B, #60C0F0);
  color: #002060;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`;

const CardIcon = styled.div<{ $active: boolean }>`
  width: 48px;
  height: 48px;
  border-radius: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $active }) => ($active ? 'rgba(198, 168, 75, 0.15)' : 'rgba(255, 255, 255, 0.05)')};
  color: ${({ $active }) => ($active ? '#C6A84B' : 'rgba(255, 255, 255, 0.5)')};
  margin-bottom: 1rem;
`;

const CardName = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 700;
  font-size: 1.15rem;
  color: #fff;
  margin: 0 0 0.25rem;
`;

const CardPreset = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.4);
`;

const CardDesc = styled.p`
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.6;
  margin: 0.75rem 0 0;
`;

const PreviewButton = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1.25rem;
  padding: 0.625rem 1.25rem;
  border-radius: 1rem;
  border: none;
  background: ${({ $active }) =>
    $active ? 'linear-gradient(135deg, #C6A84B, #60C0F0)' : 'rgba(255, 255, 255, 0.08)'};
  color: ${({ $active }) => ($active ? '#002060' : 'rgba(255, 255, 255, 0.7)')};
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  min-height: 44px;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ $active }) =>
      $active ? 'linear-gradient(135deg, #C6A84B, #60C0F0)' : 'rgba(255, 255, 255, 0.12)'};
  }
`;

const InfoBox = styled.div`
  padding: 1rem 1.5rem;
  border-radius: 1rem;
  background: rgba(198, 168, 75, 0.08);
  border: 1px solid rgba(198, 168, 75, 0.2);
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.85rem;
  line-height: 1.6;
`;

// ─── Portal Overlay ──────────────────────────────────────────────────

const OverlayRoot = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: 2000;
  overflow-y: auto;
  background: #000;
`;

const BackButton = styled.button`
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 2100;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border-radius: 1.5rem;
  border: none;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
  color: #fff;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  min-height: 44px;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(0, 0, 0, 0.8);
  }
`;

const LoadingFallback = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  color: #fff;
  font-size: 1.1rem;
`;

// ─── Component ───────────────────────────────────────────────────────

const HomepageDesignLab: React.FC = () => {
  const [selectedVariant, setSelectedVariant] = useState<VariantId>('B');
  const [previewVariant, setPreviewVariant] = useState<VariantId | null>(null);

  const openPreview = useCallback((id: VariantId) => {
    setPreviewVariant(id);
    document.body.style.overflow = 'hidden';
  }, []);

  const closePreview = useCallback(() => {
    setPreviewVariant(null);
    document.body.style.overflow = '';
  }, []);

  const previewMeta = previewVariant ? VARIANTS.find((v) => v.id === previewVariant) : null;

  return (
    <LabContainer>
      <Header>
        <Title>Homepage Design Lab</Title>
        <Subtitle>
          Preview and compare 3 cinematic homepage redesign variants. Click "Preview" to see
          a full-viewport render. Selection is for review only — the cutover to production
          requires a separate approval step.
        </Subtitle>
      </Header>

      <VariantGrid>
        {VARIANTS.map((variant) => {
          const Icon = variant.icon;
          const isSelected = selectedVariant === variant.id;
          return (
            <VariantCard
              key={variant.id}
              $active={isSelected}
              $recommended={variant.recommended}
              onClick={() => setSelectedVariant(variant.id)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              {variant.recommended && <RecommendedBadge>Recommended</RecommendedBadge>}
              <CardIcon $active={isSelected}>
                <Icon size={24} />
              </CardIcon>
              <CardName>{variant.name}</CardName>
              <CardPreset>{variant.preset}</CardPreset>
              <CardDesc>{variant.description}</CardDesc>
              <PreviewButton
                $active={isSelected}
                onClick={(e) => {
                  e.stopPropagation();
                  openPreview(variant.id);
                }}
              >
                <Eye size={16} />
                Preview Full Page
                <ArrowRight size={14} />
              </PreviewButton>
            </VariantCard>
          );
        })}
      </VariantGrid>

      <InfoBox>
        <strong>How this works:</strong> Each variant uses the same content (text, CTAs, sections)
        but different color palettes, motion intensities, and surface styles. Variant B (Crystalline
        Swan) is recommended as it matches the SwanStudios brand palette most closely. The final
        cutover to production will be done in a separate step after your approval.
      </InfoBox>

      {/* Chromeless Portal Preview */}
      {previewMeta &&
        createPortal(
          <AnimatePresence>
            <OverlayRoot
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <BackButton onClick={closePreview}>
                <X size={16} />
                Back to Design Lab
              </BackButton>
              <Suspense fallback={<LoadingFallback>Loading {previewMeta.name}...</LoadingFallback>}>
                <previewMeta.component />
              </Suspense>
            </OverlayRoot>
          </AnimatePresence>,
          document.body
        )}
    </LabContainer>
  );
};

export default HomepageDesignLab;
