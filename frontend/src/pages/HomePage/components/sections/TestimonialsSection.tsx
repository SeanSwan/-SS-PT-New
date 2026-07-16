/**
 * TestimonialsSection -- Client success stories with star ratings
 * Tier-aware: full (parallax+blur+stagger), balanced (stagger), essential (static)
 */
import React, { useRef } from 'react';
import styled from 'styled-components';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Star } from 'lucide-react';
import { SectionEl, Container, SectionHeader, SectionTitle, SectionSubtitle, ParallaxBg } from '../shared/HomeStyles';
import { getReveal, staggerContainer } from '../shared/HomeAnimations';
import { TESTIMONIALS } from '../shared/HomeData';
import GlassCard from '../../../../components/ui-kit/glass/GlassCard';
import ScrollReveal from '../../../../components/ui-kit/cinematic/ScrollReveal';
import TypewriterText from '../../../../components/ui-kit/cinematic/TypewriterText';
import TextSplitter from '../../../../components/ui/animations/TextSplitter';
import { motionStyleProps } from '@/components/ui/motionStyleProps';
import { StyledBox } from '@/components/ui/StyledBox';

interface Props { tier: 'full' | 'balanced' | 'essential' }

const TestimonialGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: 1fr;
  gap: clamp(1.25rem, 3vw, 2rem);
  @media (min-width: 768px) { grid-template-columns: repeat(3, 1fr); }
`;
const StarsRow = styled.div`
  display: flex; gap: 4px; color: var(--accent-primary, #60C0F0); margin-bottom: 1rem;
`;
const Quote = styled.p`
  font-style: italic; font-size: 1rem; line-height: 1.7;
  color: var(--text-secondary, rgba(240, 240, 255, 0.7)); flex-grow: 1; margin: 0 0 1.5rem;
`;
const TestimonialAuthor = styled.span`
  font-size: 1rem; font-weight: 700; color: var(--text-primary, #E0ECF4); display: block;
`;
const TestimonialMeta = styled.span`
  font-size: 0.875rem; color: var(--text-secondary, rgba(240, 240, 255, 0.55));
  display: block; margin-top: 2px;
`;
const ResultBadge = styled.span`
  display: inline-block; margin-top: 0.75rem; padding: 4px 14px; border-radius: 999px;
  font-size: 0.8125rem; font-weight: 600; color: var(--accent-primary, #60C0F0);
  background: rgba(96, 192, 240, 0.15);
`;

const SUBTITLE = 'Real results from real people. No shortcuts \u2014 just elite-level coaching that works.';
const STARS = Array.from({ length: 5 }, (_, s) => <Star key={s} size={16} fill="currentColor" strokeWidth={0} />);

const TestimonialsSection: React.FC<Props> = ({ tier }) => {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start end', 'end start'] });
  const parallaxY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const animate = tier !== 'essential';
  const useBlur = tier === 'full';
  const reveal = getReveal(false);

  const title = tier === 'full'
    ? <TextSplitter text="Client Success Stories" />
    : tier === 'balanced'
      ? <TypewriterText text="Client Success Stories" />
      : <>Client Success Stories</>;

  const cardVariant = {
    hidden: { opacity: 0, y: 30, ...(useBlur ? { filter: 'blur(8px)' } : {}) },
    visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
  };

  const cards = TESTIMONIALS.map((t, i) => (
    <StyledBox as={GlassCard} key={i} variant="cyan" padding="1.75rem" disableBlur={tier === 'essential'}
      variants={animate ? cardVariant : undefined} $style={{ display: 'flex', flexDirection: 'column' }}>
      <StarsRow>{STARS}</StarsRow>
      <Quote>&ldquo;{t.quote}&rdquo;</Quote>
      <div>
        <TestimonialAuthor>{t.author}</TestimonialAuthor>
        <TestimonialMeta>{t.descriptor}</TestimonialMeta>
        <ResultBadge>{t.result}</ResultBadge>
      </div>
    </StyledBox>
  ));

  const header = (
    <SectionHeader>
      <SectionTitle>{title}</SectionTitle>
      <SectionSubtitle>{SUBTITLE}</SectionSubtitle>
    </SectionHeader>
  );

  return (
    <SectionEl ref={sectionRef}>
      {tier === 'full' && (
        <ParallaxBg $bgImage="/images/parallax/testimonials-swan-bg.png" $opacity={0.25} {...motionStyleProps({ y: parallaxY })} />
      )}
      <Container>
        {animate ? <ScrollReveal blur={useBlur} {...reveal}>{header}</ScrollReveal> : header}
        {animate ? (
          <TestimonialGrid variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}>
            {cards}
          </TestimonialGrid>
        ) : <TestimonialGrid>{cards}</TestimonialGrid>}
      </Container>
    </SectionEl>
  );
};

export default TestimonialsSection;
