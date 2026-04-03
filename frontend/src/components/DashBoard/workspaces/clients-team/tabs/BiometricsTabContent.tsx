/**
 * ============================================================================
 * FILE: BiometricsTabContent.tsx
 * PURPOSE: Bento grid with lazy-loaded biometric components for client detail
 * AUTHOR: Claude Opus 4.6 (CEO) | LAST MODIFIED: 2026-03-26
 * AI VILLAGE VALIDATED: 2026-03-25
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders 4 biometric feature cards as a bento grid.
 * Clicking a card expands it to show the real component (BodyMap,
 * Measurements, MovementAnalysis, FormAnalysis) with a sticky back button.
 *
 * HOW IT FITS IN THE APP: ClientDetailView → renderBiometrics → BiometricsTabContent
 *
 * KEY DECISIONS: Cards expand inline (not modal) to avoid tab-ception.
 * Real components lazy-loaded only when card is clicked. BackButton is
 * sticky at top so user can always navigate back.
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: BiometricsTabContent                             ║
 * ║  PURPOSE: Bento grid → expandable biometric tools            ║
 * ║  OWNER: Claude Opus 4.6 (CEO)                                ║
 * ║  LAST VALIDATED: 2026-03-26                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME (Grid):
 * ┌──────────────────────┬──────────────────────┐
 * │ Body Map              │ Measurements          │
 * ├──────────────────────┼──────────────────────┤
 * │ Movement Analysis     │ Form Analysis         │
 * └──────────────────────┴──────────────────────┘
 *
 * WIREFRAME (Expanded):
 * ┌──────────────────────────────────────────────┐
 * │ ← Back to Biometrics     [Card Title]        │  ← sticky bar
 * ├──────────────────────────────────────────────┤
 * │ [Full Component rendered here — scrollable]   │
 * └──────────────────────────────────────────────┘
 *
 * CLICK-OUTCOME FLOWCHART:
 * [Card: Body Map] → expandedCard='body-map' → Lazy BodyMap (userId, mode=trainer)
 * [Card: Measurements] → expandedCard='measurements' → Lazy MeasurementEntry (clientId)
 * [Card: Movement] → expandedCard='movement-analysis' → Lazy MovementAnalysisWizard
 * [Card: Form] → expandedCard='form-analysis' → Lazy FormAnalysisPage
 * [Back button] → expandedCard=null → Returns to bento grid
 *
 * DATA FLOW:
 * Props In:  { clientId, clientName? }
 * State:     { expandedCard }
 * Children:  BodyMap, MeasurementEntry, MovementAnalysisWizard, FormAnalysisPage
 */

import React, { useState, useCallback, Suspense } from 'react';
import styled, { keyframes } from 'styled-components';
import { MapPin, Ruler, Activity, Eye, ArrowLeft } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// SECTION: Lazy-loaded biometric components
// PURPOSE: Only load heavy components when user clicks a card
// ─────────────────────────────────────────────────────────────

const BodyMap = React.lazy(
  () => import('../../../../BodyMap')
);

const MeasurementEntry = React.lazy(
  () => import('../../../Pages/admin-dashboard/MeasurementEntry')
);

const MovementAnalysisWizard = React.lazy(
  () => import('../../../Pages/admin-movement-analysis/MovementAnalysisWizard')
);

const FormAnalysisPage = React.lazy(
  () => import('../../../../FormAnalysis/FormAnalysisPage')
);

const ROMAssessment = React.lazy(
  () => import('./ROMAssessment')
);

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────

interface BiometricsTabContentProps {
  clientId: number | string;
  clientName?: string;
}

type CardId = 'body-map' | 'measurements' | 'movement-analysis' | 'form-analysis' | 'rom-assessment';

interface BentoCardConfig {
  id: CardId;
  title: string;
  description: string;
  icon: React.ReactNode;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Card Configuration
// ─────────────────────────────────────────────────────────────

const BIOMETRIC_CARDS: BentoCardConfig[] = [
  {
    id: 'body-map',
    title: 'Body Map',
    description: 'Interactive SVG body map with AI-powered photo upload for visual progress tracking.',
    icon: <MapPin size={24} />,
  },
  {
    id: 'measurements',
    title: 'Measurements',
    description: 'Weight, body fat percentage, muscle mass, and circumference measurement trends.',
    icon: <Ruler size={24} />,
  },
  {
    id: 'movement-analysis',
    title: 'Movement Analysis',
    description: 'NASM Overhead Squat Assessment and corrective exercise recommendations.',
    icon: <Activity size={24} />,
  },
  {
    id: 'form-analysis',
    title: 'Form Analysis',
    description: 'AI-powered exercise form checking with video analysis and feedback.',
    icon: <Eye size={24} />,
  },
  {
    id: 'rom-assessment',
    title: 'Range of Motion',
    description: 'Goniometer measurements for joint ROM tracking with left/right comparison.',
    icon: <Ruler size={24} />,
  },
];

// ─────────────────────────────────────────────────────────────
// SECTION: Animations
// ─────────────────────────────────────────────────────────────

const cardEntrance = keyframes`
  0% { opacity: 0; transform: translateY(16px) scale(0.97); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
`;

const shimmer = keyframes`
  0% { opacity: 0.4; }
  100% { opacity: 0.8; }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const BentoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  padding: 16px 0;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 12px;
  }
`;

const BentoCardWrapper = styled.button`
  all: unset;
  box-sizing: border-box;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 24px;
  min-height: 160px;
  border-radius: 12px;
  background: var(--bg-surface, #141419);
  border: 1.5px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent);
  transition: border-color 200ms ease, box-shadow 200ms ease, transform 150ms ease;
  animation: ${cardEntrance} 400ms cubic-bezier(0.22, 1, 0.36, 1) backwards;

  &:nth-child(1) { animation-delay: 0ms; }
  &:nth-child(2) { animation-delay: 60ms; }
  &:nth-child(3) { animation-delay: 120ms; }
  &:nth-child(4) { animation-delay: 180ms; }

  &:hover {
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 20px color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent),
                inset 0 0 12px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 5%, transparent);
    transform: translateY(-2px);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 4px;
    box-shadow: 0 0 16px rgba(96, 192, 240, 0.4),
                inset 0 0 0 1px rgba(139, 92, 246, 0.2);
  }

  &:active { transform: translateY(0); }
`;

const CardIconCircle = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  min-width: 48px;
  min-height: 48px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  color: var(--accent-primary, #60C0F0);
  flex-shrink: 0;
`;

const CardTitle = styled.span`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  line-height: 1.3;
`;

const CardDescription = styled.span`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-muted, #4070C0);
`;

const ExpandedView = styled.div`
  animation: ${cardEntrance} 300ms cubic-bezier(0.22, 1, 0.36, 1);
  display: flex;
  flex-direction: column;
  height: 100%;
`;

// ── Sticky back bar — always visible at top of expanded component ──
const StickyBackBar = styled.div`
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  margin: 0 -16px;
  background: var(--bg-base, #0A0A0F);
  border-bottom: 1px solid var(--border-soft, rgba(224, 236, 244, 0.06));
  backdrop-filter: blur(12px);

  @media (max-width: 768px) {
    margin: 0 -8px;
    padding: 10px 12px;
  }
`;

const BackButton = styled.button`
  all: unset;
  box-sizing: border-box;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  min-height: 44px;
  border-radius: 8px;
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: var(--accent-primary, #60C0F0);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  transition: background 150ms ease, border-color 150ms ease;
  flex-shrink: 0;

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 15%, transparent);
    border-color: var(--accent-primary, #60C0F0);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

const ExpandedTitle = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ComponentWrapper = styled.div`
  border-radius: 12px;
  overflow-x: hidden;
  overflow-y: auto;
  background: var(--bg-surface, #141419);
  border: 1px solid var(--border-soft, rgba(224, 236, 244, 0.06));
  flex: 1;
  min-height: 0;
`;

const ShimmerLoader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 24px;

  & > div {
    height: 20px;
    border-radius: 8px;
    background: color-mix(in srgb, var(--accent-primary, #50A0F0) 10%, var(--bg-surface, #141419));
    animation: ${shimmer} 1.5s ease-in-out infinite alternate;
  }

  & > div:nth-child(1) { width: 70%; }
  & > div:nth-child(2) { width: 90%; }
  & > div:nth-child(3) { width: 55%; }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

const SuspenseFallback: React.FC = () => (
  <ShimmerLoader role="status" aria-live="polite" aria-label="Loading component">
    <div />
    <div />
    <div />
  </ShimmerLoader>
);

const BiometricsTabContent: React.FC<BiometricsTabContentProps> = ({
  clientId,
  clientName,
}) => {
  const [expandedCard, setExpandedCard] = useState<CardId | null>(null);

  const handleCardClick = useCallback((cardId: CardId) => {
    setExpandedCard(cardId);
  }, []);

  const handleBack = useCallback(() => {
    setExpandedCard(null);
  }, []);

  // Render the expanded component for a given card
  const renderExpandedComponent = (cardId: CardId) => {
    switch (cardId) {
      case 'body-map':
        return (
          <Suspense fallback={<SuspenseFallback />}>
            <BodyMap userId={Number(clientId)} mode="trainer" />
          </Suspense>
        );
      case 'measurements':
        return (
          <Suspense fallback={<SuspenseFallback />}>
            <MeasurementEntry
              embeddedClientId={String(clientId)}
              embeddedClientName={clientName || `Client #${clientId}`}
            />
          </Suspense>
        );
      case 'movement-analysis':
        return (
          <Suspense fallback={<SuspenseFallback />}>
            <MovementAnalysisWizard />
          </Suspense>
        );
      case 'form-analysis':
        return (
          <Suspense fallback={<SuspenseFallback />}>
            <FormAnalysisPage />
          </Suspense>
        );
      case 'rom-assessment':
        return (
          <Suspense fallback={<SuspenseFallback />}>
            <ROMAssessment clientId={clientId} clientName={clientName} />
          </Suspense>
        );
      default:
        return null;
    }
  };

  // When a card is expanded, show the component with a sticky back button
  if (expandedCard) {
    const cardConfig = BIOMETRIC_CARDS.find((c) => c.id === expandedCard);
    return (
      <ExpandedView>
        <StickyBackBar>
          <BackButton onClick={handleBack} aria-label="Back to biometrics grid">
            <ArrowLeft size={16} />
            Back to Biometrics
          </BackButton>
          <ExpandedTitle>{cardConfig?.title}</ExpandedTitle>
        </StickyBackBar>
        <ComponentWrapper>
          {renderExpandedComponent(expandedCard)}
        </ComponentWrapper>
      </ExpandedView>
    );
  }

  // Default: show the bento grid
  return (
    <BentoGrid role="group" aria-label={`Biometrics for ${clientName || 'client'}`}>
      {BIOMETRIC_CARDS.map((card) => (
        <BentoCardWrapper
          key={card.id}
          onClick={() => handleCardClick(card.id)}
          aria-label={`Open ${card.title}`}
        >
          <CardIconCircle aria-hidden="true">
            {card.icon}
          </CardIconCircle>
          <CardTitle>{card.title}</CardTitle>
          <CardDescription>{card.description}</CardDescription>
        </BentoCardWrapper>
      ))}
    </BentoGrid>
  );
};

export default React.memo(BiometricsTabContent);
