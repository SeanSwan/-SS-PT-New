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
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import apiService from '../../../../services/api.service';
import {
  SheetCategory,
  SheetCommandButton,
  SheetHeader,
  SheetPanel,
  SheetScrim,
  SheetScroll,
  SheetStateText,
} from './CoachCommandCatalogSheet.styles';

type CatalogCommand = {
  type: string;
  description?: string;
  category?: string;
  examples?: string[];
};

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
    const category = command.category?.trim() || 'General';
    groups.set(category, [...(groups.get(category) ?? []), command]);
  }
  return [...groups.entries()];
}

const CoachCommandCatalogSheet: React.FC<CoachCommandCatalogSheetProps> = ({ open, onClose, onUsePrompt }) => {
  const [commands, setCommands] = useState<CatalogCommand[] | null>(null);
  const [failed, setFailed] = useState(false);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setFailed(false);
    setCommands(null);
    apiService.get('/api/ai-command/commands')
      .then((res) => {
        if (cancelled) return;
        const list = res.data?.commands;
        if (res.data?.success && Array.isArray(list)) setCommands(list);
        else setFailed(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    panelRef.current?.focus();
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
    return () => window.removeEventListener('keydown', onKeyDown);
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
          ) : !commands ? (
            <SheetStateText>Loading commands…</SheetStateText>
          ) : !commands.length ? (
            <SheetStateText>No structured commands are available for this role yet — plain conversation still works.</SheetStateText>
          ) : (
            groupByCategory(commands).map(([category, groupCommands]) => (
              <SheetCategory key={category}>
                <h3>{category}</h3>
                {groupCommands.map((command) => {
                  const example = command.examples?.[0];
                  return (
                    <SheetCommandButton
                      type="button"
                      key={command.type}
                      onClick={() => {
                        if (example) onUsePrompt(example);
                        onClose();
                      }}
                      aria-label={`Use example for ${friendlyCommandName(command.type)}`}
                    >
                      <strong>{friendlyCommandName(command.type)}</strong>
                      {command.description ? <span>{command.description}</span> : null}
                      {example ? <em>"{example}"</em> : null}
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
