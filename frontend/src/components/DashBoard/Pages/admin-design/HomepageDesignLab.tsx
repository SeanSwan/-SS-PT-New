/**
 * HomepageDesignLab.tsx — Admin preview page for cinematic homepage variants.
 *
 * Renders 5 unique cinematic homepage designs in a chromeless full-viewport portal.
 * Uses ReactDOM.createPortal to escape WorkspaceContainer's animated DOM tree.
 * Selection state is ephemeral (component state only, no backend persistence).
 */

import React, { useState, useCallback, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, X, Star, Feather, ArrowRight, Flame, Droplets, Crown } from 'lucide-react';

// Lazy-load variants to keep admin chunk light
const ObsidianBloom = lazy(() => import('../../../../pages/HomePage/cinematic/variants/ObsidianBloom'));
const FrozenCanopy = lazy(() => import('../../../../pages/HomePage/cinematic/variants/FrozenCanopy'));
const EmberRealm = lazy(() => import('../../../../pages/HomePage/cinematic/variants/EmberRealm'));
const TwilightLagoon = lazy(() => import('../../../../pages/HomePage/cinematic/variants/TwilightLagoon'));
const NebulaCrown = lazy(() => import('../../../../pages/HomePage/cinematic/variants/NebulaCrown'));

// ─── Types ───────────────────────────────────────────────────────────

type VariantId = 'obsidian-bloom' | 'frozen-canopy' | 'ember-realm' | 'twilight-lagoon' | 'nebula-crown';

interface VariantMeta {
  id: VariantId;
  name: string;
  preset: string;
  description: string;
  icon: React.FC<{ size?: number }>;
  recommended: boolean;
  component: React.LazyExoticComponent<React.FC>;
  accentColor: string;
}

const VARIANTS: VariantMeta[] = [
  {
    id: 'obsidian-bloom',
    name: 'Obsidian Bloom',
    preset: 'Dark Gothic Garden',
    description: 'Dark botanical garden at midnight. Oversized serif text, rose-tinted fog, floating petals, sharp editorial cards. Like a dark luxury magazine.',
    icon: Feather,
    recommended: false,
    component: ObsidianBloom,
    accentColor: '#8B1A4A',
  },
  {
    id: 'frozen-canopy',
    name: 'Frozen Canopy',
    preset: 'Arctic Enchanted Forest',
    description: 'Aurora borealis gradient, falling ice crystals, frosted glass cards with thick blur. Horizontal scroll carousel. Like walking through an ice palace.',
    icon: Star,
    recommended: true,
    component: FrozenCanopy,
    accentColor: '#60C0F0',
  },
  {
    id: 'ember-realm',
    name: 'Ember Realm',
    preset: 'Warrior Forge',
    description: 'Rising ember particles, fire glow shimmer, bold 800-weight condensed type. Diagonal section dividers, masonry grids. Bold, powerful, unapologetically intense.',
    icon: Flame,
    recommended: false,
    component: EmberRealm,
    accentColor: '#FF6B2C',
  },
  {
    id: 'twilight-lagoon',
    name: 'Twilight Lagoon',
    preset: 'Bioluminescent Depths',
    description: 'Floating bioluminescent orbs, wave-shaped SVG dividers, gradient text teal→cyan→gold. Pill-shaped cards, bubble stats. Calming yet awe-inspiring.',
    icon: Droplets,
    recommended: false,
    component: TwilightLagoon,
    accentColor: '#00FFB2',
  },
  {
    id: 'nebula-crown',
    name: 'Nebula Crown',
    preset: 'Cosmic Throne',
    description: 'Twinkling star field, slow-rotating nebula gradient, radial spotlight. Ultra-wide letter-spacing. Centered theatrical layout. Grand, cosmic, transcendent.',
    icon: Crown,
    recommended: false,
    component: NebulaCrown,
    accentColor: '#9333EA',
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
  margin-bottom: 1.5rem;

  @media (max-width: 1280px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const VariantCard = styled(motion.div)<{ $active: boolean; $recommended: boolean; $accent: string }>`
  position: relative;
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(10px);
  border: 2px solid ${({ $active, $recommended, $accent }) =>
    $active ? '#C6A84B' : $recommended ? `${$accent}60` : 'rgba(255, 255, 255, 0.08)'};
  border-radius: 1.5rem;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    border-color: ${({ $active, $accent }) => ($active ? '#C6A84B' : `${$accent}40`)};
    background: rgba(255, 255, 255, 0.06);
  }
`;

const RecommendedBadge = styled.div<{ $accent: string }>`
  position: absolute;
  top: -10px;
  right: 1rem;
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  background: linear-gradient(135deg, #C6A84B, ${({ $accent }) => $accent});
  color: #000;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`;

const CardIcon = styled.div<{ $active: boolean; $accent: string }>`
  width: 48px;
  height: 48px;
  border-radius: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ $active, $accent }) => ($active ? `${$accent}20` : 'rgba(255, 255, 255, 0.05)')};
  color: ${({ $active, $accent }) => ($active ? $accent : 'rgba(255, 255, 255, 0.5)')};
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
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.6;
  margin: 0.75rem 0 0;
`;

const PreviewButton = styled.button<{ $active: boolean; $accent: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1.25rem;
  padding: 0.625rem 1.25rem;
  border-radius: 1rem;
  border: none;
  background: ${({ $active, $accent }) =>
    $active ? `linear-gradient(135deg, #C6A84B, ${$accent})` : 'rgba(255, 255, 255, 0.08)'};
  color: ${({ $active }) => ($active ? '#000' : 'rgba(255, 255, 255, 0.7)')};
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  min-height: 44px;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ $active, $accent }) =>
      $active ? `linear-gradient(135deg, #C6A84B, ${$accent})` : 'rgba(255, 255, 255, 0.12)'};
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
  const [selectedVariant, setSelectedVariant] = useState<VariantId>('frozen-canopy');
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
          Preview and compare 5 unique cinematic homepage designs. Each has its own visual identity,
          particle effects, layout patterns, and typography treatment. Click "Preview" to see a
          full-viewport render.
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
              $accent={variant.accentColor}
              onClick={() => setSelectedVariant(variant.id)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              {variant.recommended && <RecommendedBadge $accent={variant.accentColor}>Recommended</RecommendedBadge>}
              <CardIcon $active={isSelected} $accent={variant.accentColor}>
                <Icon size={24} />
              </CardIcon>
              <CardName>{variant.name}</CardName>
              <CardPreset>{variant.preset}</CardPreset>
              <CardDesc>{variant.description}</CardDesc>
              <PreviewButton
                $active={isSelected}
                $accent={variant.accentColor}
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
        but completely different visual identities — unique palettes, particle effects, section layouts,
        card shapes, and typography treatments. All stay within the Preset F enchanted family with gold
        accent constant. The final cutover to production will be done after your approval.
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
