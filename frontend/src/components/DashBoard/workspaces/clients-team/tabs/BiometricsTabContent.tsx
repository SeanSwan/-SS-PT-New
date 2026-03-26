/**
 * ============================================================================
 * FILE: BiometricsTabContent.tsx
 * PURPOSE: Bento-box grid of biometric feature cards for client detail view
 * AUTHOR: Claude Opus 4.6 (CEO) | LAST MODIFIED: 2026-03-25
 * AI VILLAGE VALIDATED: 2026-03-25
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders the Biometrics tab content as a 2x2 bento grid
 * of feature cards (Body Map, Measurements, Movement Analysis, Form Analysis).
 * Each card is a clickable placeholder that will lazy-load its full component.
 *
 * HOW IT FITS IN THE APP: ClientDetailView → renderBiometrics → BiometricsTabContent
 *
 * KEY DECISIONS: Bento-box grid over tabs-within-tabs to maximize information
 * density. Cards use dashed borders (pending state) that become solid on hover
 * to signal interactivity. View Transitions API names baked in for future use.
 *
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: BiometricsTabContent                             ║
 * ║  PURPOSE: Bento grid of biometric feature cards              ║
 * ║  OWNER: Claude Opus 4.6 (CEO)                                ║
 * ║  LAST VALIDATED: 2026-03-25                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌──────────────────────┬──────────────────────┐
 * │ Body Map              │ Measurements          │
 * │ (Interactive SVG +    │ (Weight, body fat,    │
 * │  AI photo upload)     │  muscle mass trends)  │
 * ├──────────────────────┼──────────────────────┤
 * │ Movement Analysis     │ Form Analysis         │
 * │ (NASM assessment      │ (AI form check        │
 * │  results)             │  results)             │
 * └──────────────────────┴──────────────────────┘
 *
 * MERMAID ARCHITECTURE:
 * graph TD
 *   A[BiometricsTabContent] --> B[BentoCard: Body Map]
 *   A --> C[BentoCard: Measurements]
 *   A --> D[BentoCard: Movement Analysis]
 *   A --> E[BentoCard: Form Analysis]
 *
 * CLICK-OUTCOME FLOWCHART:
 * [Card: Body Map] -> Opens BodyMap component (lazy) -> Interactive SVG + photo upload
 * [Card: Measurements] -> Opens ClientMeasurementPanel (lazy) -> Weight/BF/muscle trends
 * [Card: Movement Analysis] -> Opens MovementAnalysisWizard (lazy) -> NASM assessment
 * [Card: Form Analysis] -> Opens FormAnalysis component (lazy) -> AI form checking
 *
 * DATA FLOW:
 * Props In:  { clientId, clientName? }
 * State:     { expandedCard }
 * Children:  BentoCard x4 (placeholder state)
 */

import React, { useState, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { MapPin, Ruler, Activity, Eye } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// PURPOSE: Props and card configuration interfaces
// ─────────────────────────────────────────────────────────────

interface BiometricsTabContentProps {
  clientId: number | string;
  clientName?: string;
}

interface BentoCardConfig {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  /** Future: lazy component path */
  componentPath: string;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Card Configuration
// PURPOSE: Declarative card definitions for the bento grid
// WHY: Easy to add/remove cards without touching render logic
// ─────────────────────────────────────────────────────────────

const BIOMETRIC_CARDS: BentoCardConfig[] = [
  {
    id: 'body-map',
    title: 'Body Map',
    description: 'Interactive SVG body map with AI-powered photo upload for visual progress tracking.',
    icon: <MapPin size={24} />,
    componentPath: '../../../BodyMap',
  },
  {
    id: 'measurements',
    title: 'Measurements',
    description: 'Weight, body fat percentage, muscle mass, and circumference measurement trends.',
    icon: <Ruler size={24} />,
    componentPath: 'ClientMeasurementPanel',
  },
  {
    id: 'movement-analysis',
    title: 'Movement Analysis',
    description: 'NASM Overhead Squat Assessment and corrective exercise recommendations.',
    icon: <Activity size={24} />,
    componentPath: 'MovementAnalysisWizard',
  },
  {
    id: 'form-analysis',
    title: 'Form Analysis',
    description: 'AI-powered exercise form checking with video analysis and feedback.',
    icon: <Eye size={24} />,
    componentPath: 'FormAnalysisComponent',
  },
];

// ─────────────────────────────────────────────────────────────
// SECTION: Animations
// PURPOSE: Subtle entrance and hover animations for cards
// WHY: Premium feel consistent with MasterDetailStyles surfaceRise
// ─────────────────────────────────────────────────────────────

const cardEntrance = keyframes`
  0% {
    opacity: 0;
    transform: translateY(16px) scale(0.97);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// PURPOSE: Dark-first bento grid with CSS custom properties
// WHY: Matches Crystalline Swan dark aesthetic with dual-glow system
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

const BentoCardWrapper = styled.button<{ $isExpanded: boolean }>`
  /* Reset button defaults */
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
  border: 1.5px dashed ${({ $isExpanded }) =>
    $isExpanded ? 'var(--accent-primary, #60C0F0)' : 'rgba(0, 48, 128, 0.6)'};
  transition: border-color 200ms ease, box-shadow 200ms ease, transform 150ms ease;
  animation: ${cardEntrance} 400ms cubic-bezier(0.22, 1, 0.36, 1) backwards;

  /* Stagger entrance per card position */
  &:nth-child(1) { animation-delay: 0ms; }
  &:nth-child(2) { animation-delay: 60ms; }
  &:nth-child(3) { animation-delay: 120ms; }
  &:nth-child(4) { animation-delay: 180ms; }

  /* View Transitions API support */
  view-transition-name: var(--card-id);

  /* 44px min touch target is satisfied by min-height + padding */

  &:hover {
    border-style: solid;
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

  &:active {
    transform: translateY(0);
  }
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

const ComingSoonBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 6px;
  font-family: 'Sora', sans-serif;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.04em;
  color: var(--accent-gold, #C6A84B);
  background: color-mix(in srgb, var(--accent-gold, #C6A84B) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 20%, transparent);
  align-self: flex-start;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// PURPOSE: Main biometrics tab content with bento card grid
// ─────────────────────────────────────────────────────────────

const BiometricsTabContent: React.FC<BiometricsTabContentProps> = ({
  clientId,
  clientName,
}) => {
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const handleCardClick = useCallback((cardId: string) => {
    // Future: lazy-load the actual component into an expanded state
    setExpandedCard((prev) => (prev === cardId ? null : cardId));
    console.warn(`TODO: Lazy-load component for card "${cardId}" (client ${clientId})`);
  }, [clientId]);

  return (
    <BentoGrid role="group" aria-label={`Biometrics for ${clientName || 'client'}`}>
      {BIOMETRIC_CARDS.map((card) => (
        <BentoCardWrapper
          key={card.id}
          $isExpanded={expandedCard === card.id}
          onClick={() => handleCardClick(card.id)}
          aria-label={`${card.title} — ${card.description}`}
          aria-pressed={expandedCard === card.id}
          style={{ '--card-id': `bento-${card.id}` } as React.CSSProperties}
        >
          <CardIconCircle aria-hidden="true">
            {card.icon}
          </CardIconCircle>
          <CardTitle>{card.title}</CardTitle>
          <CardDescription>{card.description}</CardDescription>
          <ComingSoonBadge>Coming Soon</ComingSoonBadge>
        </BentoCardWrapper>
      ))}
    </BentoGrid>
  );
};

export default React.memo(BiometricsTabContent);
