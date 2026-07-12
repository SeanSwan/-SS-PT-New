/** Scoped structural bindings for SwanStudios Style Lens manifests. */
import { createGlobalStyle } from 'styled-components';

export const SwanStyleLensGlobalStyles = createGlobalStyle`
  :root {
    --lens-sidebar-width: 280px;
    --lens-sidebar-collapsed: 64px;
    --lens-main-padding: 24px;
    --lens-main-padding-mobile: 16px;
    --lens-panel-radius: 16px;
    --lens-shell-gap: 0px;
    --lens-navigation-edge: var(--accent-primary, #60c0f0);
    --lens-canvas:
      linear-gradient(145deg,
        var(--bg-base, #0a0a0f),
        color-mix(in srgb, var(--bg-surface, #141419) 86%, var(--midnight-sapphire, #002060)));
  }

  :root[data-style-lens='swan-flagship'] {
    --lens-sidebar-width: 292px;
    --lens-main-padding: clamp(24px, 2vw, 40px);
    --lens-panel-radius: 18px;
    --lens-navigation-edge: var(--wing-purple, #8b5cf6);
  }

  :root[data-style-lens='quiet-meridian'] {
    --lens-sidebar-width: 228px;
    --lens-main-padding: clamp(28px, 3vw, 56px);
    --lens-panel-radius: 8px;
    --lens-navigation-edge: var(--ice-wing, #60c0f0);
    --lens-canvas:
      linear-gradient(90deg,
        var(--bg-base, #0a0a0f) 0%,
        color-mix(in srgb, var(--royal-depth, #003080) 38%, var(--bg-base, #0a0a0f)) 52%,
        var(--bg-base, #0a0a0f) 100%);
  }

  :root[data-style-lens='blueprint-fold'] {
    --lens-sidebar-width: 252px;
    --lens-main-padding: clamp(20px, 2.2vw, 44px);
    --lens-panel-radius: 2px;
    --lens-navigation-edge: var(--ice-wing, #60c0f0);
    --lens-canvas:
      repeating-linear-gradient(0deg,
        transparent 0 23px,
        color-mix(in srgb, var(--ice-wing, #60c0f0) 8%, transparent) 24px 25px),
      repeating-linear-gradient(90deg,
        transparent 0 23px,
        color-mix(in srgb, var(--ice-wing, #60c0f0) 8%, transparent) 24px 25px),
      var(--midnight-sapphire, #002060);
  }

  :root[data-style-lens='kintsugi-circuit'] {
    --lens-sidebar-width: 266px;
    --lens-main-padding: clamp(24px, 2.6vw, 48px);
    --lens-panel-radius: 6px 22px 8px 28px;
    --lens-navigation-edge: var(--gilded-fern, #c6a84b);
    --lens-canvas:
      linear-gradient(118deg,
        transparent 0 46%,
        color-mix(in srgb, var(--gilded-fern, #c6a84b) 32%, transparent) 46.2% 46.6%,
        transparent 46.8%),
      linear-gradient(155deg, var(--bg-base, #0a0a0f), var(--royal-depth, #003080));
  }

  :root[data-style-lens='analog-flight-recorder'] {
    --lens-sidebar-width: 312px;
    --lens-main-padding: clamp(18px, 2vw, 36px);
    --lens-panel-radius: 3px;
    --lens-navigation-edge: var(--gilded-fern, #c6a84b);
    --lens-canvas:
      linear-gradient(180deg,
        var(--carbon, #141419) 0 36px,
        var(--obsidian-black, #0a0a0f) 36px 100%);
  }

  :root[data-style-lens='candy-glass-arcade'] {
    --lens-sidebar-width: 248px;
    --lens-main-padding: clamp(20px, 2.4vw, 46px);
    --lens-panel-radius: 26px;
    --lens-navigation-edge: var(--wing-purple, #8b5cf6);
    --lens-canvas:
      radial-gradient(circle at 82% 12%,
        color-mix(in srgb, var(--wing-purple, #8b5cf6) 28%, transparent),
        transparent 32%),
      radial-gradient(circle at 18% 84%,
        color-mix(in srgb, var(--ice-wing, #60c0f0) 22%, transparent),
        transparent 30%),
      var(--bg-base, #0a0a0f);
  }

  :root[data-style-lens='recovery-cloister'] {
    --lens-sidebar-width: 220px;
    --lens-main-padding: clamp(32px, 4vw, 72px);
    --lens-panel-radius: 30px 8px 30px 8px;
    --lens-shell-gap: 12px;
    --lens-navigation-edge: var(--ice-wing, #60c0f0);
    --lens-canvas: radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--ice-wing, #60c0f0) 18%, transparent), transparent 38%), #08243a;
  }

  :root[data-style-lens='tempo-forge'] {
    --lens-sidebar-width: 296px;
    --lens-main-padding: clamp(18px, 1.8vw, 34px);
    --lens-panel-radius: 4px 18px 4px 18px;
    --lens-navigation-edge: var(--wing-purple, #8b5cf6);
    --lens-canvas: repeating-linear-gradient(180deg, transparent 0 31px, color-mix(in srgb, var(--gilded-fern, #c6a84b) 10%, transparent) 32px 33px), #141419;
  }

  :root[data-style-lens='coach-ledger'] {
    --lens-sidebar-width: 324px;
    --lens-main-padding: clamp(20px, 2vw, 40px);
    --lens-panel-radius: 2px;
    --lens-shell-gap: 1px;
    --lens-navigation-edge: var(--gilded-fern, #c6a84b);
    --lens-canvas: linear-gradient(90deg, color-mix(in srgb, var(--gilded-fern, #c6a84b) 7%, transparent) 0 1px, transparent 1px 100%), #1a1a24;
  }

  :root[data-style-lens='signal-garden'] {
    --lens-sidebar-width: 244px;
    --lens-main-padding: clamp(24px, 3vw, 58px);
    --lens-panel-radius: 28px 28px 8px 28px;
    --lens-shell-gap: 16px;
    --lens-navigation-edge: var(--ice-wing, #60c0f0);
    --lens-canvas: radial-gradient(ellipse at 8% 50%, color-mix(in srgb, var(--ice-wing, #60c0f0) 16%, transparent), transparent 34%), linear-gradient(145deg, #062e3a, var(--bg-base, #0a0a0f));
  }

  :root[data-style-lens='split-horizon'] {
    --lens-sidebar-width: 264px;
    --lens-main-padding: clamp(22px, 2.5vw, 50px);
    --lens-panel-radius: 18px 3px 18px 3px;
    --lens-navigation-edge: var(--wing-purple, #8b5cf6);
    --lens-canvas: linear-gradient(180deg, #101d46 0 49.75%, color-mix(in srgb, var(--ice-wing, #60c0f0) 24%, transparent) 50%, var(--bg-base, #0a0a0f) 50.25% 100%);
  }
  :root[data-density='compact'] {
    --lens-main-padding: 18px;
    --lens-main-padding-mobile: 10px;
  }

  [data-style-lens-shell] {
    gap: var(--lens-shell-gap, 0px);
    background: var(--lens-canvas, var(--bg-base, #0a0a0f));
  }
  [data-style-lens-shell] [data-swan-button-tone='blue'] {
    min-height: 44px;
    box-shadow: 0 0 22px color-mix(in srgb, var(--wing-purple, #8b5cf6) 48%, transparent);
  }

  [data-style-lens-shell] [data-swan-button-tone='purple'] {
    min-height: 44px;
    box-shadow: 0 0 22px color-mix(in srgb, var(--ice-wing, #60c0f0) 48%, transparent);
  }


  [data-style-lens-shell] [data-dashboard-scroll-root] {
    background: var(--lens-canvas, var(--bg-base, #0a0a0f));
    border-radius: var(--lens-panel-radius, 16px) 0 0 var(--lens-panel-radius, 16px);
    border-top: 1px solid color-mix(in srgb, var(--lens-navigation-edge, var(--ice-wing, #60c0f0)) 20%, transparent);
  }

  @media (min-width: 1025px) {
    [data-style-lens-shell] [role='navigation'] {
      width: var(--lens-sidebar-width, 280px);
      border-right-color: var(--lens-navigation-edge, var(--ice-wing, #60c0f0));
    }
  }

  :root[data-style-lens='analog-flight-recorder'] [data-style-lens-shell] {
    font-family: 'Fira Code', monospace;
    box-shadow: inset 0 36px 0 color-mix(in srgb, var(--gilded-fern, #c6a84b) 12%, transparent);
  }

  :root[data-style-lens='quiet-meridian'] [data-dashboard-scroll-root] > * {
    max-width: 1680px;
    margin-inline: auto;
  }

  :root[data-style-lens='candy-glass-arcade'] [data-dashboard-scroll-root] {
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, var(--frost-white, #e0ecf4) 18%, transparent),
      0 0 42px color-mix(in srgb, var(--wing-purple, #8b5cf6) 14%, transparent);
  }

  @media (prefers-reduced-motion: reduce) {
    [data-style-lens-shell],
    [data-style-lens-shell] * {
      scroll-behavior: auto;
      transition-duration: 0.01ms !important;
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
    }
  }

  :root[data-motion='off'] [data-style-lens-shell],
  :root[data-motion='off'] [data-style-lens-shell] * {
    transition: none !important;
    animation: none !important;
  }
`;
