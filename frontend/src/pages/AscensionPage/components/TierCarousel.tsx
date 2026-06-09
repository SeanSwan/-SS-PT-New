/**
 * FILE: TierCarousel.tsx
 * PURPOSE: Render mobile tier-card navigation for the Ascension subscription surface.
 * LAST VALIDATED: 2026-06-09 via TierCarousel contract and Ascension mobile Guardian smoke.
 */
import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  CarouselWrapper,
  Dot,
  DotIndicators,
  ScrollContainer,
} from './TierCarousel.styles';

interface TierCarouselProps {
  children: React.ReactNode;
  cardCount: number;
}

const TierCarousel: React.FC<TierCarouselProps> = ({ children, cardCount }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const getCards = useCallback((el: HTMLDivElement) => (
    Array.from(el.children).filter((child): child is HTMLElement => child instanceof HTMLElement)
  ), []);

  const getClosestIndex = useCallback((el: HTMLDivElement) => {
    const cards = getCards(el);
    if (cards.length === 0) return 0;

    const viewportCenter = el.scrollLeft + el.clientWidth / 2;
    return cards.reduce((closest, card, index) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const currentDistance = Math.abs(cardCenter - viewportCenter);
      const closestCard = cards[closest];
      const closestCenter = closestCard.offsetLeft + closestCard.offsetWidth / 2;
      const closestDistance = Math.abs(closestCenter - viewportCenter);
      return currentDistance < closestDistance ? index : closest;
    }, 0);
  }, [getCards]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setActiveIndex(Math.min(getClosestIndex(el), cardCount - 1));
  }, [cardCount, getClosestIndex]);

  const scrollToIndex = useCallback((index: number) => {
    const el = scrollRef.current;
    if (!el) return;

    const card = getCards(el)[index];
    if (!card) return;

    const left = card.offsetLeft + card.offsetWidth / 2 - el.clientWidth / 2;
    el.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
    setActiveIndex(index);
  }, [getCards]);

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
            onClick={() => scrollToIndex(i)}
            aria-label={`Go to card ${i + 1}`}
            aria-current={i === activeIndex ? 'true' : undefined}
            aria-pressed={i === activeIndex}
            type="button"
          />
        ))}
      </DotIndicators>
    </CarouselWrapper>
  );
};

export default TierCarousel;
