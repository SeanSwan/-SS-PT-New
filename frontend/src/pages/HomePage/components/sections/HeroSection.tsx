/**
 * HeroSection — Video hero with parallax, typewriter headline, two CTAs.
 * @module pages/HomePage/components/sections/HeroSection
 * Tier behavior: full=parallax+char-split, balanced=video+simple anim, essential=static poster
 * Quick-nav capsules relocated to sections/QuickLinksStrip.tsx (finding H5,
 * five-surface hostile review 2026-09-01) — the hero keeps exactly two CTAs.
 */
import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import styled, { keyframes } from 'styled-components';
import { getReveal, staggerContainer, cinematicReveal } from '../shared/HomeAnimations';
import TextSplitter from '../../../../components/ui/animations/TextSplitter';
import { VIDEO } from '../../../../config/videoAssets';
import logoImg from '../../../../assets/Logo.png';
import ForgeButton from '../../../../components/ui/forge/ForgeButton'; // Forge strangler (was GlowButton)
import { StyledBox } from '@/components/ui/StyledBox';
import { motionStyleProps } from '@/components/ui/motionStyleProps';

/* ── Types ─────────────────────────────────────────────────────────────── */
interface HeroProps {
  prefersReduced: boolean;
  tier: 'full' | 'balanced' | 'essential';
  onOpenOrientation: () => void;
}

/* ── Keyframes ──────────────────────────────────────────────────────────── */
const floatLogo = keyframes`0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}`;
const pulse = keyframes`0%,100%{opacity:.6}50%{opacity:1}`;

/* ── Styled Components ──────────────────────────────────────────────────── */
/* min-height: 100vh fallback first, then 100svh — small-viewport units stop the
   mobile browser-chrome resize jump (finding H6; router responsive law). */
const Wrap = styled.section`position:relative;min-height:100vh;min-height:100svh;display:flex;align-items:center;justify-content:center;overflow:hidden;background:var(--bg-base,#030712);`;
const VideoBg = styled(motion.video)`position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0.35;pointer-events:none;`;
// Reduced-motion / essential tier: a real static backdrop (committed asset)
// layered over the deep-sapphire base so the hero is never blank even if the
// image or R2 video is unavailable.
const StaticBg = styled.div`
  position:absolute;inset:0;pointer-events:none;opacity:0.35;
  background:
    linear-gradient(180deg,
      color-mix(in srgb, var(--primary, #002060) 35%, transparent) 0%,
      color-mix(in srgb, var(--bg-base, #030712) 65%, transparent) 100%),
    url('/images/parallax/hero-swan-bg.png') center/cover no-repeat,
    var(--bg-base,#030712);
`;
const Overlay = styled.div`position:absolute;inset:0;background:linear-gradient(180deg,rgba(3,7,18,0.5) 0%,rgba(3,7,18,0.85) 100%);`;
const Content = styled(motion.div)`position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;text-align:center;gap:1.5rem;padding:2rem 1rem;max-width:800px;`;
const Logo = styled.img<{ $animate: boolean }>`width:120px;height:120px;filter:drop-shadow(0 0 24px rgba(96,192,240,0.4));animation:${({ $animate }) => ($animate ? floatLogo : 'none')} 4s ease-in-out infinite;`;
const Headline = styled.h1`font-family:'Plus Jakarta Sans',sans-serif;font-size:clamp(2rem,5vw,3.5rem);font-weight:800;color:var(--text-primary,#E0ECF4);line-height:1.15;`;
const Sub = styled.p`font-family:'Cormorant Garamond',serif;font-style:italic;font-size:clamp(1rem,2.5vw,1.35rem);color:var(--text-secondary,rgba(224,236,244,0.7));max-width:600px;`;
const BtnRow = styled.div`display:flex;gap:1rem;flex-wrap:wrap;justify-content:center;`;
const ScrollIndicator = styled(motion.div)`position:absolute;bottom:2rem;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:4px;color:var(--text-secondary,rgba(224,236,244,0.5));font-size:0.75rem;`;
const Chevron = styled.span`display:block;width:24px;height:24px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate(45deg);animation:${pulse} 2s ease-in-out infinite;`;

/* ── TypewriterText (balanced fallback) ─────────────────────────────────── */
const TypewriterText: React.FC<{ text: string }> = ({ text }) => {
  const [displayed, setDisplayed] = React.useState('');
  React.useEffect(() => {
    let i = 0;
    const id = setInterval(() => { if (i <= text.length) { setDisplayed(text.slice(0, i)); i++; } else clearInterval(id); }, 55);
    return () => clearInterval(id);
  }, [text]);
  return <>{displayed}<StyledBox as="span" $style={{ opacity: 0.6 }}>|</StyledBox></>;
};

/* ── Component ──────────────────────────────────────────────────────────── */
const HeroSection: React.FC<HeroProps> = ({ prefersReduced, tier, onOpenOrientation }) => {
  const navigate = useNavigate();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const videoScale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const reveal = getReveal(prefersReduced);
  const isFull = tier === 'full';
  // A poster only covers the gap BEFORE the video loads. If the source fails
  // after first paint the poster is already gone, leaving a 0.35-opacity black
  // field with nothing behind it — so a load failure falls back to the real
  // static backdrop (H7).
  const [videoFailed, setVideoFailed] = useState(false);
  const isEssential = tier === 'essential';
  // Deliberately separate from the tier: a failed video swaps the BACKDROP, it
  // does not silently demote the surface's motion tier.
  const showStaticBg = isEssential || videoFailed;
  const HEADLINE = 'Health First. Community Always.';

  return (
    <Wrap ref={ref} id="hero">
      {/* 6.4: page-level meta lives in HomePage.V4 (SeoHead) — the hero's
          duplicate <Helmet> used to race it and could win with generic copy. */}

      {showStaticBg ? (
        <StaticBg />
      ) : (
        <VideoBg
          src={VIDEO.swans}
          /* 6.4 LCP: first paint is the committed backdrop on EVERY tier —
             previously balanced/full painted nothing until the R2 video arrived. */
          poster="/images/parallax/hero-swan-bg.png"
          preload="metadata"
          autoPlay loop muted playsInline
          onError={() => setVideoFailed(true)}
          {...motionStyleProps(isFull ? { scale: videoScale } : undefined)}
        />
      )}
      <Overlay />

      <Content
        {...motionStyleProps(isFull ? { y: contentY } : undefined)}
        variants={isEssential ? undefined : staggerContainer}
        initial={isEssential ? undefined : 'hidden'}
        whileInView={isEssential ? undefined : 'visible'}
        viewport={{ once: true, amount: 0.3 }}
      >
        <motion.div variants={isEssential ? undefined : reveal}>
          <Logo src={logoImg} alt="SwanStudios logo" $animate={isFull} width={120} height={120} />
        </motion.div>

        <motion.div variants={isEssential ? undefined : reveal}>
          <Headline>
            {isFull ? <TextSplitter text={HEADLINE} /> : isEssential ? HEADLINE : <TypewriterText text={HEADLINE} />}
          </Headline>
        </motion.div>

        <motion.div variants={isEssential ? undefined : reveal}>
          <Sub>Where world-class personal training meets a supportive community built around clean living, real connection, and lifelong wellness.</Sub>
        </motion.div>

        <motion.div variants={isEssential ? undefined : reveal}>
          <BtnRow>
            <ForgeButton colorScheme="primary" size="large" onClick={() => navigate('/signup')}>Join the Community</ForgeButton>
            <ForgeButton colorScheme="accent" size="large" onClick={onOpenOrientation}>Find a Trainer</ForgeButton>
          </BtnRow>
        </motion.div>
      </Content>

      {!isEssential && (
        <ScrollIndicator variants={cinematicReveal} initial="hidden" animate="visible">
          <span>Scroll</span>
          <Chevron />
        </ScrollIndicator>
      )}
    </Wrap>
  );
};

export default HeroSection;
