/**
 * FILE: CoachWorkspace.panels.styles.ts
 * PURPOSE: The two side panels of the v4 Coach Workspace — the thread sidebar
 * (left) and the context inspector (right) — docked or as sheets (the shell
 * decides which; see CoachWorkspace.styles.ts). Colours are var(--ws-*) only.
 */
import styled from 'styled-components';

const panelBase = `
  min-height: 0;
  flex-direction: column;
  background: color-mix(in srgb, var(--ws-panel) 94%, transparent);
  backdrop-filter: blur(var(--ws-blur));
  overflow: hidden;
`;

export const SidebarRoot = styled.nav`
  display: flex;
  ${panelBase}
  border-right: 1px solid var(--ws-line);

  .ws-side-head { display: flex; gap: 8px; padding: 10px; align-items: center; }
  .ws-new-chat {
    flex: 1 1 auto; display: inline-flex; align-items: center; gap: 8px; height: 44px; padding: 0 12px;
    border-radius: var(--ws-radius-sm); border: 1px solid var(--ws-line-strong);
    background: var(--ws-accent-soft); color: var(--ws-text); font-weight: 600; font-size: 13.5px; cursor: pointer;
  }
  .ws-new-chat:hover { background: color-mix(in srgb, var(--ws-accent) 22%, transparent); }
  .ws-search { position: relative; margin: 0 10px 8px; }
  .ws-search svg { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--ws-muted); }
  .ws-search input {
    width: 100%; height: 40px; padding: 0 12px 0 34px; border-radius: var(--ws-radius-sm);
    border: 1px solid var(--ws-line); background: var(--ws-sunken); color: var(--ws-text); font-size: 13px;
  }
  .ws-search input::placeholder { color: var(--ws-muted); }
  .ws-thread-list { flex: 1 1 auto; overflow-y: auto; padding: 4px 6px 12px; overscroll-behavior: contain; }
  .ws-thread-list ul { list-style: none; margin: 0; padding: 0; }
  .ws-group-label {
    margin: 12px 8px 4px; font: 600 10.5px var(--ws-mono); letter-spacing: 0.08em;
    text-transform: uppercase; color: var(--ws-muted);
  }
  .ws-thread-row {
    position: relative; display: grid; gap: 2px; width: 100%; min-height: 48px; padding: 7px 10px 7px 12px;
    border: 0; border-radius: var(--ws-radius-sm); background: transparent; color: var(--ws-text-soft);
    text-align: left; cursor: pointer;
  }
  .ws-thread-row:hover { background: color-mix(in srgb, var(--ws-text) 5%, transparent); color: var(--ws-text); }
  .ws-thread-row[aria-current='true'] { background: var(--ws-accent-soft); color: var(--ws-text); }
  .ws-thread-row[aria-current='true']::before {
    content: ''; position: absolute; left: 2px; top: 10px; bottom: 10px; width: 3px; border-radius: 3px; background: var(--ws-edge);
  }
  .ws-thread-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13.5px; }
  .ws-thread-sub { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11.5px; color: var(--ws-muted); }
  .ws-side-empty { margin: 18px 12px; font-size: 13px; color: var(--ws-muted); line-height: 1.5; }
  .ws-side-foot { border-top: 1px solid var(--ws-line); padding: 8px; display: grid; gap: 4px; }
  .ws-side-link {
    display: flex; align-items: center; gap: 10px; width: 100%; min-height: 44px; padding: 0 10px;
    border: 0; border-radius: var(--ws-radius-sm); background: transparent; color: var(--ws-text-soft);
    font-size: 13px; text-align: left; cursor: pointer; text-decoration: none;
  }
  .ws-side-link:hover { background: color-mix(in srgb, var(--ws-text) 5%, transparent); color: var(--ws-text); }
  .ws-side-link .ws-count {
    margin-left: auto; min-width: 22px; height: 20px; padding: 0 6px; border-radius: 999px;
    background: var(--ws-gold-soft); color: var(--ws-gold); font: 600 11px/20px var(--ws-mono); text-align: center;
  }
`;

export const InspectorRoot = styled.aside`
  display: flex;
  ${panelBase}
  border-left: 1px solid var(--ws-line);

  .ws-insp-head { display: flex; align-items: center; justify-content: space-between; padding: 12px 12px 4px 16px; }
  .ws-insp-title { font: 600 11px var(--ws-mono); letter-spacing: 0.08em; text-transform: uppercase; color: var(--ws-muted); }
  .ws-insp-scroll { flex: 1 1 auto; overflow-y: auto; padding: 6px 12px 16px; display: grid; gap: var(--ws-gap); align-content: start; }
`;

export const InspectorCard = styled.section`
  border: 1px solid var(--ws-line);
  border-radius: calc(var(--ws-radius-sm) + 3px);
  background: color-mix(in srgb, var(--ws-elevated) 70%, transparent);
  padding: 12px;
  display: grid;
  gap: 8px;

  .ws-card-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .ws-card-title { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: var(--ws-text); }
  .ws-card-title svg { color: var(--ws-accent); }
  .ws-card-link {
    display: inline-flex; align-items: center; gap: 4px; min-height: 44px; padding: 0 6px; margin: -12px -6px;
    color: var(--ws-accent); font-size: 12.5px; text-decoration: none; background: transparent; border: 0; cursor: pointer;
  }
  .ws-card-link:hover { text-decoration: underline; }
  .ws-card-note { font-size: 12.5px; color: var(--ws-muted); line-height: 1.5; margin: 0; }
  .ws-card-note[data-tone='warn'] { color: var(--ws-warn); }
  .ws-card-note[data-tone='danger'] { color: var(--ws-danger); }
  .ws-stat-row { display: flex; gap: 8px; flex-wrap: wrap; }
  .ws-stat {
    flex: 1 1 80px; display: grid; gap: 2px; padding: 8px 10px; border-radius: var(--ws-radius-sm);
    background: var(--ws-sunken); border: 1px solid var(--ws-line);
  }
  .ws-stat b { font: 600 17px var(--ws-mono); color: var(--ws-text); }
  .ws-stat span { font-size: 11.5px; color: var(--ws-muted); }
  .ws-primary {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; padding: 0 14px;
    border-radius: var(--ws-radius-sm); border: 1px solid var(--ws-line-strong);
    background: var(--ws-action-soft); color: var(--ws-text); font-weight: 600; font-size: 13px; cursor: pointer;
  }
  .ws-primary:hover { background: color-mix(in srgb, var(--ws-action) 28%, transparent); }
`;

export const ScheduleList = styled.ol`
  list-style: none; margin: 0; padding: 0; display: grid; gap: 6px;

  li { display: grid; grid-template-columns: 64px minmax(0, 1fr) auto; gap: 10px; align-items: center; }
  .ws-slot-time { font: 600 12.5px var(--ws-mono); color: var(--ws-text); }
  .ws-slot-body { min-width: 0; display: grid; gap: 1px; }
  .ws-slot-who { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; color: var(--ws-text); }
  .ws-slot-meta { font-size: 11.5px; color: var(--ws-muted); }
  li[data-status='completed'] .ws-slot-time, li[data-status='cancelled'] .ws-slot-who { opacity: 0.55; }
  li[data-now='true'] .ws-slot-time { color: var(--ws-accent); }
  .ws-ask {
    min-width: 44px; height: 44px; border-radius: var(--ws-radius-sm); border: 1px solid var(--ws-line);
    background: transparent; color: var(--ws-text-soft); display: inline-flex; align-items: center; justify-content: center; cursor: pointer;
  }
  .ws-ask:hover { color: var(--ws-text); border-color: var(--ws-line-strong); }
`;
