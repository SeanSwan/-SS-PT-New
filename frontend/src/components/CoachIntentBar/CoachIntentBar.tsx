/**
 * CoachIntentBar — "The Lane" (blueprint v2 card 1.4)
 * ===================================================
 * One object for intent → capability → client → destination, reached the same
 * way by keyboard and by voice.
 *
 * WHY A DOCK AND NOT A PALETTE. Cmd+K here FOCUSES the bar; it does not open a
 * modal. The definition of done is a voice-originated set log landing in ≤2s,
 * screen-off, one-handed — and an overlay you must summon is a mode switch that
 * fights exactly that. The bar is already open; the thumb is already on it.
 *
 * WHAT IS NEW HERE. `intentBarState` was written after a wrong-client write
 * reached production and then sat with NO rendering consumer for six weeks. This
 * is that consumer: the chip turns Gilded Fern whenever the bar would act on a
 * client the operator has not locked — including a name spoken with nothing
 * selected, the case that used to render as the quiet "nothing selected" tone.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LaneWrap, LaneBar, ClientChip, LaneInput, LaneButton, LaneStatus,
  Results, ResultRow, RowText, GroupLabel,
} from './CoachIntentBar.styles';
import { resolveIntentBarState, effectiveClientId } from './intentBarState';

export interface LaneCommand {
  type: string;
  description: string;
  /** Log / Review / Plan / Go to — the row grouping. */
  group?: string;
  /** A navigate row shows ↗; an execute row does not. */
  navigates?: boolean;
}

export interface CoachIntentBarProps {
  commands: LaneCommand[];
  lockedClientId: number | null;
  /** Set once a spoken or typed phrase names someone else. */
  targetClientId?: number | null;
  pathname?: string | null;
  /** Unsynced intents from the C2 projection — the one live token when collapsed. */
  pendingCount?: number;
  listening?: boolean;
  /**
   * F-17 (GLM 5.3) / F-20 (flash): a picked row submits its exact `type`.
   * Submitting the row's DESCRIPTION sent natural language back through the
   * fuzzy classifier — the operator chose precisely and the lane re-guessed,
   * where "Cancel next session" can land on a sibling command. Free text still
   * flows as text; only an explicitly PICKED row carries its type.
   */
  onSubmit: (text: string, picked?: { type: string }) => void;
  onVoice?: () => void;
  onPickClient?: () => void;
  placeholder?: string;
}

const MAX_ROWS = 5;

/**
 * F-20 (GLM 5.3 round 1) — ONE owner for the Cmd+K shortcut.
 *
 * Every mounted bar registered its own `window` keydown listener, so with two
 * on screen — a dock plus a page-level bar, which the layout permits — one
 * keystroke ran two handlers, each calling `preventDefault` and each focusing
 * its own input. Which one won depended on mount order, and the operator got a
 * shortcut that lands somewhere different depending on what else the route
 * happened to render. A global shortcut is global state and needs an owner.
 *
 * The MOST RECENTLY mounted bar owns it, because that is the one drawn on top;
 * when it unmounts the previous owner takes the shortcut back rather than
 * leaving the app with a dead Cmd+K.
 */
const focusStack: Array<() => void> = [];
let shortcutBound = false;

function onGlobalShortcut(e: KeyboardEvent) {
  if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'k') return;
  const focusTopmost = focusStack[focusStack.length - 1];
  if (!focusTopmost) return;
  e.preventDefault();
  focusTopmost();
}

function claimShortcut(focus: () => void) {
  focusStack.push(focus);
  if (!shortcutBound) {
    window.addEventListener('keydown', onGlobalShortcut);
    shortcutBound = true;
  }
  return () => {
    const i = focusStack.lastIndexOf(focus);
    if (i !== -1) focusStack.splice(i, 1);
    if (focusStack.length === 0 && shortcutBound) {
      window.removeEventListener('keydown', onGlobalShortcut);
      shortcutBound = false;
    }
  };
}

export const CoachIntentBar: React.FC<CoachIntentBarProps> = ({
  commands, lockedClientId, targetClientId = null, pathname = null,
  pendingCount = 0, listening = false, onSubmit, onVoice, onPickClient,
  placeholder = 'Ask or act — say it or type it',
}) => {
  const [text, setText] = useState('');
  const [activeRow, setActiveRow] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const barState = useMemo(
    () => resolveIntentBarState({ lockedClientId, targetClientId, pathname }),
    [lockedClientId, targetClientId, pathname],
  );

  // Cmd/Ctrl+K FOCUSES the bar. It deliberately opens nothing: a modal here
  // would be the mode switch this shape exists to avoid.
  useEffect(() => claimShortcut(() => inputRef.current?.focus()), []);

  const matches = useMemo(() => {
    const q = text.trim().toLowerCase();
    if (!q) return [];
    return commands
      .filter((c) => c.type.replace(/_/g, ' ').includes(q) || c.description.toLowerCase().includes(q))
      .slice(0, MAX_ROWS);
  }, [text, commands]);

  useEffect(() => { setActiveRow(0); }, [text]);

  const submit = useCallback((value: string, picked?: LaneCommand) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setText('');
    onSubmit(trimmed, picked ? { type: picked.type } : undefined);
  }, [onSubmit]);

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && matches.length) {
      e.preventDefault();
      setActiveRow((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp' && matches.length) {
      e.preventDefault();
      setActiveRow((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      // IME guard: an in-flight composition must not submit a half-typed phrase.
      // Safari's terminating Enter can arrive with isComposing === false and
      // keyCode 229 (F-18 / flash F-19), so both signals are checked — a
      // Japanese or Chinese speaker otherwise sends a fragment of their word to
      // the command lane.
      const native = e.nativeEvent as unknown as { isComposing?: boolean; keyCode?: number };
      if (native.isComposing || native.keyCode === 229) return;
      e.preventDefault();
      const picked = matches[activeRow];
      submit(picked?.description ?? text, picked);
    } else if (e.key === 'Escape') {
      setText('');
    }
  }, [matches, activeRow, submit, text]);

  const chipLabel = barState.identityCrossing
    ? `⚠ Client-${effectiveClientId(barState) ?? '?'}`
    : (barState.lockedClientId !== null ? `Client-${barState.lockedClientId}` : 'No client');

  return (
    <LaneWrap data-testid="coach-intent-bar">
      {matches.length > 0 && (
        <Results id="coach-lane-results" role="listbox" aria-label="Swan Coach suggestions">
          <GroupLabel aria-hidden="true">Suggested</GroupLabel>
          {matches.map((c, i) => (
            <ResultRow
              key={c.type}
              id={`coach-lane-row-${c.type}`}
              $active={i === activeRow}
              role="option"
              aria-selected={i === activeRow}
              data-testid={`lane-row-${c.type}`}
              onMouseEnter={() => setActiveRow(i)}
              onClick={() => submit(c.description, c)}
            >
              <RowText>
                <strong>{c.description}</strong>
                <small>{c.type.replace(/_/g, ' ')}</small>
              </RowText>
              <span aria-hidden="true">{c.navigates ? '↗' : ''}</span>
            </ResultRow>
          ))}
        </Results>
      )}

      <LaneBar>
        <ClientChip
          type="button"
          $tone={barState.chipTone}
          onClick={onPickClient}
          data-testid="lane-client-chip"
          data-tone={barState.chipTone}
          aria-label={barState.identityCrossing
            ? 'Warning: this would act on a client you have not locked. Change client.'
            : 'Change client'}
        >
          {chipLabel}
        </ClientChip>

        {/*
          * F-19 / flash F-18: the results rendered role="listbox" with
          * aria-selected options, but the INPUT carried none of the combobox
          * contract — so arrow-key movement changed nothing a screen reader
          * could observe. The pattern was decorative for exactly the users who
          * depend on it.
          */}
        <LaneInput
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label="Ask or act"
          role="combobox"
          aria-expanded={matches.length > 0}
          aria-controls="coach-lane-results"
          aria-autocomplete="list"
          aria-activedescendant={matches.length ? `coach-lane-row-${matches[activeRow]?.type}` : undefined}
          data-testid="lane-input"
        />

        {onVoice && (
          <LaneButton
            type="button"
            $mic
            onClick={onVoice}
            aria-pressed={listening}
            aria-label={listening ? 'Stop listening' : 'Speak to Swan Coach'}
            data-testid="lane-mic"
          >
            {listening ? '■' : '🎤'}
          </LaneButton>
        )}

        <LaneButton type="button" onClick={() => submit(text)} data-testid="lane-send">
          Send
        </LaneButton>
      </LaneBar>

      {pendingCount > 0 && (
        <LaneStatus data-testid="lane-pending">
          {pendingCount} not yet synced
        </LaneStatus>
      )}
    </LaneWrap>
  );
};

export default CoachIntentBar;
