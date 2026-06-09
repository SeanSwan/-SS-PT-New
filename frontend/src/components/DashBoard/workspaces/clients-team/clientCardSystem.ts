/**
 * Shared Swan client-card primitives.
 *
 * These snippets adapt the attached Store Card handoff into a low-motion
 * data-card system for admin/trainer client lists. Store/showcase cards can
 * keep the full animated SheenCard/GlowButton treatment; client cards use the
 * same sapphire surface, chrome edge, and button language without pointer
 * tracking or sweeping animations.
 */

import { css } from 'styled-components';

export const swanSectionBackdrop = css`
  background:
    radial-gradient(1200px 800px at 80% -10%,
      color-mix(in srgb, var(--accent-secondary, #8B5CF6) 10%, transparent),
      transparent 60%),
    radial-gradient(1000px 700px at 0% 100%,
      color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent),
      transparent 55%),
    var(--bg-base, #050810);
`;

export const swanDataCardShell = css`
  position: relative;
  isolation: isolate;
  overflow: hidden;
  padding: var(--swan-card-padding, 18px);
  border-radius: var(--swan-card-radius, 18px);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
  background:
    linear-gradient(160deg,
      color-mix(in srgb, var(--surface-accent, #003080) 46%, transparent),
      color-mix(in srgb, var(--bg-base, #050810) 74%, var(--primary, #002060) 26%));
  color: var(--text-primary, #E0ECF4);
  text-align: left;
  scroll-margin-block: var(--swan-card-scroll-margin-top, 132px) 24px;
  box-shadow:
    0 22px 50px var(--shadow-ambient, rgba(0, 0, 0, 0.34)),
    inset 0 1px 0 color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent);
  transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms cubic-bezier(0.16, 1, 0.3, 1);

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    background:
      repeating-linear-gradient(90deg,
        color-mix(in srgb, var(--text-primary, #E0ECF4) 2%, transparent) 0,
        color-mix(in srgb, var(--text-primary, #E0ECF4) 2%, transparent) 1px,
        transparent 1px,
        transparent 4px),
      radial-gradient(280px circle at 18% 0%,
        color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent),
        transparent 58%);
    opacity: 0.78;
  }

  &:hover {
    transform: translateY(-2px);
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 52%, transparent);
    box-shadow:
      0 26px 58px var(--shadow-ambient, rgba(0, 0, 0, 0.38)),
      0 0 24px color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover {
      transform: none;
    }
  }

  @media (min-width: 769px) {
    scroll-margin-block: 24px;
  }

  @media (max-width: 430px) {
    --swan-card-scroll-margin-top: 128px;
  }

  @media (max-width: 375px) {
    --swan-card-scroll-margin-top: 122px;
  }
`;

export const swanClientAvatar = css`
  width: var(--swan-avatar-size, 56px);
  height: var(--swan-avatar-size, 56px);
  flex: 0 0 var(--swan-avatar-size, 56px);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--button-text, #FFFFFF);
  font-family: 'Sora', sans-serif;
  font-size: 17px;
  font-weight: 800;
  box-shadow:
    0 0 22px color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent),
    inset 0 1px 0 color-mix(in srgb, var(--text-primary, #E0ECF4) 16%, transparent);
`;

export const swanPill = css`
  min-width: 0;
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 9px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent);
  background: color-mix(in srgb, var(--bg-base, #050810) 78%, transparent);
  color: var(--text-muted, rgba(224, 236, 244, 0.84));
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  font-weight: 700;
  overflow-wrap: anywhere;
`;

export const swanMetricTile = css`
  min-width: 0;
  min-height: 44px;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
  background: color-mix(in srgb, var(--bg-elevated, #141419) 84%, transparent);
  color: var(--text-primary, #E0ECF4);
  overflow-wrap: anywhere;
`;

export const swanClientActionButton = css`
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 12px;
  border: 1px solid var(--swan-action-border, color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent));
  background: var(--swan-action-bg, color-mix(in srgb, var(--surface-accent, #003080) 70%, transparent));
  color: var(--swan-action-fg, var(--text-primary, #E0ECF4));
  box-shadow:
    0 8px 20px var(--swan-action-shadow, rgba(0, 0, 0, 0.22)),
    inset 0 1px 0 color-mix(in srgb, var(--text-primary, #E0ECF4) 16%, transparent);
  cursor: pointer;
  flex-shrink: 0;
  transition: transform 160ms cubic-bezier(0.16, 1, 0.3, 1), border-color 160ms ease,
    box-shadow 160ms ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow:
      0 12px 26px var(--swan-action-shadow, rgba(0, 0, 0, 0.28)),
      0 0 18px color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
  }

  &:active {
    transform: translateY(1px);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 3px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    &:hover,
    &:active {
      transform: none;
    }
  }
`;
