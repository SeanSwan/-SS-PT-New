/**
 * Video V-next — VideoRefractionHero (Kimi (e) mechanism). The signature is genuine optics, not a UI kit:
 * RGB channel-split chromatic aberration on the title — three layered copies of the SAME text, channels
 * offset a couple px and converging to 0 on the Crystallize charge. Cool Crystalline spectrum ONLY (Kimi (b)2):
 * ice-blue + white + ONE restrained royal-purple terminal fringe — never magenta, never equal-weight rainbow.
 * Transform-only (the offset is a CSS var, mix-blend screen). Reduced/essential → resolved (offset 0) = the
 * static frame. One clean visible <h1>; the color ghosts are aria-hidden. Scrim is minimal — dispersion sits
 * behind the title, not a gray band over it.
 */
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import styled from 'styled-components';
import { useAnimationTier } from '../../hooks/useAnimationTier';
import { useCrystallizeTransition, CrystallizeOverlay } from './lensBindings';

const Hero = styled.header<{ $charged: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 16px;
  padding: clamp(40px, 9vh, 96px) var(--video-pad, 24px) clamp(24px, 4vh, 48px);
  --split: ${({ $charged }) => ($charged ? '0px' : '2px')};
  background: radial-gradient(120% 90% at 50% 0%, var(--video-ice-soft), transparent 62%);
`;
const Kicker = styled.span`
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--video-ice);
`;
const TitleWrap = styled.div`
  position: relative;
  isolation: isolate;
`;
const baseTitle = `
  margin: 0;
  font: 800 clamp(30px, 7vw, 64px) / 1.03 var(--video-font-display, inherit);
  letter-spacing: -0.01em;
`;
const Title = styled.h1`
  ${baseTitle}
  color: var(--video-ink);
  position: relative;
  z-index: 2;
`;
// two aria-hidden channel ghosts, offset by ±--split, converging on charge
const Ghost = styled.span<{ $dir: 1 | -1; $tone: string }>`
  ${baseTitle}
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  color: ${({ $tone }) => $tone};
  mix-blend-mode: screen;
  transform: translateX(calc(var(--split) * ${({ $dir }) => $dir}));
  transition: transform 900ms var(--video-ease-crystallize);
`;
const Sub = styled.p`
  margin: 0;
  font-size: clamp(14px, 2.2vw, 18px);
  color: var(--video-ink-2);
  max-width: 52ch;
`;

export function VideoRefractionHero({ title, subtitle }: { title: string; subtitle: string }) {
  const tier = useAnimationTier();
  const prefersReduced = useReducedMotion();
  const active = tier !== 'essential' && !prefersReduced;
  const [charged, setCharged] = useState(!active);
  const fired = useRef(false);
  const hostRef = useRef<HTMLElement>(null);
  const { overlayProps, crystallizeTo } = useCrystallizeTransition({ surfaceId: 'video.hero' });

  useEffect(() => {
    const host = hostRef.current;
    if (fired.current || !active || !host) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || fired.current) return;
        fired.current = true;
        io.disconnect();
        // brief hold so the aberration is visible, then converge on the charge beat
        crystallizeTo(() => setCharged(true), { settleAnnouncement: 'Video library' });
      },
      { threshold: 0.4 },
    );
    io.observe(host);
    return () => io.disconnect();
  }, [active, crystallizeTo]);

  return (
    <Hero ref={hostRef} $charged={charged} data-testid="video-hero">
      <Kicker>SwanStudios film library</Kicker>
      <TitleWrap>
        <Ghost aria-hidden="true" $dir={-1} $tone="var(--video-ice)">
          {title}
        </Ghost>
        <Ghost aria-hidden="true" $dir={1} $tone="var(--video-wing)">
          {title}
        </Ghost>
        <Title>{title}</Title>
      </TitleWrap>
      <Sub>{subtitle}</Sub>
      <CrystallizeOverlay {...overlayProps} />
    </Hero>
  );
}
