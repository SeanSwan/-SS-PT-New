/**
 * ============================================================================
 * FILE: OverviewTabContent.tsx
 * PURPOSE: Bento grid overview dashboard for a selected client
 * AUTHOR: Claude Opus 4.6 (CEO) | LAST MODIFIED: 2026-03-25
 * AI VILLAGE VALIDATED: 2026-03-25
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders a bento-grid of placeholder dashboard cards
 * for a client's overview tab. Cards include AI Protocol status (hero),
 * readiness score, weekly XP/streak, volume chart, badges, revenue, and schedule.
 *
 * HOW IT FITS IN THE APP: ClientDetailView → OverviewTabContent (renderOverview prop)
 * KEY DECISIONS: Placeholder cards now, wired to real data later. BentoCard pattern
 * matches Biometrics tab for visual consistency across detail view tabs.
 */

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: OverviewTabContent                                ║
 * ║  PURPOSE: Bento grid client overview dashboard                ║
 * ║  OWNER: Claude Opus 4.6 (CEO)                                ║
 * ║  LAST VALIDATED: 2026-03-25                                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌────────────────────────────────────────────────┐
 * │ AI Protocol Status (hero card, full width)       │
 * ├──────────┬──────────┬──────────┬───────────────┤
 * │ Readiness │ Weekly   │ Volume   │ Badges &      │
 * │ Score    │ XP/Streak│ Chart    │ Achievements  │
 * ├──────────┴──────────┼──────────┴───────────────┤
 * │ Revenue/Sessions    │ Upcoming Schedule         │
 * └─────────────────────┴──────────────────────────┘
 *
 * DATA FLOW:
 * Props In:  { clientId, clientName? }
 * State:     none (placeholder)
 * API Calls: none yet (future: GET /api/clients/:id/overview)
 * Children:  BentoCard (styled)
 *
 * CLICK-OUTCOME FLOWCHART:
 * [Card click] → future: expand card or navigate to detail view
 */

import React from 'react';
import styled from 'styled-components';
import {
  Brain, Gauge, Flame, BarChart3,
  Award, DollarSign, Calendar,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// PURPOSE: Component props
// ─────────────────────────────────────────────────────────────

interface OverviewTabContentProps {
  clientId: number | string;
  clientName?: string;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// PURPOSE: Bento grid layout and card primitives
// WHY: CSS Grid bento pattern for responsive dashboard cards
// ─────────────────────────────────────────────────────────────

const BentoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 16px 0;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

const BentoCard = styled.div<{ $span?: number; $heroAccent?: string }>`
  grid-column: span ${({ $span }) => $span || 1};
  background: var(--bg-surface, #141419);
  border: 1px solid var(--border-soft, rgba(224, 236, 244, 0.06));
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: border-color 200ms ease, box-shadow 200ms ease;

  ${({ $heroAccent }) => $heroAccent && `
    border-left: 3px solid ${$heroAccent};
  `}

  &:hover {
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 25%, transparent);
    box-shadow: 0 0 20px color-mix(in srgb, var(--accent-primary, #60C0F0) 6%, transparent);
  }

  @media (max-width: 1024px) {
    grid-column: span ${({ $span }) => ($span && $span > 2 ? 2 : $span || 1)};
  }

  @media (max-width: 430px) {
    grid-column: span 1;
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const CardIcon = styled.div<{ $color?: string }>`
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, ${({ $color }) => $color || 'var(--accent-primary, #60C0F0)'} 12%, transparent);
  color: ${({ $color }) => $color || 'var(--accent-primary, #60C0F0)'};
  flex-shrink: 0;
`;

const CardTitle = styled.h4`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  margin: 0;
`;

const CardValue = styled.span`
  font-family: 'Fira Code', monospace;
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
`;

const CardSubtext = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 12px;
  color: var(--text-muted, rgba(224, 236, 244, 0.45));
  margin: 0;
  line-height: 1.5;
`;

const HeroDescription = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 13px;
  color: var(--text-secondary, #4070C0);
  margin: 0;
  line-height: 1.6;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Card Data
// PURPOSE: Static card definitions for the bento grid
// WHY: Centralizes card config for easy wiring to real data later
// ─────────────────────────────────────────────────────────────

interface CardDef {
  id: string;
  title: string;
  icon: React.ReactNode;
  iconColor: string;
  span: number;
  value?: string;
  subtext: string;
  heroAccent?: string;
  isHero?: boolean;
}

const CARDS: CardDef[] = [
  {
    id: 'ai-protocol',
    title: 'AI Protocol Status',
    icon: <Brain size={18} />,
    iconColor: 'var(--accent-secondary, #8B5CF6)',
    span: 4,
    heroAccent: 'var(--accent-secondary, #8B5CF6)',
    isHero: true,
    subtext: 'AI workout generation, OPT phase tracking, and personalized programming will appear here once connected.',
  },
  {
    id: 'readiness',
    title: 'Readiness Score',
    icon: <Gauge size={18} />,
    iconColor: 'var(--accent-primary, #60C0F0)',
    span: 1,
    value: '--',
    subtext: 'Recovery & readiness',
  },
  {
    id: 'xp-streak',
    title: 'Weekly XP / Streak',
    icon: <Flame size={18} />,
    iconColor: 'var(--accent-gold, #C6A84B)',
    span: 1,
    value: '0 XP',
    subtext: '0-day streak',
  },
  {
    id: 'volume',
    title: 'Volume Trend',
    icon: <BarChart3 size={18} />,
    iconColor: 'var(--accent-primary, #60C0F0)',
    span: 1,
    value: '--',
    subtext: 'Weekly training volume',
  },
  {
    id: 'badges',
    title: 'Badges & Achievements',
    icon: <Award size={18} />,
    iconColor: 'var(--accent-secondary, #8B5CF6)',
    span: 1,
    value: '0',
    subtext: 'Earned badges',
  },
  {
    id: 'revenue',
    title: 'Revenue / Sessions',
    icon: <DollarSign size={18} />,
    iconColor: 'var(--accent-gold, #C6A84B)',
    span: 2,
    value: '$0',
    subtext: '0 sessions remaining',
  },
  {
    id: 'schedule',
    title: 'Upcoming Schedule',
    icon: <Calendar size={18} />,
    iconColor: 'var(--accent-primary, #60C0F0)',
    span: 2,
    value: 'No sessions',
    subtext: 'Next 7 days',
  },
];

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// PURPOSE: Renders the bento grid overview for a client
// ─────────────────────────────────────────────────────────────

const OverviewTabContent: React.FC<OverviewTabContentProps> = React.memo(({ clientId, clientName }) => {
  return (
    <BentoGrid>
      {CARDS.map((card) => (
        <BentoCard
          key={card.id}
          $span={card.span}
          $heroAccent={card.heroAccent}
        >
          <CardHeader>
            <CardIcon $color={card.iconColor}>
              {card.icon}
            </CardIcon>
            <CardTitle>{card.title}</CardTitle>
          </CardHeader>

          {card.isHero ? (
            <HeroDescription>{card.subtext}</HeroDescription>
          ) : (
            <>
              <CardValue>{card.value}</CardValue>
              <CardSubtext>{card.subtext}</CardSubtext>
            </>
          )}
        </BentoCard>
      ))}
    </BentoGrid>
  );
});

OverviewTabContent.displayName = 'OverviewTabContent';

export default OverviewTabContent;
