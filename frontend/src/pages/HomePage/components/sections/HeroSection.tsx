/**
 * HeroSection — Video hero with parallax, typewriter headline, CTAs, quick-nav capsules.
 * @module pages/HomePage/components/sections/HeroSection
 * Tier behavior: full=parallax+char-split, balanced=video+simple anim, essential=static poster
 */
import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import styled, { keyframes } from 'styled-components';
import { UserCircle, Camera, FileSignature, LayoutDashboard, Award } from 'lucide-react';
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

type CapsuleVariant = 'default' | 'gilded' | 'wingPurple' | 'arcticCyan' | 'royalDepth';
const capsuleColors: Record<CapsuleVariant, { border: string; bg: string; color: string; hoverBorder: string; hoverBg: string; glow: string; focus: string }> = {
  default:    { border: 'rgba(96,192,240,0.2)',  bg: 'rgba(0,32,96,0.5)',    color: '#E0ECF4', hoverBorder: 'rgba(139,92,246,0.5)',  hoverBg: 'rgba(0,32,96,0.7)',    glow: 'rgba(139,92,246,0.2)',  focus: '#8B5CF6' }, // swan-guard-allow-hex pre-existing legacy literal, untouched by the Forge strangler; token migration is its own backlog slice (FORGE-STRANGLER-BACKLOG; ticket SWA-206; expires 2026-11-23)
  gilded:     { border: 'rgba(198,168,75,0.35)', bg: 'rgba(198,168,75,0.1)', color: '#C6A84B', hoverBorder: 'rgba(198,168,75,0.6)',  hoverBg: 'rgba(198,168,75,0.18)', glow: 'rgba(198,168,75,0.3)',  focus: '#C6A84B' }, // swan-guard-allow-hex pre-existing legacy literal, untouched by the Forge strangler; token migration is its own backlog slice (FORGE-STRANGLER-BACKLOG; ticket SWA-206; expires 2026-11-23)
  wingPurple: { border: 'rgba(139,92,246,0.35)', bg: 'rgba(139,92,246,0.12)', color: '#8B5CF6', hoverBorder: 'rgba(139,92,246,0.6)', hoverBg: 'rgba(139,92,246,0.22)', glow: 'rgba(139,92,246,0.3)', focus: '#8B5CF6' }, // swan-guard-allow-hex pre-existing legacy literal, untouched by the Forge strangler; token migration is its own backlog slice (FORGE-STRANGLER-BACKLOG; ticket SWA-206; expires 2026-11-23)
  arcticCyan: { border: 'rgba(80,160,240,0.35)', bg: 'rgba(80,160,240,0.12)', color: '#50A0F0', hoverBorder: 'rgba(80,160,240,0.6)', hoverBg: 'rgba(80,160,240,0.22)', glow: 'rgba(80,160,240,0.3)', focus: '#50A0F0' }, // swan-guard-allow-hex pre-existing legacy literal, untouched by the Forge strangler; token migration is its own backlog slice (FORGE-STRANGLER-BACKLOG; ticket SWA-206; expires 2026-11-23)
  royalDepth: { border: 'rgba(0,48,128,0.5)',    bg: 'rgba(0,48,128,0.25)',  color: '#60C0F0', hoverBorder: 'rgba(0,48,128,0.8)',   hoverBg: 'rgba(0,48,128,0.4)',   glow: 'rgba(96,192,240,0.2)',  focus: '#60C0F0' }, // swan-guard-allow-hex pre-existing legacy literal, untouched by the Forge strangler; token migration is its own backlog slice (FORGE-STRANGLER-BACKLOG; ticket SWA-206; expires 2026-11-23)
};

const CAPSULES: { variant: CapsuleVariant; icon: React.ReactNode; label: string; to: string }[] = [
  { variant: 'royalDepth', icon: <img src={logoImg} alt="" width={16} height={16} />, label: 'SwanStudios Social', to: '/user-dashboard' },
  { variant: 'arcticCyan', icon: <UserCircle size={16} />, label: 'Client Dashboard', to: '/dashboard/client/overview' },
  { variant: 'gilded', icon: <Camera size={16} />, label: 'SwanStudios Photography', to: '/gallery' },
  { variant: 'default', icon: <FileSignature size={16} />, label: 'Waiver', to: '/waiver' },
  { variant: 'wingPurple', icon: <LayoutDashboard size={16} />, label: 'Trainer Dashboard', to: '/dashboard/trainer/overview' },
  { variant: 'gilded', icon: <Award size={16} />, label: 'Trainer Staff Review', to: '/contact' },
];

/* ── Keyframes ──────────────────────────────────────────────────────────── */
const floatLogo = keyframes`0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}`;
const pulse = keyframes`0%,100%{opacity:.6}50%{opacity:1}`;

/* ── Styled Components ──────────────────────────────────────────────────── */
const Wrap = styled.section`position:relative;min-height:100vh;display:flex;align-items:center;justify-content:center;overflow:hidden;background:var(--bg-base,#030712);`;
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
const CapsuleRow = styled(motion.div)`display:flex;flex-wrap:wrap;gap:0.5rem;justify-content:center;margin-top:0.5rem;`;
const Capsule = styled.button<{ $v: CapsuleVariant }>`
  display:inline-flex;align-items:center;gap:6px;
  min-height:44px;padding:8px 16px;border-radius:9999px;
  font-family:'Sora',sans-serif;font-size:0.8rem;font-weight:500;
  cursor:pointer;transition:all 0.25s ease;
  border:1px solid ${({ $v }) => capsuleColors[$v].border};
  background:${({ $v }) => capsuleColors[$v].bg};
  color:${({ $v }) => capsuleColors[$v].color};
  &:hover{border-color:${({ $v }) => capsuleColors[$v].hoverBorder};background:${({ $v }) => capsuleColors[$v].hoverBg};box-shadow:0 0 14px ${({ $v }) => capsuleColors[$v].glow};}
  &:focus-visible{outline:2px solid ${({ $v }) => capsuleColors[$v].focus};outline-offset:2px;}
`;
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
  const isEssential = tier === 'essential';
  const HEADLINE = 'Health First. Community Always.';

  return (
    <Wrap ref={ref} id="hero">
      {/* 6.4: page-level meta lives in HomePage.V4 (SeoHead) — the hero's
          duplicate <Helmet> used to race it and could win with generic copy. */}

      {isEssential ? (
        <StaticBg />
      ) : (
        <VideoBg
          src={VIDEO.swans}
          /* 6.4 LCP: first paint is the committed backdrop on EVERY tier —
             previously balanced/full painted nothing until the R2 video arrived. */
          poster="/images/parallax/hero-swan-bg.png"
          preload="metadata"
          autoPlay loop muted playsInline
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

        <CapsuleRow variants={isEssential ? undefined : staggerContainer}>
          {CAPSULES.map(({ variant, icon, label, to }) => (
            <motion.div key={to} variants={isEssential ? undefined : reveal}>
              <Capsule $v={variant} onClick={() => navigate(to)} aria-label={label}>
                {icon}{label}
              </Capsule>
            </motion.div>
          ))}
        </CapsuleRow>
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
