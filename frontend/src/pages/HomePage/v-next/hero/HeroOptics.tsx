/**
 * Home V-next — HeroOptics (THE signature moment, Kimi direction (d)). The Crystallize charge IS the hero:
 * scattered facets → charge → settle into the Crystalline lattice behind the FROZEN headline
 * "Health First. Community Always." → a refracted streak ignites "Join the Community" ONCE (blue→purple
 * glow), everything else quiet. Layers (back→front): OpticsCanvas (caustic light) · Facets (vector crystal,
 * also the LCP + reduced-motion static frame) · scrim (worst-frame contrast) · content (real headline + 2
 * Dual-Button-Glow CTAs). Pointer-refractive on fine pointers (transform-only). Consumes the SHIPPED lens
 * Crystallize (no re-implementation). No typewriter (killed per Kimi (b)3). Money/nav wording unchanged.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useAnimationTier } from '../../../../hooks/useAnimationTier';
import { useCrystallizeTransition, CrystallizeOverlay } from '../lensBindings';
import { Facets } from './Facets.svg';
import { OpticsCanvas } from './OpticsCanvas';

const HEADLINE = 'Health First. Community Always.'; // FROZEN copy

const Section = styled.section`
  position: relative;
  min-height: min(88vh, 760px);
  display: grid;
  place-items: center;
  overflow: hidden;
  padding: clamp(48px, 10vh, 120px) var(--home-pad, 24px);
  background: radial-gradient(120% 100% at 50% 0%, var(--home-facet-lo), var(--home-bg) 70%);
`;
const FacetLayer = styled.div`
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  z-index: 1;
  pointer-events: none;
  /* pointer refraction via CSS vars (set on pointermove) — transform-only, spring-smoothed by transition */
  transform: translate3d(var(--hero-px, 0px), var(--hero-py, 0px), 0);
  transition: transform 260ms var(--home-ease-standard);
  & > svg {
    width: min(78vmin, 620px);
    height: min(78vmin, 620px);
    filter: drop-shadow(0 0 40px var(--home-ice-soft));
  }
`;
const Scrim = styled.div`
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  background: radial-gradient(60% 40% at 50% 46%, var(--home-scrim), transparent 72%);
`;
const Content = styled.div`
  position: relative;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 22px;
  max-width: 820px;
`;
const Headline = styled(motion.h1)`
  margin: 0;
  font: 800 clamp(34px, 8vw, 76px) / 1.02 var(--home-font-display, inherit);
  letter-spacing: -0.01em;
  color: var(--home-ink);
  text-wrap: balance;
`;
const Sub = styled.p`
  margin: 0;
  font-size: clamp(15px, 2.4vw, 19px);
  color: var(--home-ink-2);
  max-width: 54ch;
`;
const CtaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  justify-content: center;
`;
const PrimaryCta = styled.button<{ $ignited: boolean }>`
  min-height: 52px;
  padding: 0 28px;
  border-radius: 999px;
  border: 1px solid color-mix(in oklab, var(--home-ice) 40%, transparent);
  background: color-mix(in oklab, var(--home-ice) 22%, var(--home-surface) 78%);
  color: var(--home-ink);
  font: 800 16px / 1 var(--home-font-display, inherit);
  cursor: pointer;
  box-shadow: ${({ $ignited }) => ($ignited ? '0 0 0 1px var(--home-wing-24), 0 0 34px -6px var(--home-wing)' : 'var(--home-elev-1)')};
  transition: box-shadow 320ms var(--home-ease-crystallize), filter 160ms var(--home-ease-standard);
  &:hover {
    filter: brightness(1.08);
  }
`;
const GhostCta = styled.button`
  min-height: 52px;
  padding: 0 24px;
  border-radius: 999px;
  border: 1px solid color-mix(in oklab, var(--home-ice) 32%, transparent);
  background: transparent;
  color: var(--home-ink);
  font: 700 15px / 1 var(--home-font-display, inherit);
  cursor: pointer;
  transition: box-shadow 200ms var(--home-ease-standard), background 200ms var(--home-ease-standard);
  &:hover {
    background: var(--home-ice-14);
    box-shadow: 0 0 22px -8px var(--home-glow);
  }
`;

export function HeroOptics({ onOpenOrientation }: { onOpenOrientation?: () => void }) {
  const navigate = useNavigate();
  const tier = useAnimationTier();
  const prefersReduced = useReducedMotion();
  const active = tier !== 'essential' && !prefersReduced;

  const hostRef = useRef<HTMLElement>(null);
  const facetLayerRef = useRef<HTMLDivElement>(null);
  const [charged, setCharged] = useState(!active); // reduced/essential → start already resolved (static frame)
  const [ignited, setIgnited] = useState(!active);
  const fired = useRef(false);

  const { overlayProps, crystallizeTo } = useCrystallizeTransition({ surfaceId: 'home.hero' });

  // pointer refraction — fine pointer only, transform-only via CSS vars (spring-smoothed by CSS transition)
  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType !== 'mouse' || !active) return;
      const r = hostRef.current?.getBoundingClientRect();
      const layer = facetLayerRef.current;
      if (!r || !layer) return;
      const dx = ((e.clientX - r.left) / r.width - 0.5) * 16;
      const dy = ((e.clientY - r.top) / r.height - 0.5) * 16;
      layer.style.setProperty('--hero-px', `${dx.toFixed(1)}px`);
      layer.style.setProperty('--hero-py', `${dy.toFixed(1)}px`);
    },
    [active],
  );

  // charge once on first in-view (IntersectionObserver, not a blind timer — so scroll-restored loads
  // don't fire the signature moment offscreen). reduced/essential already start charged (static frame).
  useEffect(() => {
    const host = hostRef.current;
    if (fired.current || !active || !host) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || fired.current) return;
        fired.current = true;
        io.disconnect();
        setCharged(true);
        crystallizeTo(() => setIgnited(true), { settleAnnouncement: 'SwanStudios' });
      },
      { threshold: 0.35 },
    );
    io.observe(host);
    return () => io.disconnect();
  }, [active, crystallizeTo]);

  return (
    <Section ref={hostRef} onPointerMove={onPointerMove} data-testid="home-hero-optics">
      <OpticsCanvas hostRef={hostRef} active={active && charged} />
      <FacetLayer ref={facetLayerRef}>
        <Facets state={charged ? 'aligned' : 'scattered'} animateIn={active} />
      </FacetLayer>
      <Scrim />
      <Content>
        <Headline
          initial={active ? { opacity: 0, filter: 'blur(8px)' } : false}
          animate={charged ? { opacity: 1, filter: 'blur(0px)' } : { opacity: 0.001, filter: 'blur(8px)' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.24 }}
        >
          {HEADLINE}
        </Headline>
        <Sub>
          Private, one-on-one training built on 26+ years of experience and NASM-protocol programming — with a
          community that keeps you coming back.
        </Sub>
        <CtaRow>
          <PrimaryCta type="button" $ignited={ignited} onClick={() => navigate('/signup')}>
            Join the Community
          </PrimaryCta>
          <GhostCta type="button" onClick={() => (onOpenOrientation ? onOpenOrientation() : navigate('/contact'))}>
            Find a Trainer
          </GhostCta>
        </CtaRow>
      </Content>
      <CrystallizeOverlay {...overlayProps} />
    </Section>
  );
}
