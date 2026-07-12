/**
 * FILE: CoachCommandCenter.crystallineFocusStyles.ts
 * PURPOSE: Crystalline Focus presentation layer for the Swan Coach Command Center.
 *
 * Presentation only: no state, handlers, routes, mocks, or save behavior.
 */
import { css } from 'styled-components';

export const coachCommandCrystallineFocusStyles = css`
  --coach-focus-canvas: var(--bg-base, #0A0A0F);
  --coach-focus-surface: var(--bg-surface, #141419);
  --coach-focus-elevated: var(--bg-elevated, #1A1A24);
  --coach-focus-interactive: var(--surface-soft, color-mix(in srgb, var(--bg-elevated, #1A1A24) 84%, var(--text-primary, #E0ECF4) 8%));
  --coach-focus-text: var(--text-primary, #E0ECF4);
  --coach-focus-muted: color-mix(
    in srgb,
    var(--text-muted, #8794a8) 42%,
    var(--text-secondary, #c3d2e4) 58%
  );
  --coach-focus-soft: var(--text-secondary, #a9b6c8);
  --coach-focus-line: var(--border-subtle, rgba(184, 207, 232, 0.13));
  --coach-focus-line-active: var(--border-active, var(--border-focus, rgba(96, 192, 240, 0.34)));
  --coach-focus-accent: var(--accent-primary, #60C0F0);
  --coach-focus-blue: var(--brand-primary, var(--accent-secondary, #4070C0));

  .bridge-shell { gap: 14px; max-width: min(100%, 1680px); width: 100%; }
  .client-bar {
    background: linear-gradient(180deg, color-mix(in srgb, var(--coach-focus-elevated) 92%, transparent), var(--coach-focus-surface)), var(--coach-focus-surface);
    border-color: var(--coach-focus-line);
    border-radius: calc(var(--lens-panel-radius, 16px) + 2px);
    box-shadow: 0 22px 62px color-mix(in srgb, var(--coach-focus-canvas) 74%, transparent);
    gap: 14px;
    padding: 14px;
  }
  .coach-wordmark { color: var(--coach-focus-text); letter-spacing: 0.01em; }
  .ops-button {
    background: color-mix(in srgb, var(--coach-focus-interactive) 86%, transparent);
    border-color: var(--coach-focus-line);
    border-radius: 12px;
    color: var(--coach-focus-soft);
  }
  .now-label,
  .client-action-scope,
  .transcript-title,
  .ops-rail-kicker { letter-spacing: 0.04em; }
  .client-name { color: var(--coach-focus-text); font-size: clamp(24px, 3vw, 32px); letter-spacing: 0; }
  .new-client-button {
    border-radius: 12px;
    box-shadow: 0 10px 26px color-mix(in srgb, var(--coach-purple) 18%, transparent);
    justify-self: start;
    min-height: 48px;
    padding: 0 16px;
    width: auto;
  }

  .client-action-strip {
    background: color-mix(in srgb, var(--coach-focus-canvas) 22%, transparent);
    border-color: var(--coach-focus-line);
    border-radius: 14px;
    gap: 8px;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    padding: 8px;
  }
  .client-action-button {
    background: color-mix(in srgb, var(--coach-focus-interactive) 82%, transparent);
    border-color: var(--coach-focus-line);
    border-radius: 14px;
    min-height: 76px;
    padding: 10px 12px;
    position: relative;
  }
  .client-action-button::after {
    color: var(--coach-focus-accent);
    content: '>';
    font-family: 'Fira Code', monospace;
    font-size: 13px;
    margin-left: auto;
    opacity: 0.72;
  }
  .client-action-button > svg {
    background: color-mix(in srgb, var(--coach-focus-accent) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--coach-focus-accent) 18%, transparent);
    border-radius: 12px;
    box-sizing: content-box;
    color: var(--coach-focus-accent);
    flex: 0 0 auto;
    height: 20px;
    padding: 9px;
    width: 20px;
  }
  .client-action-button.is-primary {
    background: color-mix(in srgb, var(--coach-focus-blue) 11%, var(--coach-focus-interactive));
    border-color: color-mix(in srgb, var(--coach-focus-blue) 34%, var(--coach-focus-line));
    box-shadow: none;
  }
  .client-action-button:hover,
  .client-action-button:focus-visible {
    border-color: var(--coach-focus-line-active);
    box-shadow: 0 12px 28px color-mix(in srgb, var(--coach-focus-canvas) 42%, transparent);
    transform: translateY(-2px);
  }


  .tab-bar {
    background: var(--coach-focus-surface);
    border-color: var(--coach-focus-line);
    border-radius: 16px 16px 12px 12px;
    gap: 2px;
    overflow-x: auto;
  }
  .tab-button {
    border-radius: 10px;
    color: var(--coach-focus-muted);
    flex-direction: row;
    gap: 8px;
    min-height: 48px;
    padding: 0 14px;
  }
  .tab-button::after {
    background: transparent;
    border-radius: 999px;
    bottom: 4px;
    content: '';
    height: 3px;
    left: 18px;
    position: absolute;
    right: 18px;
  }
  .tab-button.is-active { background: transparent; border-color: transparent; color: var(--coach-focus-text); }
  .tab-button.is-active svg { color: var(--coach-focus-accent); }
  .tab-button.is-active::after { background: var(--coach-focus-accent); }
  .tab-content {
    background: var(--coach-focus-surface);
    border: 1px solid var(--coach-focus-line);
    border-radius: calc(var(--lens-panel-radius, 16px) + 2px);
    box-shadow: 0 18px 54px color-mix(in srgb, var(--coach-focus-canvas) 58%, transparent);
    padding: 10px;
  }

  .chat-panel,
  .chat-transcript { display: flex; flex: 1 1 auto; min-height: 0; width: 100%; }
  .transcript-top { padding: 0 4px; }
  .transcript-stream {
    background: linear-gradient(180deg, color-mix(in srgb, var(--coach-focus-elevated) 92%, transparent), var(--coach-focus-surface)), var(--coach-focus-surface);
    border: 1px solid var(--coach-focus-line);
    border-radius: var(--lens-panel-radius, 16px);
    padding: 16px;
  }
  .transcript-empty { max-width: 720px; }
  .transcript-empty-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
    list-style: none;
    margin: 4px 0 0;
    padding: 0;
  }
  .transcript-empty-actions button {
    background: color-mix(in srgb, var(--coach-focus-interactive) 82%, transparent);
    border: 1px solid var(--coach-focus-line);
    border-radius: 999px;
    color: var(--coach-focus-soft);
    cursor: pointer;
    font-size: 13px;
    line-height: 1;
    min-height: 44px;
    padding: 8px 12px;
  }

  .console-dock {
    background: color-mix(in srgb, var(--coach-focus-surface) 92%, transparent);
    border: 1px solid var(--coach-focus-line);
    border-radius: calc(var(--lens-panel-radius, 16px) + 2px);
    box-shadow: 0 18px 54px color-mix(in srgb, var(--coach-focus-canvas) 58%, transparent);
    padding: 12px;
  }
  .dock-form {
    background: var(--coach-focus-elevated);
    border-color: var(--coach-focus-line-active);
    box-shadow: inset 0 1px 0 color-mix(in srgb, var(--coach-focus-text) 5%, transparent);
  }
  .dock-textarea {
    background: color-mix(in srgb, var(--coach-focus-canvas) 28%, var(--coach-focus-interactive));
    border-color: var(--coach-focus-line);
    color: var(--coach-focus-text);
    field-sizing: content;
    line-height: 1.5;
  }
  .dock-trust-line { color: var(--coach-focus-muted); font-size: 13px; line-height: 1.4; }
  .dock-send { box-shadow: 0 10px 26px color-mix(in srgb, var(--coach-focus-accent) 22%, transparent); }

  @media (min-width: 1280px) {
    .bridge-shell {
      align-items: start;
      display: grid;
      gap: 16px 18px;
      grid-template-areas: 'header header' 'tabs ops' 'content ops' 'dock ops' 'account ops';
      grid-template-columns: minmax(0, 1fr) minmax(336px, clamp(336px, 23vw, 392px));
    }
    .client-bar { display: grid; grid-area: header; grid-template-columns: minmax(0, 1fr) auto; }
    .client-bar-top,
    .client-action-strip { grid-column: 1 / -1; }
    .new-client-button { align-self: end; grid-column: 2; grid-row: 2; }
    .tab-bar { grid-area: tabs; }
    .tab-content { grid-area: content; }
    .console-dock { grid-area: dock; }
    .drawer-scrim,
    .ops-button,
    .ops-rail-close { display: none; }
    .right-rail {
      border-radius: calc(var(--lens-panel-radius, 16px) + 2px);
      grid-area: ops;
      height: auto;
      max-height: calc(100dvh - 32px);
      min-width: 0;
      padding: 12px;
      position: sticky;
      right: auto;
      top: 12px;
      transform: none;
      width: auto;
      z-index: 1;
    }
    .transcript-stream { min-height: clamp(360px, calc(100dvh - 560px), 660px); }
  }

  @media (max-width: 1279px) {
    .bridge-shell { max-width: 1040px; width: 100%; }
  }

  @media (max-width: 768px) {
    .client-bar { border-radius: var(--lens-panel-radius, 16px); padding: 12px; }
    .new-client-button { width: 100%; }
    .client-action-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .client-action-button { min-height: 68px; }
    .client-action-button > svg { height: 18px; padding: 8px; width: 18px; }
    .tab-button { flex: 0 0 auto; min-width: 92px; }
    .tab-content { padding: 8px; }
    .console-dock {
      border-radius: 18px 18px 0 0;
      border-width: 1px 0 0;
      margin: 0 -2px;
      padding: 10px 8px max(10px, env(safe-area-inset-bottom));
    }
  }

  @media (max-width: 360px) {
    .client-action-strip { grid-template-columns: 1fr; }
    .client-action-button { min-height: 60px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .client-action-button:hover,
    .client-action-button:focus-visible { transform: none; }
  }
`;
