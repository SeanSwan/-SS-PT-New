/**
 * FILE: CoachCommandCenter.auroraConsoleStyles.ts
 * PURPOSE: Aurora Console de-box pass — active ONLY under the aurora-console
 * Style Lens. Every other lens (and the default) renders byte-identically.
 *
 * The tacky-audit findings this answers: same-weight boxed chips everywhere,
 * chrome competing with content, no depth story. Under the lens: chips become
 * text hierarchy, panels become edge-lit frost glass over the atmosphere,
 * and the presence line carries the state hue (weather, not wallpaper).
 */
import { css } from 'styled-components';

export const coachCommandAuroraConsoleStyles = css`
  html[data-style-lens='aurora-console'] & {
    .bridge-shell {
      position: relative;
      z-index: 1;
    }

    /* Frost-glass panel language: one surface treatment, edge-lit. */
    .client-bar,
    .tab-bar,
    .dock-form,
    .dock-more-menu {
      backdrop-filter: blur(18px) saturate(1.2);
      background: var(--console-surface, var(--coach-surface));
      border-color: var(--console-line, var(--coach-line));
      box-shadow: 0 18px 44px color-mix(in srgb, var(--coach-bg) 60%, transparent), inset 0 1px 0 color-mix(in srgb, var(--console-line-strong, var(--coach-line-strong)) 40%, transparent);
    }

    /* De-box: informational pills lose their boxes and read as hierarchy. */
    .dock-trust,
    .transcript-empty-safe,
    .transcript-empty-next,
    .mini-chip,
    .status-pill,
    .attachment {
      background: transparent;
      border-color: transparent;
      padding-left: 0;
      padding-right: 0;
    }

    .transcript-empty-safe { color: color-mix(in srgb, var(--coach-gold) 86%, var(--coach-text)); }

    .tab-button.is-active {
      background: color-mix(in srgb, var(--console-state-idle, var(--coach-cyan)) 12%, transparent);
      box-shadow: inset 0 -2px 0 var(--console-state-idle, var(--coach-cyan));
    }

    /* Presence as weather: the strip + dock edge carry the live state hue. */
    &[data-voice-state='listening'] .coach-presence-line { background: var(--console-state-listening); }
    &[data-voice-state='thinking'] .coach-presence-line { background: var(--console-state-thinking); }
    &[data-voice-state='speaking'] .coach-presence-line { background: var(--console-state-speaking); }
    &[data-voice-state='listening'] .dock-form { border-color: color-mix(in srgb, var(--console-state-listening) 56%, transparent); }
    &[data-voice-state='thinking'] .dock-form { border-color: color-mix(in srgb, var(--console-state-thinking) 48%, transparent); }

    .dock-send {
      box-shadow: 0 10px 30px var(--console-glow, color-mix(in srgb, var(--coach-cyan) 30%, transparent));
    }

    .transcript-day-divider::before,
    .transcript-day-divider::after {
      background: var(--console-line, var(--coach-line));
    }
  }
`;
