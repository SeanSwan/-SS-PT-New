/**
 * COMPONENT: CoachCommandCatalogSheet (v2 P1.3)
 * PURPOSE: Command discoverability — a bottom sheet listing what Swan Coach
 * can actually DO for the current role, with real example phrasings.
 *
 * Source of truth is the live registry (`GET /api/ai-command/commands`),
 * never a hardcoded list: commands added to the backend zod registry appear
 * here automatically, role-scoped. Tapping an example stages it into the
 * composer for review — nothing sends or saves from this sheet.
 */
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useCoachCommandCatalog } from '../../../../hooks/useCoachCommandCatalog';
import type { CoachCommandCatalogEntry } from '../../../../hooks/coachCommandCatalog';
import {
  SheetAvailability,
  SheetAvailabilityReason,
  SheetCategory,
  SheetCommandButton,
  SheetHeader,
  SheetPanel,
  SheetScrim,
  SheetScroll,
  SheetStateText,
} from './CoachCommandCatalogSheet.styles';

/**
 * `executionLane` is how the backend registry classifies what a command can
 * actually DO. The endpoint has always returned it; this sheet used to ignore it.
 */
type CatalogCommand = CoachCommandCatalogEntry;

/**
 * What to tell the user about a command Swan Coach cannot execute for them.
 *
 * Only lanes that cannot execute get a badge — labelling the 130 working
 * commands would be noise, and a badge on everything communicates nothing.
 * `not_wired` is included for safety: the backend coverage lock currently keeps
 * that bucket empty, but if one ever slips through, the sheet must say so rather
 * than silently advertise it.
 */
function availabilityLabel(command: CatalogCommand): { label: string; reason: string } | null {
  if (command.canExecute !== false) return null;

  switch (command.executionLane) {
    case 'chat_fallback':
      return {
        label: 'Answered in chat',
        reason: 'Swan Coach answers this in conversation rather than performing an action.',
      };
    case 'not_wired':
      return {
        label: 'Not available',
        reason: 'This is defined but has no action behind it yet.',
      };
    case 'manual_only':
      return {
        label: 'Do it yourself',
        reason: command.manualOnlyReason?.trim()
          || 'This one has to be done by hand — Swan Coach can walk you through it, but cannot perform it.',
      };
    default:
      // An unrecognised lane, or `canExecute: false` with no lane at all, must fall
      // back to the SAFE label. An earlier version folded default into manual_only,
      // which asserted a specific and possibly false claim ("has to be done by hand")
      // about a lane it did not recognise.
      return {
        label: 'Not available',
        reason: 'Swan Coach cannot run this one right now.',
      };
  }
}

type CoachCommandCatalogSheetProps = {
  open: boolean;
  onClose: () => void;
  onUsePrompt: (prompt: string) => void;
};

function friendlyCommandName(type: string): string {
  const name = type.replace(/_/g, ' ').trim();
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function groupByCategory(commands: CatalogCommand[]): Array<[string, CatalogCommand[]]> {
  const groups = new Map<string, CatalogCommand[]>();
  for (const command of commands) {
    const category = command.group?.trim() || 'General';
    groups.set(category, [...(groups.get(category) ?? []), command]);
  }
  return [...groups.entries()];
}

const CoachCommandCatalogSheet: React.FC<CoachCommandCatalogSheetProps> = ({ open, onClose, onUsePrompt }) => {
  const { commands, failed, loading } = useCoachCommandCatalog(open);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    // Remember who opened us BEFORE stealing focus, and hand it back on close. Without this a
    // keyboard/SR user is dumped to <body> and has to re-tab the whole dock (WCAG 2.4.3).
    const opener = document.activeElement as HTMLElement | null;
    // Snapshot the node now: by cleanup time panelRef.current is already null (React detaches
    // it), so reading the ref there would be a stale-ref bug, not just a lint warning.
    const panelNode = panelRef.current;
    panelNode?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ));
      if (!focusable.length) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || active === panel)) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      // Only reclaim focus if the sheet still owns it — never yank it from wherever the user
      // has since landed (e.g. onUsePrompt stages an example and focuses the composer).
      const active = document.activeElement;
      const sheetStillHasFocus = !active || active === document.body
        || Boolean(panelNode?.contains(active));
      if (sheetStillHasFocus && opener?.isConnected) opener.focus();
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <>
      <SheetScrim type="button" aria-label="Close command list" onClick={onClose} />
      <SheetPanel ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="What Swan Coach can do">
        <SheetHeader>
          <strong>What Swan Coach can do</strong>
          <button type="button" onClick={onClose}>Close</button>
        </SheetHeader>
        <SheetScroll>
          {failed ? (
            <SheetStateText>The command list could not be loaded right now. You can still talk normally — Swan Coach will route supported requests automatically.</SheetStateText>
          ) : loading ? (
            <SheetStateText>Loading commands…</SheetStateText>
          ) : !commands.length ? (
            <SheetStateText>No structured commands are available for this role yet — plain conversation still works.</SheetStateText>
          ) : (
            groupByCategory(commands).map(([category, groupCommands]) => (
              <SheetCategory key={category}>
                <h3>{category}</h3>
                {groupCommands.map((command) => {
                  const example = command.examples?.[0];
                  const availability = availabilityLabel(command);
                  const name = friendlyCommandName(command.type);
                  return (
                    <SheetCommandButton
                      type="button"
                      key={command.type}
                      onClick={() => {
                        if (example) onUsePrompt(example);
                        onClose();
                      }}
                      // The label carries the availability so a screen-reader user hears it
                      // with the name, not several elements later.
                      aria-label={
                        availability
                          ? `${name} — ${availability.label}. ${availability.reason} Use example.`
                          : `Use example for ${name}`
                      }
                    >
                      <strong>{name}</strong>
                      {availability ? <SheetAvailability>{availability.label}</SheetAvailability> : null}
                      {command.description ? <span>{command.description}</span> : null}
                      {availability ? (
                        <SheetAvailabilityReason>{availability.reason}</SheetAvailabilityReason>
                      ) : null}
                      {example ? <em>&ldquo;{example}&rdquo;</em> : null}
                    </SheetCommandButton>
                  );
                })}
              </SheetCategory>
            ))
          )}
        </SheetScroll>
      </SheetPanel>
    </>,
    document.body,
  );
};

export default CoachCommandCatalogSheet;
