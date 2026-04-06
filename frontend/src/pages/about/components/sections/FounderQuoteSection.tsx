/**
 * FounderQuoteSection — Gold-bordered glass card with Sean's founding quote
 */

import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import ScrollReveal from '../../../../components/ui-kit/cinematic/ScrollReveal';
import TextSplitter from '../../../../components/ui/animations/TextSplitter';
import { SectionEl, Container } from '../shared/AboutStyles';
import { getReveal } from '../shared/AboutAnimations';

interface FounderQuoteSectionProps {
  tier: 'full' | 'balanced' | 'essential';
}

const QuoteCard = styled(motion.div)`
  max-width: 800px;
  margin: 0 auto;
  padding: clamp(2rem, 5vw, 3.5rem);
  background: rgba(20, 20, 25, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(198, 168, 75, 0.15);
  border-radius: 16px;
  text-align: center;
  transition: border-color 0.4s ease;

  &:hover {
    border-color: rgba(198, 168, 75, 0.35);
  }
`;

const QuoteText = styled.p`
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  font-size: clamp(1.25rem, 3vw, 1.75rem);
  line-height: 1.6;
  color: var(--text-primary, #E0ECF4);
  margin: 0 0 1rem;
`;

const QuoteAuthor = styled.p`
  color: var(--accent-gold, #C6A84B);
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
`;

const FounderQuoteSection: React.FC<FounderQuoteSectionProps> = ({ tier }) => {
  const isEssential = tier === 'essential';
  const isFull = tier === 'full';

  return (
    <SectionEl>
      <Container>
        <ScrollReveal disabled={isEssential}>
          <QuoteCard>
            <QuoteText>
              {isFull ? (
                <>
                  &ldquo;
                  <TextSplitter
                    text="I'm not building this to get rich. I'm building this because people deserve a platform that's actually on their side."
                    as="span"
                    mode="words"
                  />
                  &rdquo;
                </>
              ) : (
                <>&ldquo;I&rsquo;m not building this to get rich. I&rsquo;m building this because people deserve a platform that&rsquo;s actually on their side.&rdquo;</>
              )}
            </QuoteText>
            <QuoteAuthor>— Sean Swan, Founder</QuoteAuthor>
          </QuoteCard>
        </ScrollReveal>
      </Container>
    </SectionEl>
  );
};

export default FounderQuoteSection;
