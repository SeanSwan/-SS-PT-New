import { css } from 'styled-components';

export const coachCommandOpsStyles = css`
  .right-rail {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
    overscroll-behavior: contain;
    container-type: inline-size;
    width: min(520px, 94vw);
    z-index: 10050;
  }

  .drawer-scrim { z-index: 10040; }

  .ops-rail-header {
    align-items: center;
    background: linear-gradient(135deg, color-mix(in srgb, var(--coach-sapphire) 38%, transparent), transparent 72%), color-mix(in srgb, var(--coach-bg) 88%, transparent);
    border: 1px solid color-mix(in srgb, var(--coach-cyan) 24%, var(--coach-line));
    border-radius: 16px;
    box-shadow: 0 16px 44px color-mix(in srgb, var(--coach-bg) 38%, transparent);
    display: flex;
    gap: 12px;
    justify-content: space-between;
    min-height: 64px;
    min-width: 0;
    padding: 10px 10px 10px 12px;
    position: sticky;
    top: 0;
    z-index: 2;
  }

  .ops-rail-header strong {
    color: var(--coach-text);
    display: block;
    font-size: 14px;
    line-height: 1.22;
    overflow-wrap: anywhere;
  }

  .ops-rail-header p {
    color: var(--coach-muted);
    font-size: 13px;
    line-height: 1.4;
    margin: 4px 0 0;
    max-width: 34ch;
  }

  .ops-rail-kicker {
    color: var(--coach-muted);
    display: block;
    font-family: 'Fira Code', monospace;
    font-size: 13px;
    letter-spacing: 0.08em;
    margin-bottom: 4px;
    text-transform: uppercase;
  }

  .ops-rail-close {
    align-items: center;
    background: color-mix(in srgb, var(--coach-soft) 86%, transparent);
    border: 1px solid var(--coach-line);
    border-radius: 14px;
    color: var(--coach-text);
    display: inline-flex;
    flex: 0 0 auto;
    height: 44px;
    justify-content: center;
    transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
    width: 44px;
  }

  .ops-rail-close:hover,
  .ops-rail-close:focus-visible {
    border-color: var(--coach-line-strong);
    box-shadow: 0 12px 30px color-mix(in srgb, var(--coach-cyan) 18%, transparent);
    outline: none;
    transform: translateY(-1px);
  }

  .workout-command-panel {
    background: linear-gradient(145deg, color-mix(in srgb, var(--coach-sapphire) 28%, transparent), transparent 60%), var(--coach-card);
    border-color: color-mix(in srgb, var(--coach-cyan) 34%, var(--coach-line));
  }

  .workout-command-primary-grid {
    display: grid;
    gap: 8px;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    min-width: 0;
  }

  .workout-command-card {
    align-items: center;
    background: color-mix(in srgb, var(--coach-soft) 86%, transparent);
    border: 1px solid var(--coach-line);
    border-radius: 14px;
    color: var(--coach-text);
    display: flex;
    gap: 10px;
    min-height: 66px;
    min-width: 0;
    overflow: hidden;
    padding: 10px;
    text-align: left;
    text-decoration: none;
    transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
  }

  .workout-command-card.mission {
    background: linear-gradient(135deg, color-mix(in srgb, var(--coach-sapphire) 84%, transparent), color-mix(in srgb, var(--coach-purple) 38%, transparent)), var(--coach-sapphire);
    border-color: color-mix(in srgb, var(--coach-purple) 42%, transparent);
    box-shadow: 0 14px 34px color-mix(in srgb, var(--coach-purple) 22%, transparent);
    min-height: 72px;
  }

  .workout-command-card.route {
    background: color-mix(in srgb, var(--coach-cyan) 9%, var(--coach-soft));
    min-height: 58px;
  }

  .workout-command-card:hover,
  .workout-command-card:focus-visible {
    border-color: var(--coach-line-strong);
    box-shadow: 0 12px 30px color-mix(in srgb, var(--coach-cyan) 16%, transparent);
    outline: none;
    transform: translateY(-1px);
  }

  .workout-command-card.full {
    grid-column: 1 / -1;
  }

  .workout-command-card.full > svg:last-child {
    color: var(--coach-cyan);
    margin-left: auto;
  }

  .workout-command-card.is-disabled {
    color: var(--coach-muted);
    cursor: not-allowed;
    opacity: 0.68;
  }

  .workout-command-card.is-disabled:hover,
  .workout-command-card.is-disabled:focus-visible {
    border-color: var(--coach-line);
    box-shadow: none;
    transform: none;
  }

  .workout-command-icon {
    align-items: center;
    background: color-mix(in srgb, var(--coach-cyan) 14%, transparent);
    border: 1px solid color-mix(in srgb, var(--coach-cyan) 22%, transparent);
    border-radius: 12px;
    color: var(--coach-cyan);
    display: inline-flex;
    flex: 0 0 auto;
    height: 38px;
    justify-content: center;
    width: 38px;
  }

  .teach-mode-toggle {
    align-items: center;
    background: linear-gradient(135deg, color-mix(in srgb, var(--coach-cyan) 12%, transparent), transparent 64%), color-mix(in srgb, var(--coach-soft) 90%, transparent);
    border: 1px solid var(--coach-line);
    border-radius: 14px;
    color: var(--coach-text);
    cursor: pointer;
    display: flex;
    gap: 10px;
    min-height: 54px;
    padding: 8px 10px;
    text-align: left;
    transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
    width: 100%;
  }

  .teach-mode-toggle.is-on {
    background: linear-gradient(135deg, color-mix(in srgb, var(--coach-purple) 18%, transparent), transparent 62%), color-mix(in srgb, var(--coach-cyan) 10%, var(--coach-soft));
    border-color: color-mix(in srgb, var(--coach-purple) 38%, var(--coach-line-strong));
  }

  .teach-mode-toggle:hover,
  .teach-mode-toggle:focus-visible {
    border-color: var(--coach-line-strong);
    box-shadow: 0 12px 30px color-mix(in srgb, var(--coach-cyan) 14%, transparent);
    outline: none;
    transform: translateY(-1px);
  }

  .teach-mode-toggle strong,
  .teach-mode-toggle small {
    display: block;
    line-height: 1.18;
    overflow-wrap: anywhere;
  }

  .teach-mode-toggle strong {
    font-size: 13px;
    font-weight: 820;
  }

  .teach-mode-toggle small {
    color: var(--coach-muted);
    font-size: 13px;
    margin-top: 3px;
  }

  .teach-mode-panel {
    background: linear-gradient(135deg, color-mix(in srgb, var(--coach-purple) 12%, transparent), transparent 68%), var(--coach-card);
  }

  .teach-mode-panel-actions {
    display: grid;
    gap: 10px;
  }

  .teach-mode-panel-actions .secondary-button {
    min-height: 44px;
    width: 100%;
  }

  .workout-command-card strong,
  .workout-command-card small {
    display: block;
    line-height: 1.18;
    overflow-wrap: anywhere;
  }

  .workout-command-card strong {
    font-size: 14px;
    font-weight: 820;
  }

  .workout-command-card small {
    color: var(--coach-muted);
    font-size: 13px;
    margin-top: 3px;
  }

  @container (max-width: 330px) {
    .workout-command-primary-grid {
      grid-template-columns: 1fr;
    }

    .workout-command-card.full {
      grid-column: auto;
    }
  }

  @media (max-width: 640px) {
    .right-rail {
      border-radius: 22px 22px 0 0;
      box-sizing: border-box;
      bottom: max(10px, env(safe-area-inset-bottom));
      height: 86vh;
      left: 10px;
      max-height: 760px;
      min-height: 320px;
      padding: 12px;
      right: 10px;
      top: auto;
      transform: translateY(calc(100% + 24px));
      width: auto;
    }

    .right-rail.is-open {
      transform: translateY(0);
    }

    .ops-rail-header {
      border-radius: 18px;
      min-height: 60px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .ops-rail-close,
    .workout-command-card,
    .teach-mode-toggle {
      transition: none;
    }

    .ops-rail-close:hover,
    .ops-rail-close:focus-visible,
    .workout-command-card:hover,
    .workout-command-card:focus-visible,
    .teach-mode-toggle:hover,
    .teach-mode-toggle:focus-visible {
      transform: none;
    }
  }
`;
