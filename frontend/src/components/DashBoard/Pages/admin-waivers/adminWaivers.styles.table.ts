/**
 * ============================================================================
 * FILE: adminWaivers.styles.table.ts
 * PURPOSE: Waiver list table + its <=768px stacked-card treatment, plus the
 *          status/contract badges and the shared ActionButton.
 * AUTHOR: Claude Opus 5 | LAST MODIFIED: 2026-08-05
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Styles the 8-column waiver record table. Below 768px
 * the same DOM re-flows into one card per waiver record — no second component
 * tree, no duplicated text nodes, so every field (Name, Contact, Status,
 * Source, Signed, Matches, Linked User, View) survives the breakpoint and the
 * accessibility tree still exposes each value exactly once.
 *
 * MOBILE MECHANISM: `display: block` on the table primitives + `content:
 * attr(data-label)` pseudo-labels. `AdminWaiversTable.tsx` supplies the
 * `data-label` on every <Td>; the <thead> is hidden on mobile because the
 * pseudo-labels replace it. Keep the two files in sync — a Td without a
 * data-label renders an unlabelled row on phones.
 *
 * TOKEN CONTRACT: colours resolve via Crystalline Swan tokens with the prior
 * literal as fallback (CLAUDE.md rule 6).
 */

import styled from 'styled-components';

/** Breakpoint at which the table becomes stacked cards. */
export const WAIVER_TABLE_CARD_BREAKPOINT = '768px';

/**
 * Labeled, keyboard-focusable horizontal scroll region (launch-audit lane 2).
 *
 * This and the stacked-card reflow below are complementary, not competing:
 * between the card breakpoint and the table's natural width the columns still
 * need somewhere to go, and a scroll region a keyboard user cannot reach is
 * its own defect. Below 768px the table reflows to cards and `min-width` is
 * dropped, so nothing scrolls sideways on a phone.
 */
export const TableScroller = styled.div`
  width: 100%;
  overflow-x: auto;
  border-radius: 12px;
  -webkit-overflow-scrolling: touch;

  @media (max-width: ${WAIVER_TABLE_CARD_BREAKPOINT}) {
    /* Cards already fit the viewport; a scroll region here would trap focus
       on content that never overflows. */
    overflow-x: visible;
  }
`;

export const Table = styled.table`
  width: 100%;
  min-width: 760px;
  border-collapse: collapse;
  background: color-mix(in srgb, var(--obsidian-black, #000000) 30%, transparent);
  border-radius: 12px;
  overflow: hidden;

  @media (max-width: ${WAIVER_TABLE_CARD_BREAKPOINT}) {
    display: block;
    /* Drop the desktop floor — cards must fit the phone, not force a 760px
       scroll the reflow exists to eliminate. */
    min-width: 0;
    background: transparent;
    border-radius: 0;
    overflow: visible;

    thead {
      /* Visually hidden, still removed from a11y tree via aria-hidden in the
         component — the per-cell data-label pseudo-elements carry the headers. */
      display: none;
    }

    tbody {
      display: block;
    }
  }
`;

export const Th = styled.th`
  text-align: left;
  padding: 14px 16px;
  background: rgba(var(--wing-purple-rgb, 139, 92, 246), 0.3);
  color: var(--accent-primary, #60C0F0);
  font-weight: 600;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid rgba(var(--wing-purple-rgb, 139, 92, 246), 0.3);
`;

export const Td = styled.td`
  padding: 14px 16px;
  border-bottom: 1px solid rgba(var(--frost-white-rgb, 255, 255, 255), 0.06);
  color: var(--text-primary, rgba(255, 255, 255, 0.9));
  font-size: 0.875rem;

  @media (max-width: ${WAIVER_TABLE_CARD_BREAKPOINT}) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 14px;
    border-bottom: 1px solid rgba(var(--frost-white-rgb, 255, 255, 255), 0.06);
    text-align: right;
    word-break: break-word;

    /* Field label, sourced from the data-label the component supplies. */
    &::before {
      content: attr(data-label);
      flex: 0 0 auto;
      text-align: left;
      font-family: 'Sora', sans-serif;
      font-size: 0.68rem;
      font-weight: 600;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      color: var(--text-muted, rgba(255, 255, 255, 0.5));
    }

    /* Action cell: full-width button, no label. */
    &[data-label=''],
    &:not([data-label]) {
      justify-content: stretch;

      &::before {
        content: none;
      }
    }

    &:last-child {
      border-bottom: none;
      padding-top: 12px;
    }
  }
`;

export const Tr = styled.tr`
  transition: background var(--duration-fast, 0.15s);

  &:hover {
    background: rgba(var(--wing-purple-rgb, 139, 92, 246), 0.08);
  }

  @media (max-width: ${WAIVER_TABLE_CARD_BREAKPOINT}) {
    display: block;
    margin-bottom: 12px;
    border-radius: 12px;
    border: 1px solid rgba(var(--wing-purple-rgb, 139, 92, 246), 0.25);
    background: color-mix(in srgb, var(--obsidian-black, #000000) 30%, transparent);
    overflow: hidden;

    &:hover {
      background: color-mix(in srgb, var(--obsidian-black, #000000) 30%, transparent);
    }

    &:last-child {
      margin-bottom: 0;
    }
  }
`;

const STATUS_TOKEN: Record<string, { bg: string; fg: string }> = {
  pending_match: {
    bg: 'color-mix(in srgb, var(--warning, #ffc107) 20%, transparent)',
    fg: 'var(--warning, #ffc107)',
  },
  linked: {
    bg: 'color-mix(in srgb, var(--success, #00ff88) 20%, transparent)',
    fg: 'var(--success, #00ff88)',
  },
  superseded: {
    bg: 'color-mix(in srgb, var(--text-muted, #9ca3af) 20%, transparent)',
    fg: 'var(--text-muted, #9ca3af)',
  },
  revoked: {
    bg: 'color-mix(in srgb, var(--danger, #ff6b6b) 20%, transparent)',
    fg: 'var(--danger, #ff6b6b)',
  },
};

const STATUS_FALLBACK = {
  bg: 'color-mix(in srgb, var(--text-muted, #9ca3af) 20%, transparent)',
  fg: 'var(--text-muted, #9ca3af)',
};

export const StatusBadge = styled.span<{ $status: string }>`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
  background: ${({ $status }) => (STATUS_TOKEN[$status] ?? STATUS_FALLBACK).bg};
  color: ${({ $status }) => (STATUS_TOKEN[$status] ?? STATUS_FALLBACK).fg};
`;

const BADGE_TOKEN: Record<string, { bg: string; fg: string }> = {
  'Waiver Signed': {
    bg: 'color-mix(in srgb, var(--success, #00ff88) 15%, transparent)',
    fg: 'var(--success, #00ff88)',
  },
  'Swan Coach Consent Signed': {
    bg: 'rgba(var(--wing-purple-rgb, 139, 92, 246), 0.15)',
    fg: 'var(--accent-primary, #60C0F0)',
  },
  'Consent Missing': {
    bg: 'color-mix(in srgb, var(--danger, #ff6b6b) 15%, transparent)',
    fg: 'var(--danger, #ff6b6b)',
  },
  'Guardian Required': {
    bg: 'color-mix(in srgb, var(--warning, #ffc107) 15%, transparent)',
    fg: 'var(--warning, #ffc107)',
  },
  'Version Outdated': {
    bg: 'color-mix(in srgb, var(--warning, #ff9800) 15%, transparent)',
    fg: 'var(--warning, #ff9800)',
  },
  'Pending Match': {
    bg: 'rgba(var(--wing-purple-rgb, 139, 92, 246), 0.15)',
    fg: 'var(--info, #b389e0)',
  },
};

const BADGE_FALLBACK = {
  bg: 'color-mix(in srgb, var(--text-muted, #9ca3af) 15%, transparent)',
  fg: 'var(--text-muted, #9ca3af)',
};

export const ContractBadge = styled.span<{ $label: string }>`
  display: inline-block;
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: 600;
  white-space: nowrap;
  margin: 2px 4px 2px 0;
  background: ${({ $label }) => (BADGE_TOKEN[$label] ?? BADGE_FALLBACK).bg};
  color: ${({ $label }) => (BADGE_TOKEN[$label] ?? BADGE_FALLBACK).fg};
`;

const ACTION_VARIANT: Record<string, string> = {
  approve: 'background: var(--success, #00ff88); color: var(--midnight-sapphire, #002060);',
  reject: 'background: var(--danger, #ff6b6b); color: var(--text-primary, #ffffff);',
  revoke: 'background: var(--danger, #ff6b6b); color: var(--text-primary, #ffffff);',
  link: 'background: var(--accent-primary, #60C0F0); color: var(--midnight-sapphire, #002060);',
};

const ACTION_DEFAULT = 'background: var(--accent-secondary, #8B5CF6); color: var(--text-primary, #ffffff);';

export const ActionButton = styled.button<{ $variant?: 'approve' | 'reject' | 'revoke' | 'link' | 'view' }>`
  padding: 8px 14px;
  min-height: var(--min-touch-target, 44px);
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  margin-right: 6px;
  transition: opacity 0.2s, transform var(--duration-fast, 0.15s);

  ${({ $variant }) => ($variant && ACTION_VARIANT[$variant]) || ACTION_DEFAULT}

  &:hover {
    opacity: 0.85;
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none;
  }

  /* On a phone card the action is the row's primary control — go full width. */
  @media (max-width: ${WAIVER_TABLE_CARD_BREAKPOINT}) {
    width: 100%;
    margin-right: 0;
  }
`;
