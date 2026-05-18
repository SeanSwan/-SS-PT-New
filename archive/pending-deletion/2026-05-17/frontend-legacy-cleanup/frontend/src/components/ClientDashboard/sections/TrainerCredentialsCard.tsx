/**
 * ============================================================================
 * FILE: TrainerCredentialsCard.tsx
 * PURPOSE: Display trainer credentials as trust signals for clients
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-22
 * AI VILLAGE VALIDATED: 2026-03-22
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Shows Sean Swan's trainer credentials (NASM, NCEP,
 * 24HR Master Trainer, Gold's Gym, LA Fitness) as a premium trust card
 * on the client dashboard. Targets wealthy golf clients who expect
 * credentialed trainers.
 *
 * HOW IT FITS IN THE APP: RevolutionaryClientDashboard → OverviewCrystalline → TrainerCredentialsCard
 * KEY DECISIONS: Static content card, no API calls. Cert badges as pill elements.
 */

import React from 'react';
import styled from 'styled-components';
import { Award, Shield, Star } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// PURPOSE: Premium trust signal card for trainer credentials
// ─────────────────────────────────────────────────────────────

const CERTIFICATIONS = [
  { name: 'NASM', color: '#8B5CF6' },
  { name: 'NCEP', color: '#60C0F0' },
  { name: '24HR Master Trainer', color: '#C6A84B' },
  { name: "Gold's Gym", color: '#C6A84B' },
  { name: 'LA Fitness', color: '#60C0F0' },
] as const;

const TrainerCredentialsCard: React.FC = () => (
  <Card>
    <CardHeader>
      <Shield size={20} style={{ color: '#C6A84B' }} />
      <HeaderText>Your Trainer</HeaderText>
    </CardHeader>

    <TrainerInfo>
      <TrainerName>Sean Swan, CPT</TrainerName>
      <ExperienceBadge>
        <Star size={14} style={{ color: '#C6A84B' }} />
        <span>25+ Years Experience</span>
      </ExperienceBadge>
    </TrainerInfo>

    <CertGrid>
      {CERTIFICATIONS.map(({ name, color }) => (
        <CertBadge key={name} $color={color}>
          <Award size={12} />
          {name}
        </CertBadge>
      ))}
    </CertGrid>

    <ProtocolNote>
      Utilizing NASM OPT Protocol for periodized performance optimization
    </ProtocolNote>
  </Card>
);

export default TrainerCredentialsCard;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// PURPOSE: Crystalline Swan luxury card styling
// ─────────────────────────────────────────────────────────────

const Card = styled.div`
  background: rgba(0, 48, 128, 0.3);
  border: 1px solid rgba(198, 168, 75, 0.2);
  border-radius: 16px;
  padding: 1.25rem;
  backdrop-filter: blur(12px);

  @supports not (backdrop-filter: blur(12px)) {
    background: rgba(0, 32, 96, 0.95);
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 0.75rem;
`;

const HeaderText = styled.h4`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  color: rgba(224, 236, 244, 0.7);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const TrainerInfo = styled.div`
  margin-bottom: 1rem;
`;

const TrainerName = styled.h3`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 1.2rem;
  font-weight: 700;
  color: #E0ECF4;
  margin: 0 0 0.5rem 0;
`;

const ExperienceBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: rgba(198, 168, 75, 0.12);
  border: 1px solid rgba(198, 168, 75, 0.3);
  border-radius: 20px;
  font-family: 'Sora', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  color: #C6A84B;
`;

const CertGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const CertBadge = styled.div<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  min-height: 32px;
  background: ${({ $color }) => `${$color}15`};
  border: 1px solid ${({ $color }) => `${$color}40`};
  border-radius: 8px;
  font-family: 'Sora', sans-serif;
  font-size: 0.75rem;
  font-weight: 500;
  color: ${({ $color }) => $color};
`;

const ProtocolNote = styled.p`
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: 0.85rem;
  color: rgba(224, 236, 244, 0.5);
  margin: 0;
  line-height: 1.4;
`;
