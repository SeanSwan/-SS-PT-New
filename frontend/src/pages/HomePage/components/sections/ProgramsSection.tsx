/**
 * ProgramsSection — Training program cards (3-up)
 * Tier-aware: full (stagger+blur+glow), balanced (stagger), essential (static)
 */
import React from 'react';
import styled, { css } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { SectionEl, Container, SectionHeader, SectionTitle, SectionSubtitle } from '../shared/HomeStyles';
import { cinematicReveal, reducedReveal } from '../shared/HomeAnimations';
import { PROGRAMS } from '../shared/HomeData';
import GlassCard from '../../../../components/ui-kit/glass/GlassCard';
import ForgeButton from '../../../../components/ui/forge/ForgeButton'; // Forge strangler (was GlowButton)
import ScrollReveal from '../../../../components/ui-kit/cinematic/ScrollReveal';

interface ProgramsSectionProps {
  tier: 'full' | 'balanced' | 'essential';
}

/* ─── Local Styled Components ─────────────────────────────────────────── */

const ProgramsContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;

  @media (min-width: 1024px) {
    flex-direction: row;
    justify-content: center;
    align-items: stretch;
  }
`;

const ProgramCard = styled(GlassCard)<{ $isPopular?: boolean }>`
  max-width: 380px;
  width: 100%;
  display: flex;
  flex-direction: column;
  text-align: center;

  ${({ $isPopular }) =>
    $isPopular &&
    css`
      border-color: rgba(139, 92, 246, 0.4);
      box-shadow: 0 8px 32px rgba(139, 92, 246, 0.15),
                  0 0 60px rgba(139, 92, 246, 0.06);

      @media (min-width: 1024px) {
        transform: scale(1.05);
      }
    `}
`;

const PopularBadge = styled.span`
  display: inline-block;
  background: linear-gradient(135deg, #8B5CF6, #60C0F0); /* swan-guard-allow-hex pre-existing legacy literal, untouched by the Forge strangler; token migration is its own backlog slice (FORGE-STRANGLER-BACKLOG; ticket SWA-206; expires 2026-11-23) */
  color: #fff; /* swan-guard-allow-hex pre-existing legacy literal, untouched by the Forge strangler; token migration is its own backlog slice (FORGE-STRANGLER-BACKLOG; ticket SWA-206; expires 2026-11-23) */
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 4px 14px;
  border-radius: 999px;
  margin-bottom: 12px;
`;

const ProgramName = styled.h3`
  font-size: clamp(1.25rem, 2.5vw, 1.5rem);
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  margin: 0 0 6px;
`;

const ProgramMeta = styled.p`
  font-size: 0.875rem;
  color: var(--accent-primary, #60C0F0);
  margin: 0 0 1.5rem;
  font-weight: 500;
`;

const ProgramFeatures = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0 0 auto;
  text-align: left;
  flex: 1;
`;

const ProgramFeatureItem = styled.li`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(224, 236, 244, 0.06);
  font-size: 0.875rem;
  color: var(--text-secondary, rgba(240, 240, 255, 0.7));

  svg {
    flex-shrink: 0;
    color: var(--accent-primary, #60C0F0);
  }

  &:last-child {
    border-bottom: none;
  }
`;

const CtaWrap = styled.div`
  margin-top: 1.5rem;
`;

/* ─── Component ───────────────────────────────────────────────────────── */

const ProgramsSection: React.FC<ProgramsSectionProps> = ({ tier }) => {
  const navigate = useNavigate();
  const animate = tier !== 'essential';
  const useBlur = tier === 'full';

  return (
    <SectionEl>
      <Container>
        {animate ? (
          <SectionHeader
            variants={tier === 'full' ? cinematicReveal : reducedReveal}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <SectionTitle>Your Training Programs</SectionTitle>
            <SectionSubtitle>
              Choose your protocol. Every tier includes AI-driven programming and NASM-protocol coaching.
            </SectionSubtitle>
          </SectionHeader>
        ) : (
          <SectionHeader>
            <SectionTitle>Your Training Programs</SectionTitle>
            <SectionSubtitle>
              Choose your protocol. Every tier includes AI-driven programming and NASM-protocol coaching.
            </SectionSubtitle>
          </SectionHeader>
        )}

        <ProgramsContainer>
          {PROGRAMS.map((program, i) => {
            const isPopular = program.badge === 'Most Popular';
            const card = (
              <ProgramCard
                key={program.name}
                $isPopular={isPopular}
                variant={isPopular ? 'purple' : 'cyan'}
                padding="32px 28px"
                interactive
              >
                {program.badge && <PopularBadge>{program.badge}</PopularBadge>}
                <ProgramName>{program.name}</ProgramName>
                <ProgramMeta>{program.meta}</ProgramMeta>
                <ProgramFeatures>
                  {program.features.map((feat) => (
                    <ProgramFeatureItem key={feat}>
                      <Check size={16} />
                      {feat}
                    </ProgramFeatureItem>
                  ))}
                </ProgramFeatures>
                <CtaWrap>
                  <ForgeButton
                    colorScheme={isPopular ? 'accent' : 'primary'}
                    onClick={() => navigate('/shop')}
                    style={{ width: '100%' }}
                  >
                    Get Started
                  </ForgeButton>
                </CtaWrap>
              </ProgramCard>
            );

            if (!animate) return <React.Fragment key={program.name}>{card}</React.Fragment>;

            return (
              <ScrollReveal
                key={program.name}
                delay={i * 0.12}
                blur={useBlur}
                direction="up"
                once
              >
                {card}
              </ScrollReveal>
            );
          })}
        </ProgramsContainer>
      </Container>
    </SectionEl>
  );
};

export default ProgramsSection;
