/**
 * FILE: CoachWorkspace.floor.styles.ts
 * PURPOSE: Floor mode — the in-session view built to be read from across the
 * room and tapped with chalky hands: a 56px stepper, a huge Fira Code readout,
 * a glowing Save, and the "Session so far" column. Colours are var(--ws-*) only.
 */
import styled from 'styled-components';

export const FloorRoot = styled.section`
  flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column;
  background: radial-gradient(circle at 40% 85%, var(--ws-accent-soft), transparent 45%), var(--ws-bg);

  .ws-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  .ws-floor-grid { flex: 1 1 auto; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr) 320px; }
  .ws-floor-main { min-height: 0; display: flex; flex-direction: column; overflow-y: auto; }
  .ws-floor-stage {
    flex: 1 1 auto; display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: calc(16px * var(--ws-scale)); padding: 20px clamp(12px, 4vw, 40px); text-align: center;
  }
  .ws-floor-eyebrow { font: 600 12px var(--ws-mono); letter-spacing: 0.12em; text-transform: uppercase; color: var(--ws-muted); }
  .ws-floor-title { display: flex; align-items: center; gap: 10px; max-width: 100%; }
  .ws-floor-title h1 {
    margin: 0; min-width: 0; font: 800 clamp(28px, 4.4vw, 52px) / 1.1 var(--ws-title-font); color: var(--ws-text);
    letter-spacing: -0.01em; overflow-wrap: anywhere;
  }
  .ws-floor-nav, .ws-dial button {
    flex: none; width: 56px; height: 56px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer;
    border-radius: 16px; border: 1px solid var(--ws-line-strong); background: var(--ws-panel); color: var(--ws-text);
  }
  .ws-floor-nav:disabled { opacity: 0.35; cursor: default; }
  .ws-floor-dials { display: flex; align-items: center; justify-content: center; gap: clamp(10px, 3vw, 28px); flex-wrap: wrap; }
  .ws-dial { display: grid; grid-template-columns: 56px auto 56px; align-items: center; gap: 10px; justify-items: center; }
  .ws-dial output {
    min-width: 2.2ch; font: 500 clamp(64px, 9vw, 108px) / 1 var(--ws-mono); color: var(--ws-text); font-variant-numeric: tabular-nums;
  }
  .ws-dial span { grid-column: 1 / -1; font-size: 14px; color: var(--ws-muted); }
  .ws-dial-x { font: 400 clamp(36px, 5vw, 60px) var(--ws-mono); color: var(--ws-muted); }
  .ws-floor-row { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; }
  .ws-floor-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 48px; padding: 0 18px; cursor: pointer;
    border-radius: 12px; border: 1px solid var(--ws-line-strong); background: transparent; color: var(--ws-text);
    font-size: 15px; text-decoration: none;
  }
  .ws-floor-btn:disabled { opacity: 0.4; cursor: default; }
  .ws-floor-save {
    min-height: 58px; padding: 0 32px; border-radius: 16px; border: 0; cursor: pointer;
    background: var(--ws-accent); color: var(--ws-bg); font-size: 17px; font-weight: 800;
    box-shadow: 0 0 30px color-mix(in srgb, var(--ws-action) 50%, transparent);
  }
  .ws-floor-save:disabled { background: color-mix(in srgb, var(--ws-text) 12%, transparent); color: var(--ws-muted); box-shadow: none; cursor: default; }
  .ws-floor-add { display: flex; gap: 8px; width: min(420px, 100%); }
  .ws-floor-add input {
    flex: 1 1 auto; min-width: 0; min-height: 48px; padding: 0 14px; border-radius: 12px;
    border: 1px solid var(--ws-line); background: var(--ws-sunken); color: var(--ws-text); font-size: 15px;
  }
  .ws-floor-pick { display: grid; gap: 12px; justify-items: center; text-align: center; padding: 32px 16px; margin: auto; max-width: 520px; }
  .ws-floor-pick h1 { margin: 0; font: italic 600 clamp(28px, 4vw, 40px) var(--ws-drama-font); color: var(--ws-text); }
  .ws-floor-pick p { margin: 0; color: var(--ws-muted); font-size: 15px; line-height: 1.55; }
  .ws-floor-coach { display: grid; gap: 8px; padding-top: 6px; }
  .ws-floor-said {
    margin: 0 auto; max-width: 760px; padding: 0 16px; display: flex; gap: 8px; align-items: baseline;
    font: italic 500 clamp(19px, 2.2vw, 24px) / 1.35 var(--ws-drama-font); color: var(--ws-text);
  }
  .ws-floor-said svg { flex: none; color: var(--ws-accent); }
  .ws-floor-heard {
    justify-self: center; min-height: 44px; padding: 0 16px; border-radius: 999px; cursor: pointer;
    border: 1px solid color-mix(in srgb, var(--ws-gold) 50%, transparent); background: var(--ws-gold-soft); color: var(--ws-text); font-weight: 600;
  }

  .ws-floor-side {
    min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; padding: 20px;
    border-left: 1px solid var(--ws-line); background: color-mix(in srgb, var(--ws-panel) 92%, transparent);
  }
  .ws-floor-side h2 { margin: 0; font: 600 12px var(--ws-mono); letter-spacing: 0.12em; text-transform: uppercase; color: var(--ws-muted); }
  .ws-floor-side ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
  .ws-floor-side li button {
    width: 100%; display: grid; gap: 5px; padding: 12px 14px; text-align: left; cursor: pointer; min-height: 56px;
    border-radius: 14px; border: 1px solid var(--ws-line); background: transparent; color: var(--ws-text);
  }
  .ws-floor-side li button b { font-size: 15px; font-weight: 650; }
  .ws-floor-side li button span { font: 500 13px var(--ws-mono); color: var(--ws-muted); overflow-wrap: anywhere; }
  .ws-floor-side li button[aria-current='step'] { border-color: color-mix(in srgb, var(--ws-accent) 45%, transparent); background: var(--ws-accent-soft); }
  .ws-floor-end {
    margin-top: auto; display: grid; gap: 10px; padding: 14px; border-radius: 14px;
    border: 1px solid color-mix(in srgb, var(--ws-gold) 45%, transparent); background: var(--ws-gold-soft);
  }
  .ws-floor-end p { margin: 0; font-size: 14px; line-height: 1.5; color: var(--ws-text); }
  .ws-floor-end .ws-floor-eyebrow { color: var(--ws-gold); }
  .ws-floor-end[data-phase='failed'], .ws-floor-end[data-phase='conflict'] { border-color: color-mix(in srgb, var(--ws-warn) 55%, transparent); }
  .ws-floor-end .ws-floor-save { min-height: 52px; font-size: 15px; padding: 0 18px; }

  @media (max-width: 1023.98px) {
    .ws-floor-grid { grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) auto; }
    .ws-floor-side { border-left: 0; border-top: 1px solid var(--ws-line); max-height: 36vh; padding: 14px 16px; }
    .ws-floor-side ol { grid-auto-flow: column; grid-auto-columns: minmax(180px, 1fr); overflow-x: auto; }
  }
  .ws-floor-coach .ws-hint { display: none; }
  /* Legacy phone CSS forces form buttons to width:100% !important; this row sizes its own. */
  .ws-floor-add button { width: auto !important; flex: none; }
  @media (max-width: 767.98px) {
    /* Phones: ONE scroll — the lift, then the session so far + End, then the coach.
       Split panes left the dials a sliver between the header and the side panel. */
    .ws-floor-grid { display: flex; flex-direction: column; overflow-y: auto; overscroll-behavior: contain; }
    .ws-floor-main { display: contents; }
    .ws-floor-stage { order: 1; flex: none; justify-content: flex-start; padding-top: 14px; }
    .ws-floor-side { order: 2; max-height: none; overflow: visible; }
    .ws-floor-coach { order: 3; padding-bottom: 4px; }
    .ws-dial { grid-template-columns: 52px auto 52px; }
    .ws-dial button, .ws-floor-nav { width: 52px; height: 52px; }
    .ws-dial-x { display: none; }
    .ws-floor-save { width: 100%; }
    .ws-floor-said { font-size: 18px; }
  }
`;
