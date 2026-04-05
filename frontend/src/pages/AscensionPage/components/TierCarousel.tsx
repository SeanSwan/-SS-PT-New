import React, { useRef, useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';

interface TierCarouselProps {
  children: React.ReactNode;
  cardCount: number;
}

const TierCarousel: React.FC<TierCarouselProps> = ({ children, cardCount }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollLeft = el.scrollLeft;
    const cardWidth = el.scrollWidth / cardCount;
    const idx = Math.round(scrollLeft / cardWidth);
    setActiveIndex(Math.min(idx, cardCount - 1));
  }, [cardCount]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return (
    <CarouselWrapper>
      <ScrollContainer ref={scrollRef} role="region" aria-label="Subscription tier cards">
        {children}
      </ScrollContainer>
      <DotIndicators aria-label="Carousel position">
        {Array.from({ length: cardCount }).map((_, i) => (
          <Dot
            key={i}
            $active={i === activeIndex}
            onClick={() => {
              const el = scrollRef.current;
              if (!el) return;
              const cardWidth = el.scrollWidth / cardCount;
              el.scrollTo({ left: cardWidth * i, behavior: 'smooth' });
            }}
            aria-label={`Go to card ${i + 1}`}
            aria-current={i === activeIndex ? 'true' : undefined}
          />
        ))}
      </DotIndicators>
    </CarouselWrapper>
  );
};

export default TierCarousel;

const CarouselWrapper = styled.div`
  width: 100%;
  overflow: hidden;
`;

const ScrollContainer = styled.div`
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  gap: 1rem;
  padding: 0 7.5vw;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }

  & > * {
    flex: 0 0 85vw;
    scroll-snap-align: center;
  }
`;

const DotIndicators = styled.div`
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  padding: 1.5rem 0 0.5rem;
`;

const Dot = styled.button<{ $active: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: none;
  padding: 0;
  min-width: 44px;
  min-height: 44px;
  cursor: pointer;
  background: transparent;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${({ $active }) => $active ? '#60C0F0' : 'rgba(224, 236, 244, 0.2)'};
    transition: background 0.3s, transform 0.3s;
    ${({ $active }) => $active && 'transform: translate(-50%, -50%) scale(1.3);'}
  }
`;
