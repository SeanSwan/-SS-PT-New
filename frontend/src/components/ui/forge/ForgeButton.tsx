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
import {
  getButtonState,
  getButtonAttrs,
  canActivate,
} from '@swan/forge/core/button';

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
  /** GlowButton-only motion props — accepted for drop-in compatibility, intentionally
   *  NOT rendered (motion is a pack/reduced-motion concern in the Forge). Destructured
   *  so they never leak to the DOM as junk attributes. */
  animateOnRender?: boolean;
  pulse?: boolean;
  haptic?: boolean;
  glowIntensity?: 'low' | 'medium' | 'high';
  children?: React.ReactNode;
}

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
  // dropped on purpose (see props doc) — never reach the DOM
  animateOnRender: _animateOnRender,
  pulse: _pulse,
  haptic: _haptic,
  glowIntensity: _glowIntensity,
  children,
  className,
  onClick,
  ...rest
}) => {
  const state = getButtonState({ variant, theme, colorScheme, size, type, isLoading, disabled, fullWidth });
  // Spread EVERY core attr (future core additions flow through automatically);
  // `class` is re-keyed to React's className with the self-scoped pack class.
  const { class: coreClass, disabled: coreDisabled, ...coreAttrs } = getButtonAttrs(state) as Record<string, string | boolean | undefined>;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!canActivate(state)) { e.preventDefault(); return; }
    onClick?.(e);
  };

  return (
    <button
      {...rest}
      {...(coreAttrs as React.ButtonHTMLAttributes<HTMLButtonElement>)}
      disabled={coreDisabled === true}
      className={['sw-pack-crystalline-swan', coreClass, className].filter(Boolean).join(' ')}
      onClick={handleClick}
    >
      {leftIcon ?? startIcon}
      {children ?? text}
      {rightIcon ?? endIcon}
    </button>
  );
};

export default ForgeButton;
