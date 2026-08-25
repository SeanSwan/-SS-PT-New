/**
 * ForgeButton — SS-PT React binding for the @swan/forge headless Button core.
 * ═══════════════════════════════════════════════════════════════════════════
 * BLUEPRINT (Rule 5): Strangler PR #1 of the Swan Component Forge (plan
 * docs/ai-workflow/brainstorms/component-forge-catalog-2026-08-24.md §6 Phase 1.5).
 * Behavior comes from @swan/forge/core/button (variant/alias resolution, a11y
 * attrs, activation guard); looks come from the zero-runtime Forge CSS. The
 * component carries `sw-pack-crystalline-swan` on itself, so pack tokens scope
 * to the button subtree — NO global data attribute, NO app-entry edits, and
 * removal is a one-line revert. Props are a GlowButton-compatible subset
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
  children,
  className,
  onClick,
  ...rest
}) => {
  const state = getButtonState({ variant, theme, colorScheme, size, type, isLoading, disabled, fullWidth });
  const attrs = getButtonAttrs(state) as Record<string, string | boolean | undefined>;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!canActivate(state)) { e.preventDefault(); return; }
    onClick?.(e);
  };

  return (
    <button
      {...rest}
      type={attrs.type as 'button' | 'submit' | 'reset'}
      disabled={attrs.disabled === true}
      aria-disabled={attrs['aria-disabled'] as 'true' | undefined}
      aria-busy={attrs['aria-busy'] as 'true' | undefined}
      data-variant={attrs['data-variant'] as string}
      className={['sw-pack-crystalline-swan', attrs.class, className].filter(Boolean).join(' ')}
      onClick={handleClick}
    >
      {leftIcon}
      {children ?? text}
      {rightIcon}
    </button>
  );
};

export default ForgeButton;
