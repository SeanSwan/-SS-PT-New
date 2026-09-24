/**
 * FILE: CoachWorkspace.styles.ts
 * PURPOSE: v4 Coach Workspace shell — the grid, the four Swan Style Lens layout
 * templates, panel docking/overlay states, and the header bar (brain-v4 J13/J14).
 *
 * LAYOUT is ONE attribute, `data-ws-layout`, resolved in JS from the lens the
 * header picker committed (coachWorkspaceLayout.ts). The docking truth table in
 * workspaceDocking() mirrors these rules exactly and is unit-tested:
 *   width <  768       → phone: conversation only; threads + context are sheets
 *   768 – 1199         → operator-grid docks the thread list; others are sheets
 *   ≥ 1200             → operator-grid docks both; atrium-split docks context
 *   editorial-column   → one centred reading column at every width
 *   playfield-stack    → the phone layout at every width, bigger targets
 * Panel state: data-sidebar='open' | data-inspector='open' show a sheet;
 * data-inspector='hidden' collapses a docked inspector.
 */
import styled, { css } from 'styled-components';
import { workspaceTokens } from './workspaceTokens';

const sheet = (side: 'left' | 'right') => css`
  position: absolute; top: 0; bottom: 0; ${side}: 0; z-index: 30;
  display: flex; width: min(340px, 88%);
  transform: translateX(${side === 'left' ? '-104%' : '104%'});
  transition: transform 220ms ease, visibility 0s linear 220ms;
  visibility: hidden;
  box-shadow: 0 24px 60px color-mix(in srgb, var(--ws-bg) 72%, transparent);
`;
const sheetOpen = css`transform: none; visibility: visible; transition: transform 220ms ease;`;

const overlayBoth = css`
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas: 'header' 'main';
  .ws-sidebar { ${sheet('left')} }
  .ws-inspector { ${sheet('right')} }
  &[data-sidebar='open'] .ws-sidebar, &[data-inspector='open'] .ws-inspector { ${sheetOpen} }
  &[data-sidebar='open'] .ws-scrim, &[data-inspector='open'] .ws-scrim { display: block; }
  .ws-panel-close { display: inline-flex; }
`;

export const WorkspaceShell = styled.div`
  ${workspaceTokens}
  position: relative;
  display: grid;
  grid-template-columns: 256px minmax(0, 1fr) 320px;
  grid-template-rows: auto minmax(0, 1fr);
  grid-template-areas: 'header header header' 'sidebar main inspector';
  height: max(520px, calc(100dvh - var(--ws-fit-top, 96px) - var(--ws-fit-bottom, 16px)));
  background: var(--ws-canvas);
  color: var(--ws-text);
  font-family: var(--ws-font);
  border: 1px solid var(--ws-line);
  border-radius: var(--ws-radius);
  overflow: hidden;
  isolation: isolate;

  margin-top: var(--ws-chrome-overlap, 0px);
  *, *::before, *::after { box-sizing: border-box; }
  button, input, textarea, select { font: inherit; }
  /* Legacy global CSS (styles/responsive-polish.css) sets width:100% on every
     button/select ≤576px; the workspace sizes its own controls. */
  button, select { width: auto; }
  :focus-visible { outline: none; box-shadow: var(--ws-focus); }

  .ws-sidebar { grid-area: sidebar; }
  .ws-main { grid-area: main; min-width: 0; min-height: 0; display: flex; flex-direction: column; }
  .ws-inspector { grid-area: inspector; }
  &[data-inspector='hidden'] { grid-template-columns: 256px minmax(0, 1fr) 0; }
  &[data-inspector='hidden'] .ws-inspector { display: none; }

  .ws-icon-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px; flex: none;
    min-width: 44px; height: 44px; padding: 0 10px;
    border-radius: var(--ws-radius-sm); border: 1px solid transparent;
    background: transparent; color: var(--ws-text-soft); cursor: pointer; font-size: 13px;
  }
  .ws-icon-btn:hover { border-color: var(--ws-line); color: var(--ws-text); }
  .ws-icon-btn[aria-pressed='true'] { background: var(--ws-accent-soft); color: var(--ws-text); border-color: var(--ws-line); }
  .ws-icon-btn[data-badge]::after {
    content: attr(data-badge); margin-left: 2px; min-width: 18px; height: 18px; padding: 0 5px;
    border-radius: 999px; background: var(--ws-gold-soft); color: var(--ws-gold);
    font: 600 11px/18px var(--ws-mono); text-align: center;
  }
  .ws-scrim {
    display: none; position: absolute; inset: 0; z-index: 20; border: 0; padding: 0;
    background: color-mix(in srgb, var(--ws-bg) 58%, transparent); cursor: pointer;
  }
  .ws-panel-close { display: none; }

  @media (max-width: 1199.98px) {
    grid-template-columns: 240px minmax(0, 1fr);
    grid-template-areas: 'header header' 'sidebar main';
    &[data-inspector='hidden'] { grid-template-columns: 240px minmax(0, 1fr); }
    .ws-inspector { ${sheet('right')} }
    &[data-inspector='open'] .ws-inspector { ${sheetOpen} }
    &[data-inspector='open'] .ws-scrim { display: block; }
    .ws-inspector .ws-panel-close { display: inline-flex; }
  }

  @media (min-width: 1200px) {
    &[data-ws-layout='atrium-split'] {
      grid-template-columns: minmax(0, 1fr) 340px;
      grid-template-areas: 'header header' 'main inspector';
      .ws-sidebar { ${sheet('left')} }
      &[data-sidebar='open'] .ws-sidebar { ${sheetOpen} }
      &[data-sidebar='open'] .ws-scrim { display: block; }
      .ws-sidebar .ws-panel-close { display: inline-flex; }
    }
    &[data-ws-layout='atrium-split'][data-inspector='hidden'] { grid-template-columns: minmax(0, 1fr) 0; }
  }
  @media (min-width: 768px) and (max-width: 1199.98px) {
    &[data-ws-layout='atrium-split'] { ${overlayBoth} }
  }
  &[data-ws-layout='editorial-column'], &[data-ws-layout='playfield-stack'] { ${overlayBoth} }
  &[data-ws-layout='editorial-column'] .ws-thread { max-width: 720px; }
  &[data-ws-layout='editorial-column'] .ws-turn-coach { font-size: 16.5px; line-height: 1.75; }
  &[data-ws-layout='editorial-column'] .ws-composer-card { max-width: 720px; }
  &[data-ws-layout='playfield-stack'] .ws-composer-card { max-width: 640px; }
  &[data-ws-layout='playfield-stack'] .ws-tool, &[data-ws-layout='playfield-stack'] .ws-send { min-width: 48px; height: 48px; }

  /* Floor is a focus view: no thread list, no inspector, at every width and layout. */
  &&[data-ws-view='floor'] { grid-template-columns: minmax(0, 1fr); grid-template-areas: 'header' 'main'; }
  &&[data-ws-view='floor'] .ws-sidebar, &&[data-ws-view='floor'] .ws-inspector, &&[data-ws-view='floor'] .ws-scrim { display: none; }
  /* Today carries its own right column; the inspector would repeat the schedule. */
  &&[data-ws-view='today'] .ws-inspector { display: none; }
  @media (min-width: 1200px) {
    &&[data-ws-view='today']:not([data-ws-layout='atrium-split']):not([data-ws-layout='editorial-column']):not([data-ws-layout='playfield-stack']) {
      grid-template-columns: 256px minmax(0, 1fr) 0;
    }
    &&[data-ws-view='today'][data-ws-layout='atrium-split'] { grid-template-columns: minmax(0, 1fr) 0; }
  }

  @media (max-width: 767.98px) {
    ${overlayBoth}
    height: calc(100dvh - var(--ws-fit-top, 56px) - var(--ws-fit-bottom, 8px) - env(safe-area-inset-bottom, 0px) - var(--coach-kb-inset, 0px));
    min-height: 400px;
    border-radius: 0; border-left: 0; border-right: 0;
  }

  html[data-motion-mode='off'] &, html[data-motion-mode='reduced'] & {
    *, *::before, *::after { transition: none !important; animation: none !important; }
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { transition: none !important; animation: none !important; }
  }
`;

export const WorkspaceHeaderBar = styled.header`
  grid-area: header;
  display: flex; align-items: center; gap: 10px;
  min-height: 54px; padding: 0 12px;
  border-bottom: 1px solid var(--ws-line);
  background: color-mix(in srgb, var(--ws-panel) 92%, transparent);
  backdrop-filter: blur(var(--ws-blur));

  .ws-mark { display: inline-flex; align-items: center; gap: 9px; flex: none; white-space: nowrap; font-weight: 650; font-size: 15px; font-family: var(--ws-title-font); }
  .ws-mark svg { color: var(--ws-accent); flex: none; }
  .ws-divider { width: 1px; height: 18px; background: var(--ws-line); flex: none; }
  .ws-thread-title {
    min-width: 0; flex: 0 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    font-size: 13px; color: var(--ws-muted);
  }
  .ws-spacer { flex: 1 1 auto; }
  .ws-brain {
    display: inline-flex; align-items: center; gap: 7px; flex: none;
    font: 500 12px var(--ws-mono); color: var(--ws-text-soft);
    padding: 0 10px; height: 30px; border-radius: 999px; border: 1px solid var(--ws-line);
  }
  .ws-brain-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--ws-ok); }
  .ws-brain[data-state='busy'] .ws-brain-dot { background: var(--ws-accent); animation: ws-pulse 1.1s ease-in-out infinite; }
  .ws-brain[data-state='degraded'] .ws-brain-dot { background: var(--ws-warn); }
  @keyframes ws-pulse { 50% { opacity: 0.35; } }
  .ws-views {
    display: inline-flex; gap: 2px; padding: 3px; flex: none;
    border-radius: calc(var(--ws-radius-sm) + 3px); border: 1px solid var(--ws-line);
    background: color-mix(in srgb, var(--ws-sunken) 80%, transparent);
  }
  .ws-views button {
    display: inline-flex; align-items: center; justify-content: center; gap: 7px; height: 44px; padding: 0 14px;
    border: 0; border-radius: var(--ws-radius-sm); background: transparent; color: var(--ws-muted);
    font-size: 13px; font-weight: 600; cursor: pointer;
  }
  .ws-views button:hover { color: var(--ws-text); }
  .ws-views button[aria-pressed='true'] {
    background: var(--ws-elevated); color: var(--ws-text); box-shadow: 0 0 0 1px var(--ws-line-strong);
  }
  .ws-views button[aria-pressed='true'] svg { color: var(--ws-accent); }
  .ws-live-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--ws-gold); box-shadow: 0 0 8px var(--ws-gold); }

  /* < 1024px the status pill keeps its words (a dot alone would be colour-only), so the
     wordmark text gives way: the longest state ("Needs your choice") still fits at 768. */
  @media (max-width: 1023.98px) {
    .ws-btn-label, .ws-mark-label { display: none; }
  }
  /* The bar's OWN width decides once measured (useCompactWidth): a docked sidebar narrows it at any viewport. */
  &[data-compact='true'] .ws-btn-label, &[data-compact='true'] .ws-mark-label { display: none; }
  @media (max-width: 767.98px) {
    min-height: 52px; padding: 0 6px 4px; gap: 4px; flex-wrap: wrap;
    /* Row 1 must never wrap (a wrapped row costs the chat ~50px): the site header already carries the brand. */
    .ws-divider, .ws-thread-title, .ws-brain-label, .ws-btn-label, .ws-mark-label { display: none; }
    .ws-brain { padding: 0 8px; }
    .ws-views { order: 10; width: 100%; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); padding: 2px; }
    .ws-views button { padding: 0 6px; min-width: 0; }
    .ws-views .ws-live-dot { flex: none; }
  }
  /* < 368px the switch has its own row but each segment is ~100px: words, no icons. */
  @media (max-width: 367.98px) {
    .ws-views button svg { display: none; }
  }
  /* 368–767px: ONE header row — the view switch goes icon-only (the text stays its
     accessible name) so the conversation keeps the phone. Below 368 it takes row 2
     (a staff header needs ~367px on one row: toggle, switch, state, 3 tools). */
  @media (min-width: 368px) and (max-width: 767.98px) {
    flex-wrap: nowrap; gap: 2px; padding: 0 6px;
    .ws-mark { display: none; }
    .ws-views { order: 0; width: auto; display: inline-flex; padding: 2px; }
    .ws-views button { width: 44px; padding: 0; gap: 0; }
    /* Visually hidden, still the button's accessible name (global phone CSS forces font sizes, so no font-size:0). */
    .ws-view-label { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
    .ws-views .ws-live-dot { position: absolute; top: 6px; right: 6px; width: 6px; height: 6px; }
    .ws-views button { position: relative; }
    .ws-icon-btn { position: relative; }
    .ws-icon-btn[data-badge]::after { position: absolute; top: 3px; right: 1px; margin: 0; }
  }
`;
