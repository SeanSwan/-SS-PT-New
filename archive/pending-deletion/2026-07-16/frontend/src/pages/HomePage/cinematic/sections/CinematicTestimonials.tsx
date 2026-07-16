/**
 * CinematicTestimonials.tsx — Testimonial carousel with stats metrics.
 */

import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Star, ChevronLeft, ChevronRight, ArrowRight, Quote } from 'lucide-react';

import type { CinematicTokens } from '../cinematic-tokens';
import type { Testimonial } from '../HomepageContent';
import { staggerContainer, staggerItem, defaultViewport } from '../cinematic-animations';
import { SectionShell, SectionBackground, SectionHeading, SectionDescription } from '../cinematic-shared';

interface Props {
  sectionTitle: string;
  sectionDescription: string;
  items: Testimonial[];
  tokens: CinematicTokens;
}

interface TP { $tokens: CinematicTokens }

const TestimonialCard = styled(motion.div)<TP>`
  background: ${({ $tokens }) => $tokens.palette.glass};
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid ${({ $tokens }) => $tokens.palette.glassBorder};
  border-radius: ${({ $tokens }) => $tokens.surface.cardRadius};
  padding: 2.5rem;
  max-width: 800px;
  margin: 0 auto;
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const HeaderLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const Name = styled.h3<TP>`
  font-family: ${({ $tokens }) => $tokens.typography.headingFamily};
  font-weight: 700;
  font-size: 1.25rem;
  color: ${({ $tokens }) => $tokens.palette.textPrimary};
  margin: 0;
`;

const Duration = styled.p<TP>`
  font-family: ${({ $tokens }) => $tokens.typography.bodyFamily};
  font-size: 0.85rem;
  color: ${({ $tokens }) => $tokens.palette.textSecondary};
  margin: 0;
`;

const CategoryBadge = styled.span<TP>`
  padding: 0.375rem 1rem;
  border-radius: 1.5rem;
  font-family: ${({ $tokens }) => $tokens.typography.headingFamily};
  font-weight: 600;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  background: ${({ $tokens }) => `${$tokens.palette.gaming}15`};
  color: ${({ $tokens }) => $tokens.palette.gaming};
  border: 1px solid ${({ $tokens }) => `${$tokens.palette.gaming}30`};
`;

const Stars = styled.div<TP>`
  display: flex;
  gap: 2px;
  color: ${({ $tokens }) => $tokens.palette.accent};
  margin-bottom: 1rem;
`;

const QuoteText = styled.p<TP>`
  font-family: ${({ $tokens }) => $tokens.typography.dramaFamily};
  font-style: italic;
  font-size: clamp(1rem, 2vw, 1.15rem);
  color: ${({ $tokens }) => $tokens.palette.textPrimary};
  line-height: 1.8;
  margin: 0 0 1.5rem;
  position: relative;
  padding-left: 2rem;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    border-radius: 2px;
    background: linear-gradient(to bottom, ${({ $tokens }) => $tokens.palette.accent}, ${({ $tokens }) => $tokens.palette.gaming});
  }
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;

  @media (max-width: 430px) {
    grid-template-columns: 1fr;
  }
`;

const MetricItem = styled.div<TP>`
  padding: 1rem;
  border-radius: 1rem;
  background: ${({ $tokens }) => `${$tokens.palette.surface}`};
  border: 1px solid ${({ $tokens }) => $tokens.palette.border};
  text-align: center;
`;

const MetricLabel = styled.div<TP>`
  font-family: ${({ $tokens }) => $tokens.typography.monoFamily};
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ $tokens }) => $tokens.palette.textSecondary};
  margin-bottom: 0.5rem;
`;

const MetricValues = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  flex-wrap: wrap;
`;

const MetricBefore = styled.span<TP>`
  font-family: ${({ $tokens }) => $tokens.typography.bodyFamily};
  font-size: 0.85rem;
  color: ${({ $tokens }) => $tokens.palette.textSecondary};
`;

const MetricArrow = styled.span<TP>`
  color: ${({ $tokens }) => $tokens.palette.accent};
  font-size: 0.8rem;
`;

const MetricAfter = styled.span<TP>`
  font-family: ${({ $tokens }) => $tokens.typography.headingFamily};
  font-weight: 700;
  font-size: 1rem;
  color: ${({ $tokens }) => $tokens.palette.textPrimary};
`;

const MetricChange = styled.span<TP>`
  font-family: ${({ $tokens }) => $tokens.typography.monoFamily};
  font-size: 0.75rem;
  color: ${({ $tokens }) => $tokens.palette.gaming};
`;

const ProgramLink = styled(Link)<TP>`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-family: ${({ $tokens }) => $tokens.typography.bodyFamily};
  font-size: 0.9rem;
  color: ${({ $tokens }) => $tokens.palette.accent};
  text-decoration: none;
  min-height: 44px;

  &:hover {
    text-decoration: underline;
  }
`;

const NavRow = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 2rem;
`;

const NavBtn = styled.button<TP>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid ${({ $tokens }) => $tokens.palette.border};
  background: transparent;
  color: ${({ $tokens }) => $tokens.palette.textSecondary};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${({ $tokens }) => $tokens.palette.accent};
    color: ${({ $tokens }) => $tokens.palette.accent};
  }
`;

const Dots = styled.div`
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  margin-top: 1rem;
`;

const Dot = styled.button<TP & { $active: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  background: ${({ $tokens, $active }) =>
    $active ? $tokens.palette.accent : $tokens.palette.border};
  transition: background 0.2s ease;
`;

const CinematicTestimonials: React.FC<Props> = ({
  sectionTitle,
  sectionDescription,
  items,
  tokens,
}) => {
  const [idx, setIdx] = useState(0);
  const item = items[idx];

  const prev = useCallback(() => setIdx((i) => (i === 0 ? items.length - 1 : i - 1)), [items.length]);
  const next = useCallback(() => setIdx((i) => (i === items.length - 1 ? 0 : i + 1)), [items.length]);

  return (
    <SectionBackground $tokens={tokens} $variant="surface">
      <SectionShell $tokens={tokens}>
        <motion.div
          variants={staggerContainer(tokens.motion)}
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
        >
          <motion.div variants={staggerItem(tokens.motion)} style={{ textAlign: 'center' }}>
            <SectionHeading $tokens={tokens} style={{ textAlign: 'center', margin: '0 auto 1rem' }}>
              {sectionTitle}
            </SectionHeading>
          </motion.div>
          <motion.div variants={staggerItem(tokens.motion)} style={{ textAlign: 'center', display: 'flex', justifyContent: 'center' }}>
            <SectionDescription $tokens={tokens} style={{ textAlign: 'center' }}>
              {sectionDescription}
            </SectionDescription>
          </motion.div>

          <motion.div variants={staggerItem(tokens.motion)}>
            <AnimatePresence mode="wait">
              <TestimonialCard
                key={item.name}
                $tokens={tokens}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.3 }}
              >
                <CardHeader>
                  <HeaderLeft>
                    <Name $tokens={tokens}>{item.name}</Name>
                    <Duration $tokens={tokens}>{item.duration}</Duration>
                  </HeaderLeft>
                  <CategoryBadge $tokens={tokens}>{item.category}</CategoryBadge>
                </CardHeader>

                <Stars $tokens={tokens}>
                  {Array.from({ length: item.rating }, (_, i) => (
                    <Star key={i} size={14} fill="currentColor" />
                  ))}
                </Stars>

                <QuoteText $tokens={tokens}>{item.quote}</QuoteText>

                <MetricsGrid>
                  {item.metrics.map((m) => (
                    <MetricItem key={m.label} $tokens={tokens}>
                      <MetricLabel $tokens={tokens}>{m.label}</MetricLabel>
                      <MetricValues>
                        <MetricBefore $tokens={tokens}>{m.before}</MetricBefore>
                        <MetricArrow $tokens={tokens}>&rarr;</MetricArrow>
                        <MetricAfter $tokens={tokens}>{m.after}</MetricAfter>
                        <MetricChange $tokens={tokens}>({m.change})</MetricChange>
                      </MetricValues>
                    </MetricItem>
                  ))}
                </MetricsGrid>

                {item.programLink && (
                  <ProgramLink to={item.programLink.path} $tokens={tokens}>
                    {item.programLink.label} <ArrowRight size={14} />
                  </ProgramLink>
                )}
              </TestimonialCard>
            </AnimatePresence>

            {items.length > 1 && (
              <>
                <NavRow>
                  <NavBtn $tokens={tokens} onClick={prev} aria-label="Previous testimonial">
                    <ChevronLeft size={20} />
                  </NavBtn>
                  <NavBtn $tokens={tokens} onClick={next} aria-label="Next testimonial">
                    <ChevronRight size={20} />
                  </NavBtn>
                </NavRow>
                <Dots>
                  {items.map((_, i) => (
                    <Dot
                      key={i}
                      $tokens={tokens}
                      $active={i === idx}
                      onClick={() => setIdx(i)}
                      aria-label={`Go to testimonial ${i + 1}`}
                    />
                  ))}
                </Dots>
              </>
            )}
          </motion.div>
        </motion.div>
      </SectionShell>
    </SectionBackground>
  );
};

export default CinematicTestimonials;
