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
import { VIDEO } from '../../../../config/videoAssets';
import { SwanVideoBackdrop } from '../../../../components/ui-kit/cinematic/SwanVideoBackdrop';

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
// The caustic canvas is now dimmed so the Swan video reads through it (Sean: "more transparent, see the video").
const CanvasWrap = styled.div`
  position: absolute;
  inset: 0;
  z-index: 0;
  opacity: 0.5;
  pointer-events: none;
`;
// The giant Swan mark that RESOLVES in after the crystal aligns (the "form the crystal became").
// mix-blend-mode: screen drops the logo's dark disc out over the video, leaving the luminous swan floating.
// Above the scrim (z-index 2) so the swan glows over the DARKENED center — screen-blend over a dark
// backdrop shows the swan's true luminous colours instead of washing out against the bright video.
const SwanLayer = styled.div`
  position: absolute;
  inset: 0;
  z-index: 3; /* explicitly above the scrim (2); Content is 4 — no DOM-order tiebreak the swan can lose */
  display: grid;
  place-items: center;
  pointer-events: none;
  transform: translate3d(var(--hero-px, 0px), var(--hero-py, 0px), 0);
  transition: transform 260ms var(--home-ease-standard);
`;
const SwanMark = styled(motion.img)`
  width: min(54vmin, 440px);
  height: auto;
  mix-blend-mode: screen;
  filter: brightness(1.18) contrast(1.05) drop-shadow(0 0 46px var(--home-ice-soft))
    drop-shadow(0 0 96px var(--home-wing-24));
  /* No screen-blend support → soft-mask the logo disc into a circle so no hard box shows over the video. */
  @supports not (mix-blend-mode: screen) {
    mix-blend-mode: normal;
    -webkit-mask: radial-gradient(circle at 50% 50%, #000 58%, transparent 72%);
    mask: radial-gradient(circle at 50% 50%, #000 58%, transparent 72%);
  }
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
  z-index: 4;
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
  text-shadow: 0 2px 30px var(--home-bg), 0 1px 6px var(--home-bg); /* readable over the luminous swan */
`;
const Sub = styled.p`
  margin: 0;
  font-size: clamp(15px, 2.4vw, 19px);
  color: var(--home-ink-2);
  max-width: 54ch;
  text-shadow: 0 1px 16px var(--home-bg), 0 1px 4px var(--home-bg); /* readable over the swan's bright wing */
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
  const rafRef = useRef(0);
  const [charged, setCharged] = useState(!active); // reduced/essential → start already resolved (static frame)
  const [ignited, setIgnited] = useState(!active);
  const fired = useRef(false);

  const { overlayProps, crystallizeTo } = useCrystallizeTransition({ surfaceId: 'home.hero' });

  // pointer refraction — fine pointer only, transform-only via CSS vars (spring-smoothed by CSS transition)
  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType !== 'mouse' || !active) return;
      const host = hostRef.current;
      if (!host || rafRef.current) return; // coalesce to ONE write per frame — no forced recalc per mousemove
      const { clientX, clientY } = e;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        const r = host.getBoundingClientRect();
        const dx = ((clientX - r.left) / r.width - 0.5) * 16;
        const dy = ((clientY - r.top) / r.height - 0.5) * 16;
        // set on the host so BOTH the crystal and the swan mark refract together (inherited CSS vars)
        host.style.setProperty('--hero-px', `${dx.toFixed(1)}px`);
        host.style.setProperty('--hero-py', `${dy.toFixed(1)}px`);
      });
    },
    [active],
  );

  // charge once on first in-view (IntersectionObserver, not a blind timer — so scroll-restored loads
  // don't fire the signature moment offscreen). reduced/essential already start charged (static frame).
  useEffect(() => {
    const host = hostRef.current;
    if (fired.current || !active || !host) return;
    const charge = () => {
      if (fired.current) return;
      fired.current = true;
      setCharged(true);
      crystallizeTo(() => setIgnited(true), { settleAnnouncement: 'SwanStudios' });
    };
    const io = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) { io.disconnect(); charge(); } },
      { threshold: 0.15 },
    );
    io.observe(host);
    // Never leave the headline invisible: if the section never crosses the threshold (short / landscape
    // viewports where 88vh never reaches 15% visibility), force the charge after 1.2s.
    const fallback = window.setTimeout(() => { io.disconnect(); charge(); }, 1200);
    return () => { io.disconnect(); window.clearTimeout(fallback); };
  }, [active, crystallizeTo]);

  return (
    <Section ref={hostRef} onPointerMove={onPointerMove} data-testid="home-hero-optics">
      <SwanVideoBackdrop
        active={active}
        videoSrc={VIDEO.swan}
        poster="/images/parallax/hero-swan-bg.png"
        hostRef={hostRef}
      />
      <CanvasWrap>
        <OpticsCanvas hostRef={hostRef} active={active && charged} />
      </CanvasWrap>
      <FacetLayer>
        <Facets state={charged ? 'aligned' : 'scattered'} animateIn={active} />
      </FacetLayer>
      <Scrim />
      <SwanLayer>
        <SwanMark
          src="/Logo.png"
          alt=""
          aria-hidden="true"
          initial={active ? { opacity: 0, scale: 0.92 } : false}
          animate={charged ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.92 }}
          transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1], delay: 0.95 }}
        />
      </SwanLayer>
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
