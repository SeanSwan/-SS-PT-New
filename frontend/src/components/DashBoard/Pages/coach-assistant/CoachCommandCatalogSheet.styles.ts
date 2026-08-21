/**
 * FILE: CoachCommandCatalogSheet.styles.ts (v2 P1.3)
 * PURPOSE: Bottom-sheet chrome for the command catalog. Mobile-first: thumb
 * reach, 44px rows, one internal scroll, safe-area aware.
 */
import styled from 'styled-components';

export const SheetScrim = styled.button`
  background: color-mix(in srgb, var(--coach-bg, #030712) 62%, transparent);
  border: 0;
  cursor: pointer;
  inset: 0;
  position: fixed;
  /* Above the ops drawer stack (scrim 10040 / rail 10050), below the voice
     overlay (10060) — a sheet hidden under the drawer scrim is a dead UI. */
  z-index: 10052;
`;

export const SheetPanel = styled.section`
  background: var(--bg-elevated, rgba(20, 32, 56, 0.97));
  border: 1px solid var(--border-strong, rgba(96, 192, 240, 0.38));
  border-bottom: 0;
  border-radius: 20px 20px 0 0;
  bottom: 0;
  color: var(--text-primary, #e0ecf4);
  display: flex;
  flex-direction: column;
  gap: 10px;
  left: 50%;
  max-height: 72dvh;
  padding: 14px 14px max(14px, env(safe-area-inset-bottom));
  position: fixed;
  transform: translateX(-50%);
  width: min(560px, 100vw);
  z-index: 10053;
`;

export const SheetHeader = styled.header`
  align-items: baseline;
  display: flex;
  gap: 10px;
  justify-content: space-between;

  strong {
    font-family: 'Plus Jakarta Sans', 'Sora', system-ui, sans-serif;
    font-size: 17px;
  }

  button {
    background: var(--surface-soft, rgba(255, 255, 255, 0.06));
    border: 1px solid var(--border-subtle, rgba(188, 220, 255, 0.18));
    border-radius: 10px;
    color: var(--text-secondary, #dbe8f7);
    cursor: pointer;
    font-size: 13px;
    font-weight: 760;
    min-height: 44px;
    padding: 0 14px;
  }
`;

export const SheetScroll = styled.div`
  display: grid;
  gap: 12px;
  min-height: 0;
  overflow-y: auto;
  padding-right: 2px;
`;

export const SheetCategory = styled.div`
  display: grid;
  gap: 6px;

  h3 {
    color: color-mix(in srgb, var(--text-muted, #9eb0c7) 42%, var(--text-secondary, #dbe8f7) 58%);
    font-family: 'Fira Code', monospace;
    font-size: 11px;
    letter-spacing: 0.08em;
    margin: 0;
    text-transform: uppercase;
  }
`;

export const SheetCommandButton = styled.button`
  background: color-mix(in srgb, var(--accent-primary, #60c0f0) 6%, transparent);
  border: 1px solid var(--border-subtle, rgba(188, 220, 255, 0.18));
  border-radius: 12px;
  color: var(--text-primary, #e0ecf4);
  cursor: pointer;
  display: grid;
  gap: 3px;
  min-height: 44px;
  padding: 9px 12px;
  text-align: left;

  strong {
    font-size: 14px;
    font-weight: 780;
  }

  em {
    color: color-mix(in srgb, var(--accent-primary, #60c0f0) 70%, var(--text-secondary, #dbe8f7));
    font-size: 13px;
    font-style: normal;
  }

  &:hover,
  &:focus-visible {
    border-color: color-mix(in srgb, var(--accent-primary, #60c0f0) 44%, transparent);
  }
`;

/**
 * Availability badge (S5).
 *
 * The registry classifies every command into an execution lane, and
 * `GET /api/ai-command/commands` has always returned `canExecute` /
 * `executionLane` / `manualOnlyReason` per command — the sheet simply dropped
 * them. So a sheet titled "What Swan Coach can do" was listing commands Swan
 * Coach cannot do (5 of 139 at 66ffde607: 4 manual_only, 1 chat_fallback).
 *
 * Gold rather than red: these are not errors or failures. They are capabilities
 * that exist and are handled a different way, and the badge should read as
 * information, not alarm.
 */
export const SheetAvailability = styled.span`
  align-self: start;
  /* The parent is display:grid, where items default to justify-self:stretch. Without
     this the pill spans the whole column and reads as a full-width banner rather than
     a badge — the border-radius:999px makes that especially wrong. */
  justify-self: start;
  /* Belt and braces at 320px: nowrap keeps the label on one line, so cap the width
     and ellipsize rather than letting a long future label push the row wider. */
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  background: color-mix(in srgb, var(--accent-luxury, #c6a84b) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-luxury, #c6a84b) 42%, transparent);
  border-radius: 999px;
  color: var(--accent-luxury, #c6a84b);
  font-size: 11px;
  font-style: normal;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 2px 8px;
  text-transform: uppercase;
  white-space: nowrap;
`;

/** Why a non-executable command still appears, in plain language. */
export const SheetAvailabilityReason = styled.span`
  color: var(--text-secondary, #dbe8f7);
  font-size: 12px;
  opacity: 0.85;
`;

export const SheetStateText = styled.p`
  color: var(--text-secondary, #dbe8f7);
  font-size: 14px;
  line-height: 1.5;
  margin: 0;
  padding: 8px 2px;
`;
