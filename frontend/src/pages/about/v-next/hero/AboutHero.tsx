/**
 * About V-next — AboutHero (Kimi direction (d)). The swan is an ABSENCE: caustic light field (CausticCanvas)
 * with a dark glass-edged swan occluder (SwanMark) rimmed by an accent filament. On first in-view the field
 * charges + the rim draws, then settles to "moonlit water" as the frozen headline + credential reveal inside
 * the clear zone. Credential line is ONE whole container (NO per-letter/word split — contract-test + a11y);
 * one clean <h1>. Dual-Button-Glow "Book Consultation". Reduced/essential tier → the static settled frame.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useAnimationTier } from '../../../../hooks/useAnimationTier';
import { YEARS_EXPERIENCE_CLAIM } from '../../../../content/marketingStats';
import { useCrystallizeTransition, CrystallizeOverlay } from '../lensBindings';
import { SwanMark } from './SwanMark';
import { CausticCanvas } from './CausticCanvas';

const Section = styled.section`
  position: relative;
  min-height: min(88svh, 780px);
  display: grid;
  place-items: center;
  overflow: hidden;
  padding: clamp(48px, 10vh, 120px) var(--about-pad, 24px);
  background: radial-gradient(120% 100% at 50% 8%, var(--about-caustic-lo), var(--about-bg) 72%);
`;
const MarkLayer = styled.div`
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  z-index: 1;
  pointer-events: none;
  & > svg {
    width: min(72vmin, 560px);
    height: min(72vmin, 560px);
    filter: drop-shadow(0 0 46px var(--about-ice-soft));
  }
`;
const Scrim = styled.div`
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  background: radial-gradient(52% 40% at 50% 52%, var(--about-scrim), transparent 74%);
`;
const Content = styled.div`
  position: relative;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 18px;
  max-width: 760px;
`;
const Credential = styled(motion.p)`
  margin: 0;
  font-size: clamp(11px, 1.6vw, 13px);
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--about-ice);
`;
const Headline = styled(motion.h1)`
  margin: 0;
  font: 800 clamp(32px, 7.5vw, 68px) / 1.04 var(--about-font-display, inherit);
  letter-spacing: -0.01em;
  color: var(--about-ink);
  text-wrap: balance;
`;
const Sub = styled.p`
  margin: 0;
  font-size: clamp(15px, 2.4vw, 18px);
  color: var(--about-ink-2);
  max-width: 52ch;
`;
const Cta = styled.button<{ $ignited: boolean }>`
  min-height: 52px;
  margin-top: 6px;
  padding: 0 28px;
  border-radius: 999px;
  border: 1px solid color-mix(in oklab, var(--about-ice) 40%, transparent);
  background: color-mix(in oklab, var(--about-ice) 22%, var(--about-surface) 78%);
  color: var(--about-ink);
  font: 800 16px / 1 var(--about-font-display, inherit);
  cursor: pointer;
  box-shadow: ${({ $ignited }) => ($ignited ? '0 0 0 1px var(--about-glow), 0 0 34px -6px var(--about-glow)' : 'var(--about-elev-1)')};
  transition: box-shadow 320ms var(--about-ease-crystallize), filter 160ms var(--about-ease-standard);
  &:hover {
    filter: brightness(1.08);
  }
`;

// Credential label — a SINGLE frozen string (never split for reveal). Uses only contract-safe phrasing.
const CREDENTIAL = `${YEARS_EXPERIENCE_CLAIM} years · NCEP-certified · NASM-protocol`;

export function AboutHero() {
  const navigate = useNavigate();
  const tier = useAnimationTier();
  const prefersReduced = useReducedMotion();
  const active = tier !== 'essential' && !prefersReduced;

  const hostRef = useRef<HTMLElement>(null);
  const [charged, setCharged] = useState(!active);
  const [ignited, setIgnited] = useState(!active);
  const fired = useRef(false);
  const { overlayProps, crystallizeTo } = useCrystallizeTransition({ surfaceId: 'about.hero' });

  useEffect(() => {
    const host = hostRef.current;
    if (fired.current || !active || !host) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || fired.current) return;
        fired.current = true;
        io.disconnect();
        setCharged(true);
        crystallizeTo(() => setIgnited(true), { settleAnnouncement: 'About SwanStudios' });
      },
      { threshold: 0.35 },
    );
    io.observe(host);
    return () => io.disconnect();
  }, [active, crystallizeTo]);

  const reveal = useCallback(
    (delay: number) => ({
      initial: active ? { opacity: 0, y: 14 } : false,
      animate: charged ? { opacity: 1, y: 0 } : { opacity: 0.001, y: 14 },
      transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const, delay },
    }),
    [active, charged],
  );

  return (
    <Section ref={hostRef} data-testid="about-hero">
      <CausticCanvas hostRef={hostRef} active={active && charged} />
      <MarkLayer>
        <SwanMark charged={charged} />
      </MarkLayer>
      <Scrim />
      <Content>
        <Credential {...reveal(0.3)}>{CREDENTIAL}</Credential>
        <Headline {...reveal(0.4)}>Achieve Your Best Self</Headline>
        <Sub>
          Built on {YEARS_EXPERIENCE_CLAIM} years of expertise, cutting-edge science, and an unwavering
          commitment to your success.
        </Sub>
        <Cta type="button" $ignited={ignited} onClick={() => navigate('/contact')}>
          Book Consultation
        </Cta>
      </Content>
      <CrystallizeOverlay {...overlayProps} />
    </Section>
  );
}
