import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import styled from 'styled-components';
import { useReducedMotion } from '../../../hooks/useReducedMotion';

interface ParallaxHeroProps {
  videoSrc?: string;
  imageSrc?: string;
  overlayOpacity?: number;
  parallaxSpeed?: number;
  children: React.ReactNode;
  minHeight?: string;
  className?: string;
}

const HeroContainer = styled.section<{ $minHeight: string }>`
  position: relative;
  min-height: ${({ $minHeight }) => $minHeight};
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  width: 100%;
`;

const MediaWrapper = styled(motion.div)`
  position: absolute;
  inset: -10% 0;
  width: 100%;
  height: 120%;
  z-index: 0;
`;

const Video = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
  /* Fallback background when video can't autoplay (mobile Low Power Mode, Data Saver) */
  background: linear-gradient(135deg, #0a0a1a 0%, #1a1a3c 50%, #0a0a1a 100%);
  background-size: cover;
`;

const Image = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const Overlay = styled.div<{ $opacity: number }>`
  position: absolute;
  inset: 0;
  z-index: 1;
  background: linear-gradient(
    180deg,
    rgba(0, 0, 0, ${({ $opacity }) => $opacity * 0.8}) 0%,
    rgba(0, 0, 0, ${({ $opacity }) => $opacity}) 50%,
    rgba(0, 0, 0, ${({ $opacity }) => $opacity * 0.9}) 100%
  );
`;

const ContentWrapper = styled.div`
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
`;

const ParallaxHero: React.FC<ParallaxHeroProps> = ({
  videoSrc,
  imageSrc,
  overlayOpacity = 0.6,
  parallaxSpeed = 0.3,
  children,
  minHeight = '100vh',
  className,
}) => {
  const containerRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, parallaxSpeed * 300]);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const disableParallax = prefersReducedMotion || isMobile;

  return (
    <HeroContainer ref={containerRef} $minHeight={minHeight} className={className}>
      <MediaWrapper style={disableParallax ? {} : { y }}>
        {videoSrc ? (
          <Video
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={imageSrc}
          >
            <source src={videoSrc} type="video/mp4" />
          </Video>
        ) : imageSrc ? (
          <Image src={imageSrc} alt="" loading="eager" />
        ) : null}
      </MediaWrapper>

      <Overlay $opacity={overlayOpacity} />

      <ContentWrapper>
        {children}
      </ContentWrapper>
    </HeroContainer>
  );
};

export default ParallaxHero;
