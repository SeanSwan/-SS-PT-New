/**
 * FILE: CoachWorkspace.today.styles.ts
 * PURPOSE: The Day Sheet (TodayView) — Cormorant date, the session strip with its
 * now-line, the up-next card with the plan peek, and the waiting-on-you column.
 * Colours are var(--ws-*) only; the header theme changer and the lens repaint it.
 */
import styled from 'styled-components';

export const TodayRoot = styled.section`
  flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain;
  display: grid; align-content: start; gap: calc(16px * var(--ws-scale));
  padding: clamp(14px, 2.4vw, 26px) clamp(12px, 3vw, 32px) 28px;
  background: radial-gradient(ellipse at 50% -20%, var(--ws-accent-soft), transparent 55%), var(--ws-bg);

  .ws-eyebrow { font: 600 11px var(--ws-mono); letter-spacing: 0.1em; text-transform: uppercase; color: var(--ws-muted); }
  .ws-today-head { display: grid; gap: 8px; }
  .ws-today-head h1 {
    margin: 0; font: italic 600 clamp(30px, 4vw, 44px) / 1.05 var(--ws-drama-font);
    color: var(--ws-text); letter-spacing: -0.005em;
  }
  .ws-today-chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .ws-pill {
    display: inline-flex; align-items: center; gap: 6px; min-height: 32px; padding: 0 12px; border-radius: 999px;
    border: 1px solid var(--ws-line); background: color-mix(in srgb, var(--ws-text) 4%, transparent); font-size: 13px; color: var(--ws-text-soft);
  }
  .ws-pill b { font: 500 13px var(--ws-mono); color: var(--ws-text); }
  .ws-pill[data-tone='gold'] { border-color: color-mix(in srgb, var(--ws-gold) 45%, transparent); background: var(--ws-gold-soft); }
  .ws-pill[data-tone='gold'] b { color: var(--ws-gold); }
  .ws-today-note { margin: 0; font-size: 13px; line-height: 1.5; color: var(--ws-muted); }
  .ws-today-note[data-tone='warn'] { color: var(--ws-warn); }

  .ws-timeline ol {
    list-style: none; margin: 0; padding: 4px 2px 10px; display: flex; gap: 10px; overflow-x: auto; scroll-snap-type: x proximity;
  }
  .ws-timeline li { flex: none; scroll-snap-align: start; }
  .ws-timeline button {
    display: grid; gap: 3px; min-width: 132px; min-height: 76px; padding: 10px 12px; text-align: left; cursor: pointer;
    border-radius: calc(var(--ws-radius-sm) + 3px); border: 1px solid var(--ws-line);
    background: color-mix(in srgb, var(--ws-panel) 86%, transparent); color: var(--ws-text);
  }
  .ws-timeline button b { font-size: 14px; font-weight: 650; }
  .ws-timeline button span { font-size: 12px; color: var(--ws-muted); }
  .ws-timeline .ws-slot-at { font: 500 12px var(--ws-mono); color: var(--ws-text-soft); }
  .ws-timeline button[data-past='true'] { opacity: 0.66; }
  .ws-timeline button[data-status='cancelled'] b { text-decoration: line-through; }
  .ws-timeline button[aria-pressed='true'] {
    border-color: var(--ws-accent); background: var(--ws-accent-soft); opacity: 1;
    box-shadow: 0 0 22px color-mix(in srgb, var(--ws-accent) 28%, transparent);
  }
  .ws-timeline .ws-now {
    align-self: stretch; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 0 2px;
  }
  .ws-timeline .ws-now::after {
    content: ''; flex: 1 1 auto; width: 2px; border-radius: 2px; background: var(--ws-action);
    box-shadow: 0 0 10px color-mix(in srgb, var(--ws-action) 60%, transparent);
  }
  .ws-timeline .ws-now span { font: 500 10.5px var(--ws-mono); color: var(--ws-action); }

  .ws-today-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(260px, 340px); gap: 16px; align-items: start; }
  .ws-today-side { display: grid; gap: 16px; }
  .ws-today-card {
    display: grid; gap: 10px; padding: 16px; border-radius: calc(var(--ws-radius-sm) + 7px);
    border: 1px solid var(--ws-line); background: color-mix(in srgb, var(--ws-panel) 88%, transparent);
  }
  .ws-today-card h2 { margin: 0; display: inline-flex; align-items: center; gap: 8px; font: 650 17px var(--ws-title-font); color: var(--ws-text); }
  .ws-today-card h2 svg { color: var(--ws-accent); }
  .ws-next { box-shadow: 0 0 0 1px color-mix(in srgb, var(--ws-accent) 22%, transparent), 0 14px 40px color-mix(in srgb, var(--ws-action) 12%, transparent); }
  .ws-plan { display: grid; gap: 8px; padding: 12px; border-radius: var(--ws-radius-sm); background: color-mix(in srgb, var(--ws-text) 4%, transparent); }
  .ws-plan ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
  .ws-plan li { display: flex; justify-content: space-between; gap: 12px; font-size: 14px; color: var(--ws-text); }
  .ws-plan code { font: 500 12.5px var(--ws-mono); color: var(--ws-text-soft); white-space: nowrap; }
  .ws-actions { display: flex; flex-wrap: wrap; gap: 8px; }
  .ws-btn {
    display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 16px; cursor: pointer;
    border-radius: calc(var(--ws-radius-sm) + 3px); border: 1px solid var(--ws-line-strong);
    background: transparent; color: var(--ws-text); font-size: 14px; font-weight: 600;
  }
  .ws-btn:hover { background: var(--ws-accent-soft); }
  .ws-btn-primary {
    border-color: transparent; background: var(--ws-accent); color: var(--ws-bg);
    box-shadow: 0 0 22px color-mix(in srgb, var(--ws-action) 45%, transparent);
  }
  .ws-btn-primary:hover { background: var(--ws-accent); filter: brightness(1.06); }
  .ws-counts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
  .ws-counts button {
    display: grid; gap: 2px; justify-items: start; min-height: 64px; padding: 10px 12px; cursor: pointer;
    border-radius: var(--ws-radius-sm); border: 1px solid var(--ws-line); background: transparent; color: var(--ws-muted); font-size: 12px;
  }
  .ws-counts button b { font: 500 22px var(--ws-mono); color: var(--ws-text); }
  .ws-counts button:hover { border-color: var(--ws-line-strong); color: var(--ws-text); }
  .ws-brief { background: linear-gradient(160deg, var(--ws-action-soft), color-mix(in srgb, var(--ws-panel) 88%, transparent)); }
  .ws-brief p { margin: 0; font: italic 500 19px / 1.35 var(--ws-drama-font); color: var(--ws-text); }

  @media (max-width: 1023.98px) {
    .ws-today-grid { grid-template-columns: minmax(0, 1fr); }
  }
  @media (max-width: 767.98px) {
    .ws-timeline ol { flex-direction: column; overflow: visible; }
    .ws-timeline button { width: 100%; grid-template-columns: 64px minmax(0, 1fr); align-items: center; min-height: 52px; }
    .ws-timeline button span:last-child { grid-column: 2; }
    .ws-timeline .ws-now { flex-direction: row; }
    .ws-timeline .ws-now::after { width: auto; height: 2px; }
    .ws-actions .ws-btn { flex: 1 1 100%; justify-content: center; }
  }
`;
