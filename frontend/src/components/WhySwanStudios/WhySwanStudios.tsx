/**
 * ============================================================================
 * FILE: WhySwanStudios.tsx
 * PURPOSE: Comparison section showing SwanStudios value vs generic AI (ChatGPT/Claude)
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-28
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders a visually compelling comparison grid showing
 * what SwanStudios offers that ChatGPT/Claude/generic AI chatbots cannot.
 * Used on homepage and about page to drive subscription conversions.
 *
 * HOW IT FITS IN THE APP: Homepage → between Features and Creative Expression.
 * Also embedded in About/Mission Statement page.
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

// ─────────────────────────────────────────────────────────────
// SECTION: Animations
// ─────────────────────────────────────────────────────────────

const subtleGlow = keyframes`
  0%, 100% { box-shadow: 0 0 20px rgba(96, 192, 240, 0.08); }
  50% { box-shadow: 0 0 30px rgba(96, 192, 240, 0.15); }
`;

const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Styled Components
// ─────────────────────────────────────────────────────────────

const Section = styled.section`
  position: relative;
  padding: 5rem 1.5rem;
  background: var(--bg-base, #030712);
  overflow: hidden;

  @media (max-width: 768px) {
    padding: 3rem 1rem;
  }
`;

const Container = styled.div`
  max-width: 1100px;
  margin: 0 auto;
`;

const SectionLabel = styled(motion.p)`
  font-family: 'Fira Code', monospace;
  font-size: 0.8125rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--accent-gold, #C6A84B);
  text-align: center;
  margin: 0 0 0.75rem;
`;

const Title = styled(motion.h2)`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 800;
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  color: var(--text-primary, #E0ECF4);
  text-align: center;
  margin: 0 0 0.75rem;
  line-height: 1.2;
`;

const Subtitle = styled(motion.p)`
  font-family: 'Sora', sans-serif;
  font-size: 1.0625rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.65));
  text-align: center;
  max-width: 640px;
  margin: 0 auto 3rem;
  line-height: 1.6;

  @media (max-width: 768px) {
    font-size: 0.9375rem;
    margin-bottom: 2rem;
  }
`;

const Tagline = styled.span`
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  color: var(--accent-primary, #60C0F0);
`;

const ComparisonGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;

  @media (min-width: 768px) {
    gap: 0.75rem;
  }
`;

const Row = styled(motion.div)<{ $isHeader?: boolean }>`
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr;
  gap: 0;
  border-radius: ${({ $isHeader }) => ($isHeader ? '1rem 1rem 0 0' : '0')};
  overflow: hidden;

  ${({ $isHeader }) =>
    $isHeader &&
    `
    position: sticky;
    top: 0;
    z-index: 2;
  `}

  @media (max-width: 640px) {
    grid-template-columns: 1.2fr 1fr 1fr;
  }
`;

const Cell = styled.div<{
  $type?: 'feature' | 'generic' | 'swan' | 'header';
  $isHeader?: boolean;
}>`
  padding: 1rem 1.25rem;
  font-family: 'Sora', sans-serif;
  font-size: 0.875rem;
  line-height: 1.5;
  border-bottom: 1px solid rgba(96, 192, 240, 0.08);

  ${({ $type, $isHeader }) => {
    if ($isHeader) {
      return `
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-weight: 700;
        font-size: 0.9375rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        padding: 1.25rem;
      `;
    }
    switch ($type) {
      case 'feature':
        return `
          color: var(--text-primary, #E0ECF4);
          font-weight: 600;
          background: var(--bg-surface, #1A1A24);
        `;
      case 'generic':
        return `
          color: var(--text-muted, rgba(224, 236, 244, 0.4));
          background: rgba(201, 42, 84, 0.04);
        `;
      case 'swan':
        return `
          color: var(--accent-primary, #60C0F0);
          font-weight: 500;
          background: rgba(96, 192, 240, 0.04);
        `;
      default:
        return '';
    }
  }}

  @media (max-width: 640px) {
    padding: 0.75rem 0.625rem;
    font-size: 0.75rem;
  }
`;

const HeaderCell = styled(Cell)`
  ${({ $type }) => {
    switch ($type) {
      case 'feature':
        return `
          background: var(--bg-elevated, #1A1A24);
          color: var(--text-secondary, rgba(224, 236, 244, 0.65));
        `;
      case 'generic':
        return `
          background: rgba(201, 42, 84, 0.08);
          color: rgba(201, 42, 84, 0.7);
        `;
      case 'swan':
        return `
          background: rgba(96, 192, 240, 0.08);
          color: var(--accent-primary, #60C0F0);
          position: relative;
          &::after {
            content: 'BEST';
            position: absolute;
            top: 0.5rem;
            right: 0.75rem;
            font-size: 0.625rem;
            font-weight: 800;
            color: var(--accent-gold, #C6A84B);
            letter-spacing: 0.1em;
          }
        `;
      default:
        return '';
    }
  }}
`;

const TableWrapper = styled(motion.div)`
  border-radius: 1rem;
  overflow: hidden;
  border: 1px solid rgba(96, 192, 240, 0.12);
  animation: ${subtleGlow} 4s ease-in-out infinite;

  @supports (backdrop-filter: blur(8px)) {
    backdrop-filter: blur(8px);
  }
`;

const BottomCTA = styled(motion.div)`
  text-align: center;
  margin-top: 2.5rem;
`;

const CTAButton = styled.button`
  font-family: 'Sora', sans-serif;
  font-weight: 700;
  font-size: 1rem;
  padding: 1rem 2.5rem;
  min-height: 56px;
  border-radius: 0.75rem;
  border: none;
  cursor: pointer;
  color: var(--text-primary, #E0ECF4);
  background: linear-gradient(135deg, var(--accent-secondary, #8B5CF6), var(--accent-primary, #60C0F0));
  background-size: 200% 200%;
  animation: ${shimmer} 3s ease infinite;
  transition: box-shadow 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94),
              transform 0.2s;

  &:hover {
    box-shadow: 0 0 28px 6px rgba(139, 92, 246, 0.35),
                0 0 12px 2px rgba(96, 192, 240, 0.25);
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }

  @media (max-width: 640px) {
    font-size: 0.9375rem;
    padding: 0.875rem 2rem;
    min-height: 48px;
  }
`;

const PricingCallout = styled(motion.div)`
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  max-width: 640px;
  margin: 0 auto 3rem;
  padding: 1.25rem 1.5rem;
  border-radius: 1rem;
  background: rgba(198, 168, 75, 0.06);
  border: 1px solid rgba(198, 168, 75, 0.2);

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 1rem;
    margin-bottom: 2rem;
  }
`;

const PricingIcon = styled.div`
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-gold, #C6A84B);
`;

const PricingTitle = styled.p`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 700;
  font-size: 0.9375rem;
  color: var(--accent-gold, #C6A84B);
  margin: 0 0 0.375rem;
`;

const PricingText = styled.p`
  font-family: 'Sora', sans-serif;
  font-size: 0.8125rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.65));
  margin: 0;
  line-height: 1.6;

  strong {
    color: var(--text-primary, #E0ECF4);
  }
`;

const CTASubtext = styled.p`
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
  color: var(--text-muted, rgba(224, 236, 244, 0.4));
  margin-top: 0.75rem;
`;

// ─────────────────────────────────────────────────────────────
// SECTION: Comparison Data
// ─────────────────────────────────────────────────────────────

const COMPARISONS = [
  { feature: 'Workout Logging', generic: 'No', swan: 'Full logger — sets, reps, weight, tempo, form ratings' },
  { feature: 'Progress Tracking', generic: 'No', swan: '50+ Victory charts, 1RM trends, body comp over time' },
  { feature: 'NASM OPT Protocol', generic: 'Generic advice', swan: '5-phase periodization, tempo prescriptions, correct %1RM' },
  { feature: 'Exercise Library', generic: 'Can describe exercises', swan: '900+ exercises with instructions, equipment, difficulty' },
  { feature: 'Trainer Knowledge', generic: 'Generic AI', swan: 'AI trained on 26+ years of NASM-protocol methodology' },
  { feature: 'Community', generic: 'Zero', swan: 'Social feed, challenges, friends, leaderboards' },
  { feature: 'Gamification', generic: 'Zero', swan: 'XP, badges, 5-tier progression, skill trees, streaks' },
  { feature: 'Persistent History', generic: 'Forgets each chat', swan: 'Remembers every workout, every PR, every trend' },
  { feature: 'Nutrition Tracking', generic: 'Can suggest meals', swan: 'Macro counter with daily tracking and goals' },
  { feature: 'Trainer Connection', generic: 'None', swan: 'Direct messaging with real NASM-protocol trainers' },
];

// ─────────────────────────────────────────────────────────────
// SECTION: Animation Variants
// ─────────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.2 },
  },
};

const rowVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
};

// ─────────────────────────────────────────────────────────────
// SECTION: Component
// ─────────────────────────────────────────────────────────────

interface WhySwanStudiosProps {
  showCTA?: boolean;
}

const WhySwanStudios: React.FC<WhySwanStudiosProps> = ({ showCTA = true }) => {
  const navigate = useNavigate();

  return (
    <Section>
      <Container>
        <SectionLabel
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          Why SwanStudios
        </SectionLabel>

        <Title
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Tagline>ChatGPT forgets you.</Tagline> SwanStudios remembers every rep.
        </Title>

        <Subtitle
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          Generic AI chatbots can answer fitness questions — but they can't log your workouts,
          track your progress, connect you with trainers, or build a community around your goals.
          SwanStudios is a complete fitness platform with AI built in, not just a chatbot.
        </Subtitle>

        <PricingCallout
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          <PricingIcon aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </PricingIcon>
          <div>
            <PricingTitle>Community first, not profit first</PricingTitle>
            <PricingText>
              Big tech charges $20/month for a chatbot that forgets you exist.
              SwanStudios offers a full fitness platform — free to start, and our Pro tier
              is <strong>donation-based</strong> so everyone can access AI coaching regardless
              of budget. Pay what you can. Your fitness journey shouldn't depend on your wallet.
            </PricingText>
          </div>
        </PricingCallout>

        <TableWrapper
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.6 }}
        >
          {/* Header row */}
          <Row $isHeader>
            <HeaderCell $type="feature" $isHeader>
              What You Get
            </HeaderCell>
            <HeaderCell $type="generic" $isHeader>
              ChatGPT / Claude
            </HeaderCell>
            <HeaderCell $type="swan" $isHeader>
              SwanStudios
            </HeaderCell>
          </Row>

          {/* Data rows */}
          <ComparisonGrid
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
          >
            {COMPARISONS.map((row, i) => (
              <Row key={i} as={motion.div} variants={rowVariants}>
                <Cell $type="feature">{row.feature}</Cell>
                <Cell $type="generic">{row.generic}</Cell>
                <Cell $type="swan">{row.swan}</Cell>
              </Row>
            ))}
          </ComparisonGrid>
        </TableWrapper>

        {showCTA && (
          <BottomCTA
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <CTAButton onClick={() => navigate('/signup')}>
              Start Free — No Credit Card Needed
            </CTAButton>
            <CTASubtext>
              Free tier includes workout logging, nutrition tracking, and 3 AI messages/month
            </CTASubtext>
          </BottomCTA>
        )}
      </Container>
    </Section>
  );
};

export default WhySwanStudios;
