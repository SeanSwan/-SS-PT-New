/**
 * lensViewportStyles — Swan Lens C5 responsive matrix + density + a11y CSS (Slice 2 / §2.5).
 *
 * Exported as a plain STRING (test-regex-able; mounted by S1-C's injector or the current
 * global-styles mount — Lane-A integration note §2.9 step 3). Keys entirely off `[data-viewport]`
 * (written by useLensViewport) and `[data-density]` (Lane-A-written). Additive geo token
 * `--lens-geo-edge-pad` (Do-NOT #3 compliant). No `--world-*`, no `!important`, no retired palette.
 * Transform/opacity only in animated contexts; 44px floor via max() (never scaled below).
 */
export const lensViewportCss = `
  /* DENSITY — attribute-driven; data-density stays Lane-A-written */
  :root { --lens-density-scale: 1; }
  :root[data-density='compact']  { --lens-density-scale: 0.875; }
  :root[data-density='cozy']     { --lens-density-scale: 1; }
  :root[data-density='spacious'] { --lens-density-scale: 1.125; }
  :root[data-viewport='wall']:not([data-density]) { --lens-density-scale: 1.125; }

  /* TARGET FLOOR — opt-in .lens-target; compact can never scale below the validated 44px */
  .lens-target {
    min-block-size: max(var(--lens-geo-target-min, 44px), calc(var(--lens-geo-target-min, 44px) * var(--lens-density-scale, 1)));
    min-inline-size: max(var(--lens-geo-target-min, 44px), calc(var(--lens-geo-target-min, 44px) * var(--lens-density-scale, 1)));
  }

  /* VIEWPORT MATRIX — values verbatim from the responsive matrix */
  :root[data-viewport='hand'] {
    --lens-geo-blur-sm: 0; --lens-geo-blur-md: 4px; --lens-geo-blur-lg: 8px;
    --lens-fx-surface-alpha: 0.92; --lens-fx-noise-opacity: 0;
    --lens-fx-glow-strength: 0.75; --lens-geo-edge-pad: 16px;
  }
  :root[data-viewport='lap'] {
    --lens-geo-blur-sm: 4px; --lens-geo-blur-md: 8px; --lens-geo-blur-lg: 16px;
    --lens-fx-surface-alpha: 0.8; --lens-fx-noise-opacity: 0.02;
    --lens-fx-glow-strength: 0.9; --lens-geo-edge-pad: 24px;
  }
  :root[data-viewport='desk'] {
    --lens-geo-blur-sm: 4px; --lens-geo-blur-md: 12px; --lens-geo-blur-lg: 24px;
    --lens-fx-surface-alpha: 0.72; --lens-fx-noise-opacity: 0.04;
    --lens-fx-glow-strength: 1; --lens-geo-edge-pad: 32px;
  }
  :root[data-viewport='wall'] {
    --lens-geo-blur-sm: 6px; --lens-geo-blur-md: 16px; --lens-geo-blur-lg: 32px;
    --lens-fx-surface-alpha: 0.72; --lens-fx-noise-opacity: 0.04;
    --lens-fx-glow-strength: 1.15; --lens-geo-edge-pad: 48px;
  }
  [data-viewport='wall'] .lens-content { max-width: 1600px; margin-inline: auto; }

  /* DESKTOP HOVER — feedback tier; guarded by hover/pointer AND both existing motion switches */
  @media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
    :root:not([data-motion='off']) .lens-card {
      transition: transform 180ms var(--lens-ease-standard, cubic-bezier(0.2,0,0,1)),
                  box-shadow 180ms var(--lens-ease-standard, cubic-bezier(0.2,0,0,1));
    }
    :root:not([data-motion='off']) .lens-card:hover {
      transform: translateY(var(--lens-fx-hover-lift, -1px));
      box-shadow: var(--lens-fx-glow-primary);
    }
  }

  /* ROOT SCALE — sweep variant, desk/lap only. data-viewport is written on <html> (:root) itself,
     so it must be part of the :root compound, NOT a descendant combinator (Codex MED #3). */
  @media (prefers-reduced-motion: no-preference) {
    :root[data-viewport='desk']:not([data-motion='off'])[data-lens-transition-variant='sweep'][data-lens-transition='charging'] #root,
    :root[data-viewport='lap']:not([data-motion='off'])[data-lens-transition-variant='sweep'][data-lens-transition='charging'] #root {
      transform: scale(0.995);
      transition: transform var(--lens-crystallize-charge-ms, 120ms) var(--lens-ease-crystallize, cubic-bezier(0.16,1,0.3,1));
    }
    :root[data-viewport='desk']:not([data-motion='off'])[data-lens-transition-variant='sweep'][data-lens-transition='settling'] #root,
    :root[data-viewport='lap']:not([data-motion='off'])[data-lens-transition-variant='sweep'][data-lens-transition='settling'] #root {
      transform: scale(1);
      transition: transform var(--lens-crystallize-settle-ms, 360ms) var(--lens-ease-crystallize, cubic-bezier(0.16,1,0.3,1));
    }
  }

  /* FRAME-SCOPED MOTION KILL-SWITCH — ScopedLensFrame's own 'full'|'reduced'|'off' vocabulary */
  [data-motion-mode='off'] :where(.lens-card, .lens-animatable) { transition: none; animation: none; }
  [data-motion-mode='reduced'] :where(.lens-animatable) { animation: none; }

  /* A11Y MEDIA BLOCKS — real media queries */
  @media (prefers-reduced-transparency: reduce) {
    :root {
      --lens-fx-surface-alpha: 1; --lens-fx-noise-opacity: 0;
      --lens-geo-blur-sm: 0; --lens-geo-blur-md: 0; --lens-geo-blur-lg: 0;
    }
  }
  @media (forced-colors: active) {
    :root {
      --lens-fx-glow-primary: none; --lens-fx-glow-secondary: none; --lens-fx-atmosphere: none;
      --lens-fx-noise-opacity: 0; --lens-geo-blur-sm: 0; --lens-geo-blur-md: 0; --lens-geo-blur-lg: 0;
      --lens-fx-surface-alpha: 1;
    }
    :where(.lens-card, .lens-surface) { border: 1px solid CanvasText; box-shadow: none; background-image: none; }
    :where(a, button, [role='button'], input, select, textarea, [tabindex]):focus-visible {
      outline: 2px solid Highlight; outline-offset: 2px;
    }
  }
`;
