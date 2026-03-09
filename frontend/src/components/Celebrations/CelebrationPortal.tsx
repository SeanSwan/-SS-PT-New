/**
 * CelebrationPortal — React Portal overlay for all celebration effects
 * =====================================================================
 * Renders into document.body at z-index: 9999.
 * pointer-events: none so it NEVER blocks UI interaction.
 * Houses both DOM overlay (XP pops, combo text) and Canvas layer (particles).
 *
 * Architecture per Gemini 3.1 Pro spec:
 *   <CelebrationPortal>
 *     <CanvasLayer />     ← Level-up constellation particles
 *     <DOMOverlayLayer /> ← XP pops, combo text, shockwaves
 *   </CelebrationPortal>
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import styled, { keyframes, css } from 'styled-components';

// ── Crystalline Swan Theme Tokens ─────────────────────────────
const TOKENS = {
  midnightSapphire: '#002060',
  royalDepth: '#003080',
  iceWing: '#60C0F0',
  arcticCyan: '#50A0F0',
  gildedFern: '#C6A84B',
  frostWhite: '#E0ECF4',
  swanLavender: '#4070C0',
  wingPurple: '#8B5CF6',
  cosmicPurple: '#7851A9',
  supernovaGold: '#FFD700',
};

// ── Combo Tiers (Gemini spec) ─────────────────────────────────
export const COMBO_TIERS = [
  { name: 'SPARK', threshold: 3, color: TOKENS.iceWing },
  { name: 'IGNITE', threshold: 5, color: TOKENS.arcticCyan },
  { name: 'BLAZING', threshold: 10, color: TOKENS.wingPurple },
  { name: 'SUPERNOVA', threshold: 15, color: TOKENS.supernovaGold },
  { name: 'ECLIPSE', threshold: 20, color: TOKENS.frostWhite },
] as const;

export type ComboTier = typeof COMBO_TIERS[number];

// ── Types ─────────────────────────────────────────────────────
export interface XPPopData {
  id: string;
  amount: number;
  x: number;
  y: number;
}

export interface ComboData {
  id: string;
  tier: ComboTier;
}

export interface LevelUpData {
  id: string;
  newLevel: number;
  dismiss: () => void;
}

export interface ShockwaveData {
  id: string;
  delay: number;
}

// ── Keyframes ─────────────────────────────────────────────────

const floatUp = keyframes`
  0% { opacity: 0; transform: translateY(0) scale(0.8); }
  20% { opacity: 1; transform: translateY(-10px) scale(1.2); }
  100% { opacity: 0; transform: translateY(-50px) scale(1); }
`;

const slamIn = keyframes`
  0% { opacity: 0; transform: scale(3) rotate(-15deg); }
  50% { opacity: 1; transform: scale(0.8) rotate(2deg); }
  70% { transform: scale(1.05) rotate(-1deg); }
  100% { transform: scale(1) rotate(0deg); }
`;

const shockwaveExpand = keyframes`
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(20); opacity: 0; }
`;

const comboSlam = keyframes`
  0% { opacity: 0; transform: scale(0.5) skewX(-8deg); }
  40% { opacity: 1; transform: scale(1.15) skewX(-3deg); }
  60% { transform: scale(0.95) skewX(-1deg); }
  100% { opacity: 0; transform: scale(1) skewX(0deg) translateY(-20px); }
`;

const backdropFadeIn = keyframes`
  0% { opacity: 0; }
  100% { opacity: 1; }
`;

const breathePulse = keyframes`
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
`;

// ── Styled Components ─────────────────────────────────────────

const PortalRoot = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
  overflow: hidden;
`;

const XPPopText = styled.div<{ $x: number; $y: number }>`
  position: absolute;
  left: ${p => p.$x}px;
  top: ${p => p.$y}px;
  font-weight: 800;
  font-size: 18px;
  color: ${TOKENS.iceWing};
  text-shadow: 0 0 8px rgba(96, 192, 240, 0.6), 0 0 16px rgba(96, 192, 240, 0.4);
  animation: ${floatUp} 0.8s cubic-bezier(0.25, 1, 0.5, 1) forwards;
  user-select: none;
  white-space: nowrap;
  font-family: 'Plus Jakarta Sans', 'Sora', sans-serif;
`;

const ComboText = styled.div<{ $color: string; $size: number }>`
  position: absolute;
  top: 35%;
  left: 50%;
  transform-origin: center;
  font-weight: 900;
  font-style: italic;
  font-size: ${p => p.$size}px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${p => p.$color};
  text-shadow: 0 0 12px ${p => p.$color}80, 0 4px 20px rgba(0, 0, 0, 0.5);
  animation: ${comboSlam} 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  user-select: none;
  font-family: 'Plus Jakarta Sans', 'Sora', sans-serif;
`;

const LevelUpBackdrop = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(0, 32, 96, 0.85);
  backdrop-filter: blur(16px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  animation: ${backdropFadeIn} 0.4s ease-out;
`;

const LevelNumber = styled.div`
  font-size: clamp(120px, 15vw, 240px);
  font-weight: 900;
  background: linear-gradient(135deg, ${TOKENS.iceWing} 0%, ${TOKENS.wingPurple} 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: ${slamIn} 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  font-family: 'Plus Jakarta Sans', 'Sora', sans-serif;
  line-height: 1;
  filter: drop-shadow(0 0 30px rgba(139, 92, 246, 0.5));
`;

const LevelLabel = styled.div`
  font-size: clamp(18px, 3vw, 32px);
  font-weight: 700;
  color: ${TOKENS.frostWhite};
  margin-top: 8px;
  font-family: 'Cormorant Garamond', serif;
  font-style: italic;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  opacity: 0;
  animation: ${backdropFadeIn} 0.5s ease-out 0.4s forwards;
`;

const DismissButton = styled.button`
  margin-top: 32px;
  height: 56px;
  min-width: 200px;
  border: 2px solid ${TOKENS.wingPurple};
  border-radius: 28px;
  background: rgba(139, 92, 246, 0.15);
  color: ${TOKENS.frostWhite};
  font-size: 16px;
  font-weight: 600;
  font-family: 'Sora', sans-serif;
  cursor: pointer;
  pointer-events: auto;
  opacity: 0;
  animation: ${backdropFadeIn} 0.4s ease-out 0.8s forwards;
  transition: background 0.2s, box-shadow 0.2s;

  &:hover {
    background: rgba(139, 92, 246, 0.3);
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.4);
  }

  &:focus-visible {
    outline: 2px solid ${TOKENS.iceWing};
    outline-offset: 2px;
  }
`;

const ShockwaveRing = styled.div<{ $delay: number }>`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 10vmin;
  height: 10vmin;
  border-radius: 50%;
  border: 2px solid rgba(139, 92, 246, 0.8);
  box-shadow: 0 0 30px rgba(96, 192, 240, 0.4);
  transform: translate(-50%, -50%);
  animation: ${shockwaveExpand} 1.2s cubic-bezier(0.165, 0.84, 0.44, 1) ${p => p.$delay}s forwards;
`;

const CanvasLayer = styled.canvas`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
`;

// ── Particle System (Canvas) ──────────────────────────────────

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  shape: 'star' | 'orb' | 'feather';
}

const PARTICLE_COLORS = [
  TOKENS.iceWing,
  TOKENS.wingPurple,
  TOKENS.arcticCyan,
  TOKENS.gildedFern,
  TOKENS.frostWhite,
  TOKENS.swanLavender,
];

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * size, y + Math.sin(angle) * size);
  }
  ctx.stroke();
}

function createBurstParticles(
  cx: number,
  cy: number,
  count: number,
): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const speed = 2 + Math.random() * 4;
    particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 2 + Math.random() * 4,
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      life: 1,
      maxLife: 60 + Math.random() * 40,
      shape: (['star', 'orb', 'feather'] as const)[Math.floor(Math.random() * 3)],
    });
  }
  return particles;
}

// ── Main Component ────────────────────────────────────────────

interface CelebrationPortalProps {
  xpPops: XPPopData[];
  combos: ComboData[];
  levelUp: LevelUpData | null;
  particles: Particle[];
  onXPPopDone: (id: string) => void;
  onComboDone: (id: string) => void;
  reducedMotion: boolean;
}

const CelebrationPortal: React.FC<CelebrationPortalProps> = ({
  xpPops,
  combos,
  levelUp,
  particles,
  onXPPopDone,
  onComboDone,
  reducedMotion,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);

  // Sync particles
  useEffect(() => {
    particlesRef.current = [...particlesRef.current, ...particles];
  }, [particles]);

  // Canvas animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || reducedMotion) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      const alive: Particle[] = [];

      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.03; // gravity
        p.vx *= 0.99; // drag
        p.life -= 1 / p.maxLife;

        if (p.life <= 0) continue;
        alive.push(p);

        ctx.globalAlpha = p.life;
        ctx.strokeStyle = p.color;
        ctx.fillStyle = p.color;
        ctx.lineWidth = 1;

        if (p.shape === 'star') {
          drawStar(ctx, p.x, p.y, p.size);
        } else if (p.shape === 'orb') {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // feather — elongated ellipse
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, p.size * 0.4, p.size * 1.5, p.vx * 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1;
      particlesRef.current = alive;
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [reducedMotion]);

  // Auto-remove XP pops after animation
  useEffect(() => {
    xpPops.forEach(pop => {
      const timer = setTimeout(() => onXPPopDone(pop.id), 850);
      return () => clearTimeout(timer);
    });
  }, [xpPops, onXPPopDone]);

  // Auto-remove combos after animation
  useEffect(() => {
    combos.forEach(combo => {
      const timer = setTimeout(() => onComboDone(combo.id), 1300);
      return () => clearTimeout(timer);
    });
  }, [combos, onComboDone]);

  // Reduced motion fallback: static glassmorphic toast
  if (reducedMotion) {
    return createPortal(
      <PortalRoot role="status" aria-live="polite">
        {xpPops.map(pop => (
          <XPPopText key={pop.id} $x={pop.x} $y={pop.y} style={{ animation: 'none', opacity: 1 }}>
            +{pop.amount} XP
          </XPPopText>
        ))}
        {levelUp && (
          <LevelUpBackdrop style={{ backdropFilter: 'none', background: 'rgba(0,32,96,0.95)' }}>
            <LevelNumber style={{ animation: 'none' }}>{levelUp.newLevel}</LevelNumber>
            <LevelLabel style={{ animation: 'none', opacity: 1 }}>Level Up</LevelLabel>
            <DismissButton onClick={levelUp.dismiss} style={{ animation: 'none', opacity: 1 }}>
              Continue
            </DismissButton>
          </LevelUpBackdrop>
        )}
      </PortalRoot>,
      document.body,
    );
  }

  return createPortal(
    <PortalRoot>
      {/* Canvas for particles */}
      <CanvasLayer ref={canvasRef} />

      {/* XP Pop floating text */}
      <div role="status" aria-live="polite">
        {xpPops.map(pop => (
          <XPPopText key={pop.id} $x={pop.x} $y={pop.y} aria-label={`Earned ${pop.amount} XP`}>
            +{pop.amount} XP
          </XPPopText>
        ))}
      </div>

      {/* Combo callouts */}
      {combos.map(combo => {
        const tierIndex = COMBO_TIERS.indexOf(combo.tier);
        const size = 28 + tierIndex * 12; // Escalating size
        return (
          <ComboText
            key={combo.id}
            $color={combo.tier.color}
            $size={size}
            aria-label={`Combo: ${combo.tier.name}`}
          >
            {combo.tier.name}!
          </ComboText>
        );
      })}

      {/* Level-up full-screen takeover */}
      {levelUp && (
        <div role="alertdialog" aria-live="assertive" aria-label={`Level up! You are now level ${levelUp.newLevel}`}>
          <LevelUpBackdrop>
            {/* Shockwave rings */}
            <ShockwaveRing $delay={0} />
            <ShockwaveRing $delay={0.15} />
            <ShockwaveRing $delay={0.3} />

            <LevelNumber>{levelUp.newLevel}</LevelNumber>
            <LevelLabel>Level Up</LevelLabel>
            <DismissButton onClick={levelUp.dismiss} autoFocus>
              Continue
            </DismissButton>
          </LevelUpBackdrop>
        </div>
      )}
    </PortalRoot>,
    document.body,
  );
};

export { createBurstParticles, TOKENS };
export type { Particle };
export default CelebrationPortal;
