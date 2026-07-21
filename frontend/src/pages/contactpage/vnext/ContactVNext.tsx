/**
 * Contact V-next — "The Swan Answers" (Kimi direction). The home hero's quiet sibling: same Swan-video +
 * luminous swan-mark language, lower energy, one signature. Hero (video + swan) declares, the form below
 * converts. Renders THROUGH the lens frame (so `--world-*`/`--lens-*` resolve + `[data-style-lens-shell]`
 * exists for the gate's contract check) + the `.contact-vnext-shell` token scope. The page's one emotional
 * peak stays the Crystallize Submit inside ContactForm; the hero is calm on purpose. Form POST is BIND-ONLY.
 */
import { useRef } from 'react';
import styled from 'styled-components';
import { useReducedMotion } from 'framer-motion';
import SeoHead from '../../../components/seo/SeoHead';
import { useAnimationTier } from '../../../hooks/useAnimationTier';
import { SwanVideoBackdrop } from '../../../components/ui-kit/cinematic/SwanVideoBackdrop';
import { VIDEO } from '../../../config/videoAssets';
import { ContactLensFrame } from './contactManifest';
import { ContactVNextTokens } from './contact.tokens';
import { ContactForm } from './ContactForm';

const Shell = styled.div`
  position: relative;
  color: var(--contact-ink, #e0ecf4);
  background: var(--contact-bg, #0a0a0f);
`;
const Hero = styled.section`
  position: relative;
  isolation: isolate; /* contain the swan's mix-blend to this hero */
  min-height: min(64vh, 560px);
  display: grid;
  place-items: center;
  overflow: hidden;
  padding: clamp(40px, 8vh, 96px) var(--contact-pad, 24px);
  text-align: center;
`;
const SwanLayer = styled.div`
  position: absolute;
  inset: 0;
  z-index: 2;
  display: grid;
  place-items: center;
  pointer-events: none;
`;
const SwanMark = styled.img`
  width: min(40vmin, 300px);
  height: auto;
  mix-blend-mode: screen;
  filter: brightness(1.15) contrast(1.04) drop-shadow(0 0 40px var(--contact-ice-soft, rgba(96, 192, 240, 0.35)))
    drop-shadow(0 0 80px rgba(139, 92, 246, 0.24));
  animation: swan-in 500ms var(--contact-ease, cubic-bezier(0.16, 1, 0.3, 1)) both;
  @keyframes swan-in {
    from {
      opacity: 0;
      transform: scale(0.94);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
  @supports not (mix-blend-mode: screen) {
    mix-blend-mode: normal;
    -webkit-mask: radial-gradient(circle at 50% 50%, #000 58%, transparent 72%);
    mask: radial-gradient(circle at 50% 50%, #000 58%, transparent 72%);
  }
`;
const Scrim = styled.div`
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: radial-gradient(64% 46% at 50% 46%, var(--contact-scrim, rgba(10, 10, 15, 0.68)), transparent 74%);
`;
const HeroContent = styled.div`
  position: relative;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  max-width: 640px;
`;
const Kicker = styled.span`
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--contact-ice, #60c0f0);
`;
const Title = styled.h1`
  margin: 0;
  font: 800 clamp(32px, 6.4vw, 58px) / 1.03 var(--contact-font-display, inherit);
  color: var(--contact-ink, #e0ecf4);
  text-wrap: balance;
  text-shadow: 0 2px 28px var(--contact-bg, #0a0a0f), 0 1px 6px var(--contact-bg, #0a0a0f);
`;
const Sub = styled.p`
  margin: 0;
  font-size: clamp(15px, 2.2vw, 18px);
  color: var(--contact-ink-2, #9fb0c8);
  max-width: 48ch;
  text-shadow: 0 1px 14px var(--contact-bg, #0a0a0f);
`;
const ScrollCue = styled.a`
  margin-top: 6px;
  min-height: var(--contact-target, 44px);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 20px;
  border-radius: 999px;
  border: 1px solid color-mix(in oklab, var(--contact-ice, #60c0f0) 34%, transparent);
  color: var(--contact-ink, #e0ecf4);
  text-decoration: none;
  font-weight: 700;
  font-size: 15px;
  background: transparent;
  transition: box-shadow 200ms ease, background 200ms ease;
  &:hover {
    background: color-mix(in oklab, var(--contact-ice, #60c0f0) 14%, transparent);
    box-shadow: 0 0 22px -8px var(--contact-glow, #8b5cf6);
  }
  &:focus-visible {
    outline: 2px solid var(--contact-ice, #60c0f0);
    outline-offset: 3px;
  }
`;
const FormSection = styled.section`
  scroll-margin-top: 24px;
  max-width: 1040px;
  margin: 0 auto;
  padding: clamp(32px, 6vh, 72px) var(--contact-pad, 24px) 80px;
  display: grid;
  gap: clamp(24px, 5vw, 48px);
  @media (min-width: 900px) {
    grid-template-columns: 0.9fr 1.1fr;
    align-items: start;
  }
`;
const SideCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
`;
const Methods = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;
const Method = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: var(--contact-target, 44px);
  color: var(--contact-ink, #e0ecf4);
  text-decoration: none;
  font-size: 15px;
  &:hover {
    color: var(--contact-ice, #60c0f0);
  }
  &:focus-visible {
    outline: 2px solid var(--contact-ice, #60c0f0);
    outline-offset: 2px;
  }
`;
const Trust = styled.ul`
  margin: 4px 0 0;
  padding: 16px 0 0;
  border-top: 1px solid var(--contact-line, rgba(96, 192, 240, 0.18));
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;
const TrustItem = styled.li`
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-size: 14px;
  color: var(--contact-ink-2, #9fb0c8);
  &::before {
    content: '◆';
    color: var(--contact-ice, #60c0f0);
    font-size: 10px;
  }
`;

export default function ContactVNext() {
  const tier = useAnimationTier();
  const prefersReduced = useReducedMotion();
  const active = tier !== 'essential' && !prefersReduced;
  const heroRef = useRef<HTMLElement>(null);

  return (
    <ContactLensFrame>
      <ContactVNextTokens />
      <div className="contact-vnext-shell" data-testid="contact-vnext-root">
        <SeoHead
          title="Contact SwanStudios | Get in touch"
          description="Reach the SwanStudios team — send a message, call, or email to start training."
          path="/contact"
        />
        <Shell>
          <Hero ref={heroRef}>
            <SwanVideoBackdrop
              active={active}
              videoSrc={VIDEO.swan}
              poster="/images/parallax/hero-swan-bg.png"
              hostRef={heroRef}
              brightness={0.45}
            />
            <Scrim />
            <SwanLayer>
              <SwanMark src="/Logo.png" alt="" aria-hidden="true" />
            </SwanLayer>
            <HeroContent>
              <Kicker>Contact</Kicker>
              <Title>Let’s start your training.</Title>
              <Sub>Tell us your goals and we’ll match you with the right coach. We usually reply within a day.</Sub>
              <ScrollCue href="#contact-form">Send a message ↓</ScrollCue>
            </HeroContent>
          </Hero>

          <FormSection id="contact-form">
            <SideCol>
              <Methods>
                <li>
                  <Method href="mailto:loveswanstudios@protonmail.com">✉ loveswanstudios@protonmail.com</Method>
                </li>
                <li>
                  <Method href="tel:+17144853950">✆ (714) 485-3950</Method>
                </li>
              </Methods>
              <Trust>
                <TrustItem>26+ years of hands-on coaching</TrustItem>
                <TrustItem>NASM-protocol programming</TrustItem>
                <TrustItem>We reply within one business day</TrustItem>
              </Trust>
            </SideCol>
            <ContactForm />
          </FormSection>
        </Shell>
      </div>
    </ContactLensFrame>
  );
}
