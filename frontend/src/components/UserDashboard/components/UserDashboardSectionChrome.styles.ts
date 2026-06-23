/**
 * Shared Creator Observatory chrome for non-home UserDashboard V3 panels.
 */

import styled, { css } from 'styled-components';

export const visionVars = css`
  --vision-panel: color-mix(in srgb, var(--bg-elevated, #141419) 78%, transparent);
  --vision-panel-deep: color-mix(in srgb, var(--bg-base, #0A0A0F) 88%, transparent);
  --vision-border: color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  --vision-soft: color-mix(in srgb, var(--text-primary, #E0ECF4) 62%, transparent);
`;

export const visionPanelCss = css`
  ${visionVars}
  border: 1px solid var(--vision-border);
  border-radius: 22px;
  background:
    linear-gradient(160deg, var(--vision-panel), var(--vision-panel-deep)),
    var(--bg-elevated, #141419);
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, var(--accent-primary, #60C0F0) 9%, transparent),
    0 16px 34px color-mix(in srgb, var(--bg-base, #0A0A0F) 62%, transparent);
  backdrop-filter: blur(18px);
`;

export const visionCardCss = css`
  ${visionVars}
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  border-radius: 18px;
  background:
    linear-gradient(150deg, color-mix(in srgb, var(--bg-elevated, #141419) 72%, transparent), color-mix(in srgb, var(--bg-base, #0A0A0F) 86%, transparent)),
    var(--bg-elevated, #141419);
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--text-primary, #E0ECF4) 6%, transparent);
`;

export const visionControlCss = css`
  min-height: 44px;
  border-radius: 999px;
  border: 1px solid var(--vision-border);
  background: color-mix(in srgb, var(--bg-elevated, #141419) 70%, transparent);
  color: var(--text-primary, #E0ECF4);
  font: 800 0.78rem/1 var(--font-ui, 'Sora', sans-serif);
  transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;

  &:hover:not(:disabled) {
    border-color: var(--accent-secondary, #8B5CF6);
    transform: translateY(-1px);
    box-shadow: 0 0 16px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 28%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 3px;
  }
`;

export const visionAccentButtonCss = css`
  ${visionControlCss}
  border-color: transparent;
  background: var(--button-primary-bg, #002060);
  color: var(--button-primary-text, #030712);
  box-shadow: 0 0 22px color-mix(in srgb, var(--accent-primary, #60C0F0) 26%, transparent);
`;

export const VisionTabSurface = styled.section`
  ${visionVars}
  position: relative;
  display: flex;
  flex-direction: column;
  gap: clamp(1rem, 1.5vw, 1.4rem);
  min-width: 0;
`;

/* Workstream O2 (density pass): the section hero is an identity strip, not a
   billboard — tighter padding so content starts sooner under the new cover. */
export const VisionSectionHero = styled.header<{ $tone?: 'cyan' | 'violet' | 'gold' }>`
  ${visionPanelCss}
  position: relative;
  overflow: hidden;
  padding: clamp(0.8rem, 1.2vw, 1.15rem);

  &::before {
    content: '';
    position: absolute;
    inset: -36% -14% auto;
    height: 120%;
    pointer-events: none;
    background:
      radial-gradient(circle at 18% 18%, color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent), transparent 22rem),
      radial-gradient(circle at 84% 20%, color-mix(in srgb, var(--accent-secondary, #8B5CF6) 22%, transparent), transparent 24rem),
      radial-gradient(circle at 52% 88%, color-mix(in srgb, var(--accent-gold, #C6A84B) 11%, transparent), transparent 26rem);
  }
`;

export const VisionHeroContent = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.9rem;
  align-items: center;
`;

export const VisionHeroIcon = styled.div<{ $tone?: 'cyan' | 'violet' | 'gold' }>`
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  border: 1px solid color-mix(in srgb, ${({ $tone }) => {
    if ($tone === 'gold') return 'var(--accent-gold, #C6A84B)';
    if ($tone === 'violet') return 'var(--accent-secondary, #8B5CF6)';
    return 'var(--accent-primary, #60C0F0)';
  }} 45%, transparent);
  background: color-mix(in srgb, ${({ $tone }) => {
    if ($tone === 'gold') return 'var(--accent-gold, #C6A84B)';
    if ($tone === 'violet') return 'var(--accent-secondary, #8B5CF6)';
    return 'var(--accent-primary, #60C0F0)';
  }} 14%, transparent);
  color: ${({ $tone }) => {
    if ($tone === 'gold') return 'var(--accent-gold, #C6A84B)';
    if ($tone === 'violet') return 'var(--accent-secondary, #8B5CF6)';
    return 'var(--accent-primary, #60C0F0)';
  }};
`;

export const VisionEyebrow = styled.span`
  color: var(--accent-primary, #60C0F0);
  font: 800 0.68rem/1 var(--font-data, 'Fira Code', monospace);
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

export const VisionTitle = styled.h2`
  margin: 0.25rem 0 0;
  color: var(--text-heading, var(--text-primary, #E0ECF4));
  font: 900 clamp(1.2rem, 1.9vw, 1.65rem)/1.05 var(--font-heading, 'Plus Jakarta Sans', sans-serif);
  letter-spacing: 0;
`;

export const VisionCopy = styled.p`
  max-width: 68ch;
  margin: 0.35rem 0 0;
  color: var(--vision-soft);
  font: 700 0.85rem/1.5 var(--font-ui, 'Sora', sans-serif);

  /* Phones get the title only — the descriptive line costs a content row. */
  @media (max-width: 480px) {
    display: none;
  }
`;

export const VisionLegacyScope = styled.div`
  ${visionVars}
  min-width: 0;

  * {
    box-sizing: border-box;
  }
`;
