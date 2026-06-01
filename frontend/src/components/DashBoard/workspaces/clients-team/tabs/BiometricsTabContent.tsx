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
import { MapPin, Ruler, Activity, Eye, ArrowLeft } from 'lucide-react';
import {
  BackButton,
  BentoCardWrapper,
  BentoGrid,
  CardDescription,
  CardIconCircle,
  CardTitle,
  ComponentWrapper,
  ExpandedTitle,
  ExpandedView,
  InvalidClientAlert,
  ShimmerLoader,
  StickyBackBar,
} from './BiometricsTabContent.styles';
import { getNumericClientId } from './clientTabId';

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
    description: 'Interactive SVG body map with Swan Coach photo upload for visual progress tracking.',
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
    description: 'Swan Coach exercise form checking with video analysis and feedback.',
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
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────

// ── Sticky back bar — always visible at top of expanded component ──
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
  const numericClientId = getNumericClientId(clientId);

  const handleCardClick = useCallback((cardId: CardId) => {
    setExpandedCard(cardId);
  }, []);

  const handleBack = useCallback(() => {
    setExpandedCard(null);
  }, []);

  // Render the expanded component for a given card
  const renderExpandedComponent = (cardId: CardId, safeClientId: number) => {
    switch (cardId) {
      case 'body-map':
        return (
          <Suspense fallback={<SuspenseFallback />}>
            <BodyMap userId={safeClientId} mode="trainer" />
          </Suspense>
        );
      case 'measurements':
        return (
          <Suspense fallback={<SuspenseFallback />}>
            <MeasurementEntry
              embeddedClientId={String(safeClientId)}
              embeddedClientName={clientName || `Client #${safeClientId}`}
            />
          </Suspense>
        );
      case 'movement-analysis':
        return (
          <Suspense fallback={<SuspenseFallback />}>
            <MovementAnalysisWizard propClientId={safeClientId} />
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
            <ROMAssessment clientId={safeClientId} clientName={clientName} />
          </Suspense>
        );
      default:
        return null;
    }
  };

  if (numericClientId === null) {
    return (
      <InvalidClientAlert role="alert" aria-live="assertive">
        Select a valid client before opening biometrics tools.
      </InvalidClientAlert>
    );
  }

  // When a card is expanded, show the component with a sticky back button
  if (expandedCard) {
    const cardConfig = BIOMETRIC_CARDS.find((c) => c.id === expandedCard);
    return (
      <ExpandedView>
        <StickyBackBar>
          <BackButton type="button" onClick={handleBack} aria-label="Back to biometrics grid">
            <ArrowLeft size={16} />
            Back to Biometrics
          </BackButton>
          <ExpandedTitle>{cardConfig?.title}</ExpandedTitle>
        </StickyBackBar>
        <ComponentWrapper>
          {renderExpandedComponent(expandedCard, numericClientId)}
        </ComponentWrapper>
      </ExpandedView>
    );
  }

  // Default: show the bento grid
  return (
    <BentoGrid role="group" aria-label={`Biometrics for ${clientName || 'client'}`}>
      {BIOMETRIC_CARDS.map((card) => (
        <BentoCardWrapper
          type="button"
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
