/**
 * FILE: HomeTabVisionScenes.tsx
 * PURPOSE: Inline SVG scenes used by the Creator Observatory dashboard.
 */

import React, { useId } from 'react';
import { Check } from 'lucide-react';
import { LevelHexBox, VerifiedDot } from './HomeTabVisionHero.styles';

type Tone = 'violet' | 'cyan' | 'gold';

const toneVars: Record<Tone, { rim: string; deep: string; soft: string }> = {
  violet: {
    rim: 'var(--accent-secondary, #8B5CF6)',
    deep: 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, var(--bg-base, #0A0A0F))',
    soft: 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 52%, transparent)',
  },
  cyan: {
    rim: 'var(--accent-primary, #60C0F0)',
    deep: 'color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, var(--bg-base, #0A0A0F))',
    soft: 'color-mix(in srgb, var(--accent-primary, #60C0F0) 52%, transparent)',
  },
  gold: {
    rim: 'var(--accent-gold, #C6A84B)',
    deep: 'color-mix(in srgb, var(--accent-gold, #C6A84B) 22%, var(--bg-base, #0A0A0F))',
    soft: 'color-mix(in srgb, var(--accent-gold, #C6A84B) 52%, transparent)',
  },
};

function suffix(prefix: string) {
  return `${prefix}-${useId().replace(/:/g, '')}`;
}

export const VerifiedMark: React.FC = () => (
  <VerifiedDot aria-label="Verified profile">
    <Check size={13} strokeWidth={3} aria-hidden="true" />
  </VerifiedDot>
);

export const LevelHex: React.FC<{ level: number; size?: number }> = ({ level, size = 46 }) => (
  <LevelHexBox $size={size}>
    <span>{level}</span>
  </LevelHexBox>
);

export const Sparkline: React.FC<{ seed?: number; tone?: Tone }> = ({ seed = 1, tone = 'cyan' }) => {
  const color = toneVars[tone].rim;
  const points = Array.from({ length: 12 })
    .map((_, index) => {
      const y = 13 - Math.abs(Math.sin((index + seed) * 0.88)) * 8 - index * 0.28;
      return `${index * 6},${Math.max(y, 2)}`;
    })
    .join(' ');

  return (
    <svg width="70" height="20" viewBox="0 0 70 20" fill="none" aria-hidden="true">
      <polyline points={points} stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};

export const MiniScene: React.FC<{ tone?: Tone }> = ({ tone = 'violet' }) => {
  const id = suffix(`mini-${tone}`);
  const vars = toneVars[tone];

  return (
    <svg viewBox="0 0 60 60" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Crystal story scene">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={vars.deep} />
          <stop offset="1" stopColor="var(--bg-base, #0A0A0F)" />
        </linearGradient>
      </defs>
      <rect width="60" height="60" fill={`url(#${id})`} />
      <polygon points="0,60 12,35 22,45 36,25 50,40 60,30 60,60" fill="var(--bg-base, #0A0A0F)" opacity="0.86" />
      <path d="M0 42 L12 35 L22 45 L36 25 L50 40 L60 30" fill="none" stroke={vars.rim} strokeWidth="0.8" opacity="0.64" />
      <circle cx="44" cy="14" r="2.2" fill={vars.rim} opacity="0.72" />
    </svg>
  );
};

export const HeroRanges: React.FC = () => {
  const far = suffix('range-far');
  const mid = suffix('range-mid');
  const near = suffix('range-near');
  const glow = suffix('range-glow');

  return (
    <svg viewBox="0 0 1400 320" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={far} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, var(--bg-base, #0A0A0F))" />
          <stop offset="1" stopColor="var(--bg-base, #0A0A0F)" />
        </linearGradient>
        <linearGradient id={mid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="color-mix(in srgb, var(--accent-secondary, #8B5CF6) 28%, var(--bg-base, #0A0A0F))" />
          <stop offset="1" stopColor="var(--bg-base, #0A0A0F)" />
        </linearGradient>
        <linearGradient id={near} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, var(--bg-base, #0A0A0F))" />
          <stop offset="1" stopColor="var(--bg-base, #0A0A0F)" />
        </linearGradient>
        <radialGradient id={glow} cx="0.5" cy="0.2" r="0.58">
          <stop offset="0" stopColor="color-mix(in srgb, var(--accent-primary, #60C0F0) 46%, transparent)" />
          <stop offset="1" stopColor="transparent" />
        </radialGradient>
      </defs>
      <rect width="1400" height="320" fill={`url(#${glow})`} opacity="0.6" />
      {Array.from({ length: 32 }).map((_, index) => (
        <circle
          key={index}
          cx={(index * 73) % 1400}
          cy={(index * 37) % 180}
          r={index % 3 === 0 ? 1.2 : 0.7}
          fill="var(--text-primary, #E0ECF4)"
          opacity="0.52"
        />
      ))}
      <path d="M0 200 L120 150 L210 175 L320 130 L430 165 L540 120 L660 155 L780 110 L900 150 L1030 115 L1150 145 L1270 105 L1400 140 L1400 320 L0 320 Z" fill={`url(#${far})`} />
      <path d="M0 200 L120 150 L210 175 L320 130 L430 165 L540 120 L660 155 L780 110 L900 150 L1030 115 L1150 145 L1270 105 L1400 140" fill="none" stroke="var(--accent-primary, #60C0F0)" strokeWidth="1" opacity="0.42" />
      <path d="M0 240 L80 210 L180 235 L290 180 L390 220 L500 170 L620 215 L740 175 L860 220 L990 180 L1120 215 L1240 175 L1400 210 L1400 320 L0 320 Z" fill={`url(#${mid})`} opacity="0.93" />
      <path d="M180 235 L290 180 L390 220 L500 170 L620 215 L740 175 L860 220 L990 180" fill="none" stroke="var(--accent-secondary, #8B5CF6)" strokeWidth="1" opacity="0.5" />
      <path d="M0 280 L160 245 L300 270 L460 230 L620 265 L780 235 L940 270 L1100 240 L1260 270 L1400 250 L1400 320 L0 320 Z" fill={`url(#${near})`} />
      <g opacity="0.68">
        <polygon points="120,260 140,200 158,255 142,290 122,285" fill="color-mix(in srgb, var(--accent-primary, #60C0F0) 36%, transparent)" stroke="var(--accent-primary, #60C0F0)" />
        <polygon points="155,275 170,235 180,275 168,300" fill="color-mix(in srgb, var(--accent-secondary, #8B5CF6) 34%, transparent)" stroke="var(--accent-secondary, #8B5CF6)" />
        <polygon points="1220,265 1240,215 1260,265 1245,300 1225,295" fill="color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent)" stroke="var(--accent-primary, #60C0F0)" />
      </g>
      <line x1="0" y1="280" x2="1400" y2="280" stroke="var(--accent-primary, #60C0F0)" strokeWidth="0.7" opacity="0.2" />
    </svg>
  );
};

export const CrystalScene: React.FC<{ tone?: Tone }> = ({ tone = 'violet' }) => {
  const sky = suffix(`sky-${tone}`);
  const aura = suffix(`aura-${tone}`);
  const vars = toneVars[tone];

  return (
    <svg viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Training reel crystal scene">
      <defs>
        <linearGradient id={sky} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={vars.deep} />
          <stop offset="1" stopColor="var(--bg-base, #0A0A0F)" />
        </linearGradient>
        <radialGradient id={aura} cx="0.5" cy="0.55" r="0.55">
          <stop offset="0" stopColor={vars.soft} />
          <stop offset="1" stopColor="transparent" />
        </radialGradient>
      </defs>
      <rect width="400" height="260" fill={`url(#${sky})`} />
      <circle cx="200" cy="180" r="120" fill={`url(#${aura})`} opacity="0.72" />
      <polygon points="40,260 60,170 80,260" fill={vars.soft} opacity="0.62" />
      <polygon points="70,260 95,140 120,260" fill={vars.soft} opacity="0.5" />
      <polygon points="320,260 340,165 360,260" fill={vars.soft} opacity="0.62" />
      <polygon points="350,260 380,140 400,200 400,260" fill={vars.soft} opacity="0.55" />
      <g>
        <rect x="120" y="120" width="160" height="6" fill="var(--bg-base, #0A0A0F)" />
        <rect x="106" y="108" width="14" height="30" fill="var(--bg-base, #0A0A0F)" stroke={vars.rim} strokeWidth="0.8" />
        <rect x="280" y="108" width="14" height="30" fill="var(--bg-base, #0A0A0F)" stroke={vars.rim} strokeWidth="0.8" />
        <path d="M155 130 L150 200 L170 250 L230 250 L250 200 L245 130 L220 145 L180 145 Z" fill="var(--bg-base, #0A0A0F)" stroke={vars.rim} strokeWidth="1" strokeOpacity="0.62" />
        <path d="M155 130 L130 150 L120 175" fill="none" stroke="var(--bg-base, #0A0A0F)" strokeWidth="22" strokeLinecap="round" />
        <path d="M245 130 L270 150 L280 175" fill="none" stroke="var(--bg-base, #0A0A0F)" strokeWidth="22" strokeLinecap="round" />
        <path d="M155 130 L130 150 L120 175" fill="none" stroke={vars.rim} strokeWidth="1" strokeOpacity="0.5" />
        <path d="M245 130 L270 150 L280 175" fill="none" stroke={vars.rim} strokeWidth="1" strokeOpacity="0.5" />
        <circle cx="200" cy="115" r="18" fill="var(--bg-base, #0A0A0F)" stroke={vars.rim} strokeWidth="1" strokeOpacity="0.58" />
      </g>
    </svg>
  );
};
