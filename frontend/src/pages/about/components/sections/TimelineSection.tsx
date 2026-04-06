/**
 * TimelineSection — Career milestones (2000-2024) alternating left/right
 */

import React from 'react';
import styled from 'styled-components';
import ScrollReveal from '../../../../components/ui-kit/cinematic/ScrollReveal';
import TextSplitter from '../../../../components/ui/animations/TextSplitter';
import { SectionEl, Container, SectionTitle, AccentLine, SectionSubtitle } from '../shared/AboutStyles';
import { milestones } from '../shared/AboutData';

interface TimelineSectionProps {
  tier: 'full' | 'balanced' | 'essential';
}

const TimelineWrapper = styled.div`
  position: relative;
  padding: 2rem 0;

  &::before {
    content: '';
    position: absolute;
    left: 50%;
    top: 0;
    bottom: 0;
    width: 2px;
    background: rgba(96, 192, 240, 0.2);
    transform: translateX(-50%);
    @media (max-width: 768px) { left: 1.5rem; }
    @media (max-width: 320px) { left: 1rem; }
  }
`;

const TimelineItem = styled.div<{ $align: 'left' | 'right' }>`
  display: flex;
  justify-content: ${({ $align }) => $align === 'left' ? 'flex-end' : 'flex-start'};
  padding: ${({ $align }) => $align === 'left' ? '0 calc(50% + 2rem) 0 0' : '0 0 0 calc(50% + 2rem)'};
  margin-bottom: 2rem;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    left: 50%;
    top: 0.75rem;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--accent-primary, #60C0F0);
    border: 3px solid var(--bg-base, #0A0A0F);
    transform: translateX(-50%);
    z-index: 1;
    box-shadow: 0 0 10px rgba(96, 192, 240, 0.4);
    @media (max-width: 768px) { left: 1.5rem; }
    @media (max-width: 320px) { left: 1rem; }
  }

  @media (max-width: 768px) {
    justify-content: flex-start;
    padding: 0 0 0 3.5rem;
  }
  @media (max-width: 320px) {
    padding: 0 0 0 2.5rem;
    margin-bottom: 1.5rem;
  }
  @media (min-width: 2560px) { margin-bottom: 3rem; }
`;

const TimelineCard = styled.div`
  max-width: 460px;
  padding: 1.5rem;
  border-radius: 12px;
  background: var(--bg-surface, rgba(26, 26, 36, 0.8));
  backdrop-filter: blur(24px) saturate(1.4);
  border: 1px solid rgba(96, 192, 240, 0.08);
  transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;

  &:hover {
    border-color: rgba(96, 192, 240, 0.3);
    box-shadow: 0 0 16px rgba(96, 192, 240, 0.1), 0 4px 16px rgba(0, 0, 0, 0.2);
  }

  @media (max-width: 320px) { padding: 1rem; max-width: 100%; }
  @media (min-width: 2560px) { max-width: 600px; padding: 2rem; border-radius: 16px; }
`;

const TimelineYear = styled.span`
  display: inline-block;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--accent-primary, #60C0F0);
  margin-bottom: 0.35rem;

  @media (max-width: 320px) { font-size: 0.95rem; }
  @media (min-width: 2560px) { font-size: 1.4rem; }
`;

const TimelineDescription = styled.p`
  font-size: 0.95rem;
  color: var(--text-body, rgba(224, 236, 244, 0.85));
  margin: 0;
  line-height: 1.6;

  @media (max-width: 320px) { font-size: 0.85rem; }
  @media (min-width: 2560px) { font-size: 1.2rem; }
`;

const TimelineSection: React.FC<TimelineSectionProps> = ({ tier }) => {
  const isEssential = tier === 'essential';
  const isFull = tier === 'full';

  return (
    <SectionEl>
      <Container>
        <ScrollReveal disabled={isEssential}>
          <SectionTitle>
            {isFull ? <TextSplitter text="Our Journey" as="span" mode="words" /> : 'Our Journey'}
          </SectionTitle>
          <AccentLine />
          <SectionSubtitle>
            Key milestones in Sean Swan's career and the evolution of SwanStudios.
          </SectionSubtitle>
        </ScrollReveal>

        <TimelineWrapper>
          {milestones.map((m, i) => {
            const align = i % 2 === 0 ? 'left' : 'right';
            return (
              <ScrollReveal
                key={m.year}
                direction={isEssential ? undefined : (align === 'left' ? 'left' : 'right')}
                delay={isEssential ? 0 : i * 0.08}
                disabled={isEssential}
              >
                <TimelineItem $align={align as 'left' | 'right'}>
                  <TimelineCard>
                    <TimelineYear>{m.year}</TimelineYear>
                    <TimelineDescription>{m.text}</TimelineDescription>
                  </TimelineCard>
                </TimelineItem>
              </ScrollReveal>
            );
          })}
        </TimelineWrapper>
      </Container>
    </SectionEl>
  );
};

export default TimelineSection;
