/**
 * FILE: CoachWorkspace.conversation.styles.ts
 * PURPOSE: The conversation column of the v4 Coach Workspace — turns, notices,
 * the empty state, the composer, and the slash menu. Colours are var(--ws-*)
 * only (the coach-* bridge in workspaceTokens repaints reused cards to match).
 *
 * Reading model — Crystalline Conversation (Design Brain §14, unified design):
 * the coach speaks in a raised graphite panel with an Ice Wing edge; the person
 * speaks in a compact right-aligned Royal Depth bubble; the system speaks in one
 * quiet line unless it carries an approval or a result card.
 */
import styled from 'styled-components';
import { coachCommandVoiceStripStyles } from '../coach-assistant/CoachCommandCenter.voiceStripStyles';

export const ConversationRoot = styled.section`
  position: relative; flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column;
  background: color-mix(in srgb, var(--ws-bg) 88%, transparent);

  .ws-scroll { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; scroll-padding-bottom: 24px; }
  .ws-thread { margin: 0 auto; width: 100%; max-width: 820px; padding: 20px clamp(14px, 3vw, 28px) 24px; display: grid; gap: calc(18px * var(--ws-scale)); }
  .ws-day { justify-self: center; font: 600 10.5px var(--ws-mono); letter-spacing: 0.08em; text-transform: uppercase; color: var(--ws-muted); }
  /* Reused CoachCommandLogEntry in its flat presentation: the workspace owns the frame. */
  .ws-flat-entry > article[data-presentation='flat'] {
    background: transparent; border: 0; box-shadow: none; padding: 0; max-width: 100%; align-self: stretch;
  }
  /* Prose, not cards: the coach's numbered steps and bullets read as a document. */
  .ws-flat-entry > article[data-presentation='flat'] > div { font-size: 15px; line-height: 1.68; color: var(--ws-text-soft); }
  .ws-flat-entry > article[data-presentation='flat'] strong { font-weight: 650; color: var(--ws-text); }
  .ws-flat-entry > article[data-presentation='flat'] ol > li,
  .ws-flat-entry > article[data-presentation='flat'] ul > li {
    background: transparent; border: 0; border-radius: 0; box-shadow: none;
    border-left: 2px solid var(--ws-line-strong); padding: 2px 0 2px 14px;
  }
  .ws-flat-entry > article[data-presentation='flat'] ol > li { grid-template-columns: 24px minmax(0, 1fr); gap: 8px; }
  .ws-flat-entry > article[data-presentation='flat'] .step-number {
    width: 22px; height: 22px; font: 600 11.5px/22px var(--ws-mono); background: var(--ws-accent-soft); border: 0;
  }
  .ws-card-shell > article[data-presentation='flat'] > div { font-size: 14px; }
  .ws-live { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  .ws-scroll { display: flex; flex-direction: column; }
  .ws-jump {
    position: sticky; bottom: 12px; z-index: 5; align-self: center; flex: none;
    display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 16px; border-radius: 999px;
    border: 1px solid var(--ws-line-strong); background: var(--ws-elevated); color: var(--ws-text); cursor: pointer;
  }
`;

export const Turn = styled.article`
  display: grid; gap: 6px; min-width: 0;

  &.ws-turn-user { justify-items: end; }
  .ws-bubble {
    max-width: min(78%, 620px); padding: 10px 14px; border-radius: 18px 18px 6px 18px;
    background: var(--ws-action-soft); border: 1px solid color-mix(in srgb, var(--ws-action) 30%, transparent);
    color: var(--ws-text); font-size: 14.5px; line-height: 1.55; white-space: pre-wrap; overflow-wrap: anywhere;
  }
  .ws-who { display: inline-flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--ws-muted); }
  .ws-who b { color: var(--ws-text); font-weight: 600; font-family: var(--ws-title-font); }
  .ws-who svg { color: var(--ws-accent); }
  .ws-who time { font-family: var(--ws-mono); font-size: 11.5px; }
  &.ws-turn-coach { font-size: 15px; line-height: 1.65; color: var(--ws-text-soft); }
  &.ws-turn-coach > .ws-flat-entry {
    max-width: min(100%, 720px); padding: 14px 18px 14px 20px; border-radius: 6px 20px 20px 20px;
    background: color-mix(in srgb, var(--ws-elevated) 94%, transparent);
    border: 1px solid color-mix(in srgb, var(--ws-accent) 20%, transparent); border-left: 2px solid var(--ws-accent);
    box-shadow: 0 10px 36px color-mix(in srgb, var(--ws-action) 11%, transparent);
  }
  @media (max-width: 767.98px) { &.ws-turn-coach > .ws-flat-entry { padding: 12px 14px 12px 16px; } }
  &.ws-turn-card .ws-card-shell {
    border: 1px solid var(--ws-line); border-radius: calc(var(--ws-radius-sm) + 5px);
    background: color-mix(in srgb, var(--ws-panel) 82%, transparent); padding: 12px 14px;
  }
`;

export const Notice = styled.div`
  display: flex; align-items: flex-start; gap: 10px; padding: 8px 12px; border-radius: var(--ws-radius-sm);
  border: 1px solid var(--ws-line); background: color-mix(in srgb, var(--ws-sunken) 80%, transparent);
  font-size: 13px; line-height: 1.5; color: var(--ws-text-soft);

  svg { flex: none; margin-top: 2px; color: var(--ws-muted); }
  &[data-tone='warn'] { border-color: color-mix(in srgb, var(--ws-warn) 40%, transparent); }
  &[data-tone='warn'] svg { color: var(--ws-warn); }
  &[data-tone='danger'] { border-color: color-mix(in srgb, var(--ws-danger) 42%, transparent); }
  &[data-tone='danger'] svg { color: var(--ws-danger); }
  .ws-notice-body { flex: 1 1 auto; min-width: 0; display: grid; gap: 6px; }
  .ws-notice-title { font-weight: 600; color: var(--ws-text); text-transform: capitalize; }
  .ws-chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .ws-chip { padding: 2px 8px; border-radius: 999px; border: 1px solid var(--ws-line); font: 500 11px var(--ws-mono); color: var(--ws-muted); }
  .ws-retry {
    align-self: center; flex: none; min-height: 44px; padding: 0 12px; border-radius: var(--ws-radius-sm);
    border: 1px solid var(--ws-line-strong); background: transparent; color: var(--ws-text); cursor: pointer;
  }
`;

export const Thinking = styled.div`
  display: inline-flex; align-items: center; gap: 10px; color: var(--ws-muted); font-size: 13.5px;
  i { width: 6px; height: 6px; border-radius: 50%; background: var(--ws-accent); animation: ws-dot 1.2s ease-in-out infinite; }
  i:nth-child(2) { animation-delay: 0.15s; } i:nth-child(3) { animation-delay: 0.3s; }
  @keyframes ws-dot { 0%, 80%, 100% { opacity: 0.25; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-3px); } }
`;

export const EmptyState = styled.div`
  margin: auto; width: 100%; max-width: 640px; padding: 32px 20px; display: grid; gap: 18px; justify-items: center; text-align: center;

  .ws-empty-mark {
    width: 52px; height: 52px; border-radius: 16px; display: grid; place-items: center;
    background: var(--ws-accent-soft); border: 1px solid var(--ws-line-strong); color: var(--ws-accent);
  }
  h2 { margin: 0; font: 650 clamp(20px, 2.4vw, 26px) var(--ws-title-font); color: var(--ws-text); letter-spacing: -0.01em; }
  p { margin: 0; color: var(--ws-muted); font-size: 14px; line-height: 1.55; }
  .ws-starters { width: 100%; display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 8px; }
  .ws-starter {
    display: grid; gap: 3px; min-height: 64px; padding: 11px 13px; text-align: left; cursor: pointer;
    border-radius: calc(var(--ws-radius-sm) + 3px); border: 1px solid var(--ws-line);
    background: color-mix(in srgb, var(--ws-panel) 80%, transparent); color: var(--ws-text);
  }
  .ws-starter:hover { border-color: var(--ws-line-strong); background: var(--ws-accent-soft); }
  .ws-starter b { font-size: 13.5px; font-weight: 600; display: inline-flex; gap: 8px; align-items: center; }
  .ws-starter b svg { color: var(--ws-accent); }
  .ws-starter span { font-size: 12.5px; color: var(--ws-muted); }
  .ws-safe { font: 500 11.5px var(--ws-mono); color: var(--ws-muted); }
  @media (max-width: 767.98px) {
    padding: 18px 12px; gap: 12px;
    .ws-empty-mark { width: 40px; height: 40px; border-radius: 12px; }
    .ws-starters { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .ws-starter { min-height: 60px; padding: 9px 11px; }
    .ws-starter span { font-size: 11.5px; }
  }
`;

export const ComposerDock = styled.div`
  flex: none; padding: 8px clamp(10px, 3vw, 24px) max(12px, env(safe-area-inset-bottom, 0px));
  background: linear-gradient(to top, var(--ws-bg) 60%, transparent);

  .ws-composer-card {
    position: relative; margin: 0 auto; max-width: 820px; display: grid; grid-template-columns: minmax(0, 1fr); gap: 6px; padding: 8px 8px 8px 12px;
    border-radius: calc(var(--ws-radius-sm) + 7px); border: 1px solid var(--ws-line-strong);
    background: var(--ws-elevated); box-shadow: 0 10px 34px color-mix(in srgb, var(--ws-bg) 55%, transparent);
  }
  /* Defend against styles/responsive-fixes.css (≤767px): "form button/select
     { width:100% !important }" and "form { display:flex; column }" would stack
     every composer tool into its own full-width row. Scoped to this form only. */
  .ws-composer-card button, .ws-composer-card select { width: auto !important; max-width: none !important; }
  .ws-composer-card textarea { width: 100% !important; }
  .ws-composer-card .ws-scope select { max-width: 100% !important; }
  .ws-composer-card textarea:focus-visible { box-shadow: none; }
  .ws-composer-card:focus-within { border-color: color-mix(in srgb, var(--ws-accent) 60%, transparent); }
  textarea {
    width: 100%; min-height: 44px; max-height: 200px; resize: none; border: 0; outline: none; padding: 8px 2px 4px;
    background: transparent; color: var(--ws-text); font-size: 15px; line-height: 1.5;
  }
  textarea::placeholder { color: var(--ws-muted); }
  .ws-toolbar { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; min-width: 0; }
  .ws-scope {
    position: relative; overflow: hidden; display: inline-flex; align-items: center; gap: 6px; max-width: 230px; min-height: 44px; padding: 0 12px;
    border-radius: 999px; border: 1px solid var(--ws-line); background: var(--ws-sunken); color: var(--ws-text-soft);
    font-size: 12.5px; cursor: pointer;
  }
  .ws-scope svg { flex: none; color: var(--ws-muted); }
  .ws-scope select {
    appearance: none; min-width: 0; max-width: 180px; height: 42px; border: 0; background: transparent; color: inherit;
    font-size: 12.5px; text-overflow: ellipsis; cursor: pointer; outline: none;
  }
  .ws-scope select option { background: var(--ws-elevated); color: var(--ws-text); }
  .ws-scope:focus-within { box-shadow: var(--ws-focus); }
  .ws-mode {
    display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 12px; border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--ws-gold) 45%, transparent); background: var(--ws-gold-soft);
    color: var(--ws-text); font-size: 12.5px; cursor: pointer;
  }
  .ws-return { display: inline-flex; align-items: center; gap: 6px; margin: 0 auto 6px; max-width: 820px; min-height: 44px; color: var(--ws-accent); font-size: 13px; text-decoration: none; }
  .ws-scope[data-locked='true'] { border-color: color-mix(in srgb, var(--ws-gold) 45%, transparent); color: var(--ws-text); }
  .ws-tool, .ws-send {
    min-width: 44px; height: 44px; border-radius: var(--ws-radius-sm); border: 1px solid transparent;
    background: transparent; color: var(--ws-text-soft); display: inline-flex; align-items: center; justify-content: center; gap: 6px; cursor: pointer;
  }
  .ws-tool:hover { color: var(--ws-text); border-color: var(--ws-line); }
  .ws-tool[aria-pressed='true'] { color: var(--ws-text); background: var(--ws-accent-soft); }
  .ws-tool[data-live='true'] { color: var(--ws-danger); }
  .ws-grow { flex: 1 1 auto; }
  .ws-send { background: var(--ws-accent); color: var(--ws-bg); }
  .ws-send:disabled { background: color-mix(in srgb, var(--ws-text) 12%, transparent); color: var(--ws-muted); cursor: default; }
  .ws-hint { margin: 6px auto 0; max-width: 820px; font: 500 11px var(--ws-mono); color: var(--ws-muted); text-align: center; }
  .ws-status { margin: 6px auto 0; max-width: 820px; font-size: 12px; font-weight: 600; color: var(--ws-muted); text-align: center; overflow-wrap: anywhere; }
  .ws-status:empty { display: none; }
  .ws-status[data-tone='warn'] { color: var(--ws-warn); }
  @media (max-width: 767.98px) {
    .ws-hint { display: none; }
    textarea { font-size: 16px; }
    .ws-toolbar { flex-wrap: nowrap; gap: 2px; }
    .ws-scope { flex: 0 1 auto; min-width: 0; max-width: calc(100% - 4 * 46px); padding: 0 8px 0 10px; }
    .ws-scope select { max-width: 100%; min-width: 0; }
  }
`;

export const SlashPopover = styled.div`
  position: absolute; left: 0; right: 0; bottom: calc(100% + 8px); z-index: 25; max-height: min(360px, 50vh); overflow-y: auto;
  padding: 6px; border-radius: calc(var(--ws-radius-sm) + 5px); border: 1px solid var(--ws-line-strong);
  background: var(--ws-elevated); box-shadow: 0 18px 50px color-mix(in srgb, var(--ws-bg) 65%, transparent);

  .ws-slash-group { margin: 8px 8px 4px; font: 600 10.5px var(--ws-mono); letter-spacing: 0.08em; text-transform: uppercase; color: var(--ws-muted); }
  [role='option'] {
    display: grid; grid-template-columns: 120px minmax(0, 1fr); gap: 10px; align-items: center; width: 100%; min-height: 44px;
    padding: 6px 10px; border-radius: var(--ws-radius-sm); border: 0; background: transparent; color: var(--ws-text-soft); text-align: left; cursor: pointer;
  }
  [role='option'] code { font: 600 12.5px var(--ws-mono); color: var(--ws-accent); }
  [role='option'] span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
  [role='option'][aria-selected='true'] { background: var(--ws-accent-soft); color: var(--ws-text); }
  .ws-slash-empty { padding: 10px; font-size: 13px; color: var(--ws-muted); }
`;

/**
 * Host for the live "your voice is being heard" strip. The workspace shell does
 * NOT mount CommandBridgeShell on the Chat/Floor views, so the strip's own rules
 * are injected here instead of borrowed from the bridge — otherwise the meter
 * would render unstyled (invisible dot, no fill) exactly where the mic lives.
 * Colours resolve through the workspaceTokens `--coach-*` bridge.
 */
export const ComposerVoiceStrip = styled.div`
  ${coachCommandVoiceStripStyles}
`;
