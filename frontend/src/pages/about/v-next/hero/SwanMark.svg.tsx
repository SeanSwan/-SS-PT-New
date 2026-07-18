/**
 * About V-next — SwanMark (Kimi (d): "the swan is what the light bends around"). NOT a drawn swan — a
 * swan-shaped OCCLUDER: the shape is filled with the dark surface color so it reads as a calm, glass-edged
 * ABSENCE over the caustic field, rimmed by a bright accent filament (total-internal-reflection rim light).
 * Pure optics (resolves the "optics not creatures" thesis + kills the cyan trap — dark glass + accent rim,
 * never neon fill). On charge the rim draws + brightens; the clear body is where the name/credential reveal.
 * aria-hidden — decorative; the real h1 lives in the hero. Transform/opacity + stroke-dashoffset only.
 */
import { motion } from 'framer-motion';

// Stylized swan silhouette (graceful S-neck + body), viewBox 0 0 200 200.
const SWAN =
  'M52,158 C36,156 28,138 38,123 C47,110 74,113 92,120 C68,101 70,66 96,52 ' +
  'C114,42 128,50 124,63 C121,73 110,70 108,78 C124,92 138,120 126,146 ' +
  'C117,163 74,161 52,158 Z';

export function SwanMark({ charged }: { charged: boolean }) {
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="about-swan-body" cx="46%" cy="42%" r="70%">
          <stop offset="0%" stopColor="var(--about-caustic-lo)" />
          <stop offset="100%" stopColor="var(--about-bg)" />
        </radialGradient>
        <filter id="about-swan-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* the absence: dark glass body that occludes the caustics inside the swan */}
      <path d={SWAN} fill="url(#about-swan-body)" />

      {/* the rim: bright caustic filament along the contour, "drawn" on charge */}
      <motion.path
        d={SWAN}
        fill="none"
        stroke="var(--about-ice)"
        strokeWidth={1.4}
        strokeLinecap="round"
        filter="url(#about-swan-glow)"
        initial={false}
        animate={{
          pathLength: charged ? 1 : 0.06,
          opacity: charged ? 0.95 : 0.25,
        }}
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }} // --about-ease-crystallize
      />
    </svg>
  );
}
