/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: PetSprite                                         ║
 * ║  PURPOSE: SVG-based evolving pet sprite — scales all devices  ║
 * ║  OWNER: Claude Opus 4.6 | LAST VALIDATED: 2026-03-28         ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WIREFRAME:
 * ┌──────────────────────────┐
 * │      ✨ (aura glow)     │  ← Mythic stage only
 * │     👑 (crown)          │  ← Elder+ stage
 * │    ◆◆◆ (body)          │  ← Species-shaped body
 * │   ◇ (eye) ◇            │  ← Hatchling+ stage
 * │    ~~~~ (tail)          │  ← Juvenile+ stage
 * │   ∠∠ (wings)           │  ← Adult+ stage
 * │   ⚔ (weapon mod)       │  ← From personal records
 * │   🛡 (armor mod)        │  ← From strength workouts
 * └──────────────────────────┘
 *
 * SCALING: SVG viewBox is 200x200. Container scales via CSS width/height.
 * Renders identically from 320px phone to 3840px 4K display.
 */
import React, { useMemo } from 'react';
import type { PetData, PetSpeciesId } from './CompanionPetTypes';

// ─────────────────────────────────────────────────────────────
// SECTION: Species Body Shapes
// PURPOSE: Each species has unique SVG body geometry
// ─────────────────────────────────────────────────────────────

const SPECIES_BODIES: Record<PetSpeciesId, { body: string; tail: string; wingL: string; wingR: string; crown: string }> = {
  crystal_dragon: {
    body: 'M100,60 L130,80 L125,120 L115,140 L85,140 L75,120 L70,80 Z',
    tail: 'M100,140 Q110,165 130,175 Q120,170 115,155',
    wingL: 'M70,85 L35,55 L45,75 L60,90',
    wingR: 'M130,85 L165,55 L155,75 L140,90',
    crown: 'M85,58 L90,45 L95,55 L100,40 L105,55 L110,45 L115,58',
  },
  iron_wolf: {
    body: 'M100,65 L125,75 L130,110 L120,140 L80,140 L70,110 L75,75 Z',
    tail: 'M80,140 Q60,155 45,145 Q55,150 65,140',
    wingL: 'M75,80 L55,60 L60,80',
    wingR: 'M125,80 L145,60 L140,80',
    crown: 'M88,63 L92,50 L100,58 L108,50 L112,63',
  },
  ember_phoenix: {
    body: 'M100,55 L128,78 L122,118 L112,142 L88,142 L78,118 L72,78 Z',
    tail: 'M100,142 Q95,170 80,180 Q90,172 95,155 M100,142 Q105,170 120,180 Q110,172 105,155',
    wingL: 'M72,80 L30,50 L40,70 L55,85 L65,90',
    wingR: 'M128,80 L170,50 L160,70 L145,85 L135,90',
    crown: 'M82,53 L88,35 L94,50 L100,30 L106,50 L112,35 L118,53',
  },
  frost_swan: {
    body: 'M100,50 L120,70 L118,100 L115,130 L108,145 L92,145 L85,130 L82,100 L80,70 Z',
    tail: 'M92,145 Q88,165 95,175 Q97,168 100,155 M108,145 Q112,165 105,175',
    wingL: 'M80,75 L45,55 L50,70 L60,85 L75,90',
    wingR: 'M120,75 L155,55 L150,70 L140,85 L125,90',
    crown: 'M90,48 L95,35 L100,45 L105,35 L110,48',
  },
  shadow_panther: {
    body: 'M100,62 L128,78 L130,108 L122,138 L78,138 L70,108 L72,78 Z',
    tail: 'M122,138 Q140,148 155,140 Q148,145 135,142',
    wingL: 'M72,82 L50,65 L58,82',
    wingR: 'M128,82 L150,65 L142,82',
    crown: 'M88,60 L95,48 L100,56 L105,48 L112,60',
  },
};

// ─────────────────────────────────────────────────────────────
// SECTION: Appearance Mod SVG Overlays
// ─────────────────────────────────────────────────────────────

function renderArmorMod(mod: string, color: string): React.ReactNode {
  if (mod.includes('armor') || mod.includes('plates')) {
    const opacity = mod.includes('mythic') ? 0.8 : mod.includes('crystal') ? 0.6 : mod.includes('steel') ? 0.45 : 0.3;
    return (
      <g key="armor">
        <path d="M85,80 L100,72 L115,80 L115,110 L100,115 L85,110 Z"
          fill={color} fillOpacity={opacity} stroke={color} strokeWidth="0.5" strokeOpacity={0.6} />
      </g>
    );
  }
  if (mod.includes('speed') || mod.includes('wind') || mod.includes('lightning') || mod.includes('sonic')) {
    const count = mod.includes('sonic') ? 5 : mod.includes('lightning') ? 4 : mod.includes('wind') ? 3 : 2;
    return (
      <g key="speed">
        {Array.from({ length: count }).map((_, i) => (
          <line key={i} x1={55 - i * 4} y1={90 + i * 8} x2={40 - i * 4} y2={88 + i * 8}
            stroke={color} strokeWidth="1.5" strokeOpacity={0.5 - i * 0.08} strokeLinecap="round" />
        ))}
      </g>
    );
  }
  if (mod.includes('glow') || mod.includes('aura') || mod.includes('flame')) {
    const r = mod.includes('legendary') ? 60 : mod.includes('bright') ? 50 : mod.includes('steady') ? 40 : 30;
    return (
      <circle key="glow" cx={100} cy={100} r={r}
        fill={color} fillOpacity={0.08} stroke={color} strokeWidth="1" strokeOpacity={0.15}>
        <animate attributeName="r" values={`${r};${r + 4};${r}`} dur="2s" repeatCount="indefinite" />
        <animate attributeName="fill-opacity" values="0.08;0.14;0.08" dur="2s" repeatCount="indefinite" />
      </circle>
    );
  }
  if (mod.includes('blade') || mod.includes('sword') || mod.includes('lance') || mod.includes('weapon')) {
    const scale = mod.includes('mythic') ? 1.3 : mod.includes('lance') ? 1.15 : mod.includes('long') ? 1 : 0.7;
    return (
      <g key="weapon" transform={`translate(138, 95) scale(${scale})`}>
        <line x1="0" y1="0" x2="15" y2="-20" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <line x1="5" y1="-5" x2="10" y2="-5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      </g>
    );
  }
  if (mod.includes('collar') || mod.includes('cape') || mod.includes('crown') || mod.includes('mantle')) {
    return (
      <g key="social-accessory">
        <circle cx={100} cy={68} r={4} fill="none" stroke={color} strokeWidth="1.5" strokeOpacity={0.7} />
      </g>
    );
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Main Component
// ─────────────────────────────────────────────────────────────

interface PetSpriteProps {
  pet: PetData;
  size?: number;
}

const PetSprite: React.FC<PetSpriteProps> = ({ pet, size = 200 }) => {
  const species = pet.species;
  const shapes = SPECIES_BODIES[species] || SPECIES_BODIES.crystal_dragon;
  const stage = pet.evolution.stage;
  const features = pet.evolution.features;
  const baseColor = pet.speciesInfo.baseColor;
  const accentColor = pet.speciesInfo.accentColor;
  const healthRatio = pet.health / 100;
  const moodAnim = pet.mood.animation;

  // Neglect visual: reduce saturation + opacity when health drops
  const bodyOpacity = 0.5 + healthRatio * 0.5;
  const glowIntensity = healthRatio * 0.4;

  // Animation based on mood
  const animTransform = useMemo(() => {
    switch (moodAnim) {
      case 'bounce': return 'translateY(-3px)';
      case 'wiggle': return 'rotate(2deg)';
      case 'droop': return 'translateY(3px) rotate(-2deg)';
      case 'shiver': return 'translateX(1px)';
      case 'flicker': return 'scale(0.97)';
      default: return 'none';
    }
  }, [moodAnim]);

  // Egg stage — just show a glowing egg
  if (stage === 0) {
    return (
      <svg width={size} height={size} viewBox="0 0 200 200" role="img" aria-label={`${pet.name} (Egg)`}>
        <defs>
          <radialGradient id="egg-glow" cx="50%" cy="40%" r="50%">
            <stop offset="0%" stopColor={baseColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={accentColor} stopOpacity="0.05" />
          </radialGradient>
        </defs>
        <circle cx={100} cy={100} r={50} fill="url(#egg-glow)" />
        <ellipse cx={100} cy={105} rx={28} ry={35} fill={baseColor} fillOpacity={0.7} stroke={accentColor} strokeWidth="1.5">
          <animate attributeName="ry" values="35;36;35" dur="3s" repeatCount="indefinite" />
        </ellipse>
        <text x={100} y={165} textAnchor="middle" fontFamily="Sora, sans-serif" fontSize="11" fill={baseColor} fillOpacity="0.7">
          {pet.name}
        </text>
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 200 200" role="img" aria-label={`${pet.name} the ${pet.speciesInfo.name}`}>
      <defs>
        <radialGradient id={`pet-glow-${species}`} cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor={baseColor} stopOpacity={glowIntensity} />
          <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
        </radialGradient>
        <filter id="pet-shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor={baseColor} floodOpacity="0.3" />
        </filter>
      </defs>

      {/* Background glow (health-dependent) */}
      <circle cx={100} cy={100} r={70} fill={`url(#pet-glow-${species})`}>
        <animate attributeName="r" values="70;73;70" dur="3s" repeatCount="indefinite" />
      </circle>

      {/* Aura (Mythic only) */}
      {features.includes('aura') && (
        <circle cx={100} cy={100} r={65} fill="none"
          stroke={accentColor} strokeWidth="1" strokeOpacity="0.2" strokeDasharray="4 4">
          <animateTransform attributeName="transform" type="rotate"
            from="0 100 100" to="360 100 100" dur="20s" repeatCount="indefinite" />
        </circle>
      )}

      {/* Main body group with mood animation */}
      <g filter="url(#pet-shadow)" opacity={bodyOpacity} style={{ transition: 'opacity 0.5s ease' }}>
        {/* Animate group for mood */}
        <animateTransform attributeName="transform" type="translate"
          values={moodAnim === 'bounce' ? '0,0;0,-4;0,0' :
                  moodAnim === 'shiver' ? '0,0;1,0;-1,0;0,0' :
                  moodAnim === 'droop' ? '0,0;0,2;0,0' : '0,0;0,0;0,0'}
          dur={moodAnim === 'bounce' ? '1s' : moodAnim === 'shiver' ? '0.3s' : '2s'}
          repeatCount="indefinite" />

        {/* Wings (Adult+) */}
        {features.includes('wings') && (
          <g>
            <path d={shapes.wingL} fill={baseColor} fillOpacity={0.5} stroke={accentColor} strokeWidth="0.8">
              <animateTransform attributeName="transform" type="rotate"
                values="0 70 85;-8 70 85;0 70 85" dur="2s" repeatCount="indefinite" />
            </path>
            <path d={shapes.wingR} fill={baseColor} fillOpacity={0.5} stroke={accentColor} strokeWidth="0.8">
              <animateTransform attributeName="transform" type="rotate"
                values="0 130 85;8 130 85;0 130 85" dur="2s" repeatCount="indefinite" />
            </path>
          </g>
        )}

        {/* Tail (Juvenile+) */}
        {features.includes('tail') && (
          <path d={shapes.tail} fill="none" stroke={baseColor} strokeWidth="2.5" strokeLinecap="round" strokeOpacity={0.7}>
            <animateTransform attributeName="transform" type="rotate"
              values="0 100 140;3 100 140;-3 100 140;0 100 140" dur="3s" repeatCount="indefinite" />
          </path>
        )}

        {/* Body */}
        {features.includes('body') && (
          <path d={shapes.body} fill={baseColor} fillOpacity={0.65} stroke={accentColor} strokeWidth="1.2" />
        )}

        {/* Eyes (Hatchling+) */}
        {features.includes('eyes') && (
          <g>
            <circle cx={90} cy={85} r={4} fill={accentColor}>
              <animate attributeName="r" values="4;4;0.5;4" dur="4s" repeatCount="indefinite"
                keyTimes="0;0.92;0.96;1" />
            </circle>
            <circle cx={110} cy={85} r={4} fill={accentColor}>
              <animate attributeName="r" values="4;4;0.5;4" dur="4s" repeatCount="indefinite"
                keyTimes="0;0.92;0.96;1" />
            </circle>
            {/* Highlight dots */}
            <circle cx={92} cy={83} r={1.5} fill="#FFFFFF" fillOpacity="0.8" />
            <circle cx={112} cy={83} r={1.5} fill="#FFFFFF" fillOpacity="0.8" />

            {/* Sad eyes when health low */}
            {pet.health < 30 && (
              <>
                <line x1={85} y1={79} x2={95} y2={82} stroke={accentColor} strokeWidth="1" strokeOpacity="0.5" />
                <line x1={115} y1={79} x2={105} y2={82} stroke={accentColor} strokeWidth="1" strokeOpacity="0.5" />
              </>
            )}
          </g>
        )}

        {/* Crown (Elder+) */}
        {features.includes('crown') && (
          <path d={shapes.crown} fill={accentColor} fillOpacity={0.7} stroke={baseColor} strokeWidth="0.8">
            <animate attributeName="fill-opacity" values="0.7;0.9;0.7" dur="3s" repeatCount="indefinite" />
          </path>
        )}

        {/* Appearance mods from activity */}
        {pet.appearanceMods.map(mod => renderArmorMod(mod.mod, accentColor))}

        {/* Neglect indicator: crying when sad/critical */}
        {pet.mood.id === 'sad' || pet.mood.id === 'critical' ? (
          <g>
            <circle cx={93} cy={92} r={1} fill="#60C0F0" fillOpacity="0.6">
              <animate attributeName="cy" values="92;105;92" dur="2s" repeatCount="indefinite" />
              <animate attributeName="fill-opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx={113} cy={92} r={1} fill="#60C0F0" fillOpacity="0.6">
              <animate attributeName="cy" values="92;108;92" dur="2.3s" repeatCount="indefinite" />
              <animate attributeName="fill-opacity" values="0.6;0;0.6" dur="2.3s" repeatCount="indefinite" />
            </circle>
          </g>
        ) : null}

        {/* Happy sparkles when ecstatic */}
        {pet.mood.id === 'ecstatic' && (
          <g>
            {[0, 1, 2, 3].map(i => (
              <circle key={i}
                cx={70 + i * 22} cy={50 + (i % 2) * 10} r={1.5}
                fill={accentColor} fillOpacity="0.8">
                <animate attributeName="r" values="0;2;0" dur={`${1.2 + i * 0.3}s`} repeatCount="indefinite" />
                <animate attributeName="fill-opacity" values="0;0.8;0" dur={`${1.2 + i * 0.3}s`} repeatCount="indefinite" />
              </circle>
            ))}
          </g>
        )}
      </g>

      {/* Pet name + mood */}
      <text x={100} y={180} textAnchor="middle" fontFamily="Sora, sans-serif" fontSize="10"
        fill={baseColor} fillOpacity={0.8}>
        {pet.name}
      </text>
      <text x={100} y={193} textAnchor="middle" fontFamily="Fira Code, monospace" fontSize="8"
        fill={accentColor} fillOpacity={0.5}>
        {pet.mood.emoji} {pet.evolution.name}
      </text>
    </svg>
  );
};

export default React.memo(PetSprite);
