/**
 * CTASection — Final call-to-action for the About page
 */

import React from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import ForgeButton from '../../../../components/ui/forge/ForgeButton'; // Forge strangler (was GlowButton)
import ScrollReveal from '../../../../components/ui-kit/cinematic/ScrollReveal';
import TextSplitter from '../../../../components/ui/animations/TextSplitter';
import { SectionEl, Container, AccentLine } from '../shared/AboutStyles';

interface CTASectionProps {
  tier: 'full' | 'balanced' | 'essential';
}

const CTABlock = styled.div`
  text-align: center;
  max-width: 680px;
  margin: 0 auto;

  @media (min-width: 2560px) { max-width: 900px; }
  @media (min-width: 3840px) { max-width: 1200px; }
`;

const CTAHeading = styled.h2`
  font-family: 'Cormorant Garamond', serif;
  font-size: clamp(1.75rem, 4vw, 2.75rem);
  color: var(--text-primary, #E0ECF4);
  margin: 0 0 1rem;

  @media (max-width: 320px) { font-size: 1.4rem; }
  @media (min-width: 2560px) { font-size: 3.5rem; }
`;

const CTADescription = styled.p`
  font-size: 1.1rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.65));
  margin: 0 0 2rem;
  line-height: 1.7;

  @media (max-width: 320px) { font-size: 0.9rem; }
  @media (min-width: 2560px) { font-size: 1.4rem; }
`;

const CTAButtons = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;

  @media (max-width: 320px) {
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }
`;

const CTASection: React.FC<CTASectionProps> = ({ tier }) => {
  const navigate = useNavigate();
  const isEssential = tier === 'essential';
  const isFull = tier === 'full';

  return (
    <SectionEl>
      <Container>
        <ScrollReveal disabled={isEssential}>
          <CTABlock>
            <CTAHeading>
              {isFull ? (
                <TextSplitter text="Ready to Transform?" as="span" mode="words" />
              ) : (
                'Ready to Transform?'
              )}
            </CTAHeading>
            <AccentLine />
            <CTADescription>
              Whether you are just starting out or looking to break through a plateau,
              SwanStudios has the expertise and technology to get you there. Take the
              first step today.
            </CTADescription>
            <CTAButtons>
              <ForgeButton
                text="Start Your Journey"
                variant="accent"
                size="large"
                onClick={() => navigate('/shop')}
              />
              <ForgeButton
                text="Contact Us"
                variant="ghost"
                size="large"
                onClick={() => navigate('/contact')}
              />
            </CTAButtons>
          </CTABlock>
        </ScrollReveal>
      </Container>
    </SectionEl>
  );
};

export default CTASection;
