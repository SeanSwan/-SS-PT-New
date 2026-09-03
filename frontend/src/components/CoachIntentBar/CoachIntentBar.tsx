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
  onSubmit: (text: string) => void;
  onVoice?: () => void;
  onPickClient?: () => void;
  placeholder?: string;
}

const MAX_ROWS = 5;

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
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const matches = useMemo(() => {
    const q = text.trim().toLowerCase();
    if (!q) return [];
    return commands
      .filter((c) => c.type.replace(/_/g, ' ').includes(q) || c.description.toLowerCase().includes(q))
      .slice(0, MAX_ROWS);
  }, [text, commands]);

  useEffect(() => { setActiveRow(0); }, [text]);

  const submit = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setText('');
    onSubmit(trimmed);
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
      if ((e.nativeEvent as unknown as { isComposing?: boolean }).isComposing) return;
      e.preventDefault();
      submit(matches[activeRow]?.description ?? text);
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
        <Results role="listbox" aria-label="Swan Coach suggestions">
          <GroupLabel aria-hidden="true">Suggested</GroupLabel>
          {matches.map((c, i) => (
            <ResultRow
              key={c.type}
              $active={i === activeRow}
              role="option"
              aria-selected={i === activeRow}
              data-testid={`lane-row-${c.type}`}
              onMouseEnter={() => setActiveRow(i)}
              onClick={() => submit(c.description)}
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

        <LaneInput
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label="Ask or act"
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
