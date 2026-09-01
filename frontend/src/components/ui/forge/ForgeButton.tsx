/**
 * ForgeButton — SS-PT React binding for the @swan/forge headless Button core.
 * ═══════════════════════════════════════════════════════════════════════════
 * BLUEPRINT (Rule 5): Strangler PR #1 of the Swan Component Forge (plan
 * docs/ai-workflow/brainstorms/component-forge-catalog-2026-08-24.md §6 Phase 1.5).
 * Behavior comes from @swan/forge/core/button (variant/alias resolution, a11y
 * attrs, activation guard); looks come from the zero-runtime Forge CSS. The
 * component carries `sw-pack-crystalline-swan` on itself, so pack SEMANTIC tokens
 * scope to the button subtree — no global data attribute, no app-entry edits.
 * DISCLOSED GLOBAL FOOTPRINT: primitive.css declares `--sw-p-*` scales at :root
 * (namespaced; verified no collision with any `--sw-*` SS-PT already defines).
 * Rollback = revert the wiring commit (GolfSection import/JSX + the manifest and
 * lockfile lines). Props are a GlowButton-compatible subset
 * (text, variant/theme/colorScheme incl. legacy aliases, isLoading, icons),
 * so strangler swaps are mechanical. Claude authored this binding; the Forge
 * package + 5-round Ox/GLM panel define its contract.
 * NOT themeable here (core-invariant): keyboard semantics, focus, 44px floor.
 */
import React from 'react';
// Zero-runtime Forge styles — Vite hoists these into the CSS graph once.
import '@swan/forge/tokens/primitive.css';
import '@swan/forge/tokens/packs/crystalline-swan.css';
import '@swan/forge/css/button.css';
import '@swan/forge/css/sheen.css';
import {
  getButtonState,
  getButtonAttrs,
  canActivate,
} from '@swan/forge/core/button';
import { useSheenPointer } from '../../../hooks/useSheenPointer';
import { SheenFrame, type SheenWorld } from './SheenFrame';

export interface ForgeButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  text?: string;
  variant?: string;
  /** GlowButton legacy aliases — honored via the core's resolver */
  theme?: string;
  colorScheme?: string;
  size?: 'small' | 'medium' | 'large';
  type?: 'button' | 'submit' | 'reset';
  isLoading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  /** GlowButton icon aliases */
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  /** Entrance animation (rise + fade once on mount) — parity with GlowButton's
   *  animateOnRender; rendered as the Forge `.sw-btn--enter` class (motion-gated). */
  animateOnRender?: boolean;
  /** GlowButton-only props — accepted for drop-in compatibility, intentionally NOT
   *  rendered (glow intensity / pulse / haptics are pack or device concerns in the
   *  Forge). Destructured so they never leak to the DOM as junk attributes. */
  pulse?: boolean;
  haptic?: boolean;
  glowIntensity?: 'low' | 'medium' | 'high';
  /**
   * Sheen tier (SWA-224): render the border as a window onto a world.
   * Opt-in and off by default — the base button is unchanged for the ~90 existing
   * call sites, so this cannot alter a surface nobody asked to change.
   */
  sheen?: SheenWorld;
  children?: React.ReactNode;
}

/** Dual-Button Glow as data: the orb pair is the OPPOSITE family from the fill. */
const SHEEN_ORB: Record<string, readonly [string, string]> = {
  accent: ['#60C0F0', '#50A0F0'], // purple fill → cyan pole  // swan-guard-allow-hex Forge pack values, mirrored for the JS engine
  gilded: ['#C6A84B', '#60C0F0'], // gold fill → ice pole     // swan-guard-allow-hex Forge pack values, mirrored for the JS engine
  primary: ['#8B5CF6', '#60C0F0'], // blue fill → purple pole // swan-guard-allow-hex Forge pack values, mirrored for the JS engine
};

const ForgeButton: React.FC<ForgeButtonProps> = ({
  text,
  variant,
  theme,
  colorScheme,
  size,
  type,
  isLoading,
  disabled,
  fullWidth,
  leftIcon,
  rightIcon,
  startIcon,
  endIcon,
  animateOnRender,
  // dropped on purpose (see props doc) — never reach the DOM
  pulse: _pulse,
  haptic: _haptic,
  glowIntensity: _glowIntensity,
  sheen,
  children,
  className,
  onClick,
  ...rest
}) => {
  const state = getButtonState({ variant, theme, colorScheme, size, type, isLoading, disabled, fullWidth });
  // Spread EVERY core attr (future core additions flow through automatically);
  // `class` is re-keyed to React's className with the self-scoped pack class.
  const { class: coreClass, disabled: coreDisabled, ...coreAttrs } = getButtonAttrs(state) as Record<string, string | boolean | undefined>;

  // Registered only when a sheen world is requested: a null ref is a no-op, so
  // every non-sheen button costs the pointer engine nothing at all.
  const sheenRef = React.useRef<HTMLButtonElement>(null);
  const nullRef = React.useRef<HTMLButtonElement>(null);
  useSheenPointer(sheen ? sheenRef : nullRef, {
    orb: SHEEN_ORB[state.variant as string] ?? SHEEN_ORB.primary,
    // MUST match the names css/sheen.css reads, or the orb silently never moves.
    varPrefix: 'sw-sheen-',
  });

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!canActivate(state)) { e.preventDefault(); return; }
    onClick?.(e);
  };

  return (
    <button
      ref={sheen ? sheenRef : undefined}
      {...rest}
      {...(coreAttrs as React.ButtonHTMLAttributes<HTMLButtonElement>)}
      disabled={coreDisabled === true}
      className={['sw-pack-crystalline-swan', coreClass, animateOnRender ? 'sw-btn--enter' : '', className].filter(Boolean).join(' ')}
      onClick={handleClick}
    >
      {sheen ? <SheenFrame world={sheen} /> : null}
      {leftIcon ?? startIcon}
      {children || text /* `||` not `??`: the original GlowButton renders `children || text`, so falsy children ('' / false / 0) fall back to the label (Ox, PR #2 review) */}
      {rightIcon ?? endIcon}
    </button>
  );
};

export default ForgeButton;
