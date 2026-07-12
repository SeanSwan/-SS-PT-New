/**
 * PdfApprovalVault.styles
 * =======================
 * Crystalline-Swan "Approval Vault" modal chrome (Design Brain C12 glass panel).
 * Graphite panel on an Obsidian blurred overlay, Frost White text, Wing-Purple
 * focus rings, Wing-Purple -> Ice-Wing gradient primary CTA (Dual-Button Glow:
 * purple bg -> cyan glow). Tier-1 scale+fade entrance; tier-3 reduced-motion
 * collapses to opacity-only. No hardcoded colors without a token fallback.
 */
import styled, { keyframes, css } from 'styled-components';

const overlayIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

const panelIn = keyframes`
  from { opacity: 0; transform: translateY(8px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
`;

const shimmer = keyframes`
  0%   { background-position: -420px 0; }
  100% { background-position: 420px 0; }
`;

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  /* 2200 = house precedent for full-screen dialogs (WorkoutPlannerBlendDialog,
     WorkoutDayDrilldown): clears fixed header, dropdowns, and toasts. */
  z-index: 2200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 78%, transparent);
  backdrop-filter: blur(8px);
  animation: ${overlayIn} 160ms ease-out;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    backdrop-filter: blur(4px);
  }
`;

export const Panel = styled.div`
  display: flex;
  flex-direction: column;
  width: min(920px, 96vw);
  max-height: 92vh;
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 35%, transparent);
  background: var(--bg-surface, #1A1A24);
  color: var(--text-primary, #E0ECF4);
  box-shadow: 0 28px 60px rgba(0, 0, 0, 0.6);
  overflow: hidden;
  animation: ${panelIn} 200ms cubic-bezier(0.22, 1, 0.36, 1);

  @media (prefers-reduced-motion: reduce) {
    animation: ${overlayIn} 120ms ease-out;
  }
`;

export const Header = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.6rem;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent);
`;

export const TitleGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: 'Plus Jakarta Sans', 'Sora', sans-serif;
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--text-primary, #E0ECF4);
`;

export const BrandChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  max-width: 15rem;
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 45%, transparent);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent);
  color: var(--text-primary, #E0ECF4);
  font-size: 0.74rem;
  font-weight: 600;
  white-space: nowrap;

  b {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

export const CloseButton = styled.button`
  margin-left: auto;
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 25%, transparent);
  background: transparent;
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;

  &:hover { background: color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent); }
  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;

export const PreviewArea = styled.div`
  flex: 1;
  min-height: 46vh;
  display: flex;
  padding: 0.75rem;
  background: color-mix(in srgb, var(--bg-base, #0A0A0F) 55%, transparent);
`;

export const PreviewFrame = styled.iframe`
  flex: 1;
  width: 100%;
  min-height: 46vh;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  border-radius: 10px;
  background: #ffffff;
`;

const centered = css`
  flex: 1;
  min-height: 46vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  text-align: center;
  padding: 1.5rem;
`;

export const LoadingState = styled.div`
  ${centered};
  color: var(--text-secondary, #9FB6C8);
  font-size: 0.82rem;

  .shimmer {
    width: min(360px, 80%);
    height: 10px;
    border-radius: 999px;
    background: linear-gradient(
      90deg,
      color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent) 25%,
      color-mix(in srgb, var(--accent-primary, #60C0F0) 40%, transparent) 50%,
      color-mix(in srgb, var(--accent-secondary, #8B5CF6) 12%, transparent) 75%
    );
    background-size: 420px 100%;
    animation: ${shimmer} 1.1s linear infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    .shimmer { animation: none; opacity: 0.6; }
  }

  svg { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) { svg { animation: none; } }
`;

export const ErrorState = styled.div`
  ${centered};
  color: var(--text-primary, #E0ECF4);
  font-size: 0.84rem;

  svg { color: var(--accent-warn, #C6A84B); }
  span { color: var(--text-secondary, #9FB6C8); }
`;

export const Footer = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.6rem;
  padding: 0.85rem 1rem;
  border-top: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 16%, transparent);

  @media (max-width: 480px) {
    flex-direction: column-reverse;
    align-items: stretch;
  }
`;

export const SafetyHint = styled.span`
  margin-right: auto;
  color: var(--text-secondary, #9FB6C8);
  font-size: 0.72rem;

  @media (max-width: 480px) {
    margin-right: 0;
    text-align: center;
  }
`;

export const CancelButton = styled.button`
  min-height: 44px;
  padding: 0 1.1rem;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 25%, transparent);
  background: transparent;
  color: var(--text-secondary, #9FB6C8);
  font-weight: 600;
  font-size: 0.82rem;
  cursor: pointer;

  &:hover { color: var(--text-primary, #E0ECF4); }
  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;

export const ApproveButton = styled.button`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0 1.3rem;
  border-radius: 10px;
  border: none;
  /* Dual-Button Glow: purple bg -> cyan glow. */
  background: linear-gradient(
    135deg,
    var(--accent-secondary, #8B5CF6) 0%,
    var(--accent-primary, #60C0F0) 100%
  );
  color: var(--text-on-accent, #0A0A0F);
  font-family: 'Plus Jakarta Sans', 'Sora', sans-serif;
  font-weight: 700;
  font-size: 0.84rem;
  cursor: pointer;
  box-shadow: 0 0 0 rgba(96, 192, 240, 0);
  transition: box-shadow 160ms ease, transform 120ms ease;

  &:hover:not(:disabled) {
    box-shadow: 0 6px 22px color-mix(in srgb, var(--accent-primary, #60C0F0) 45%, transparent);
    transform: translateY(-1px);
  }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &:hover:not(:disabled) { transform: none; }
  }

  @media (max-width: 480px) {
    justify-content: center;
  }
`;
