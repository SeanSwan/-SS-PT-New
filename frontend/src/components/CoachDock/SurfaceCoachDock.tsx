/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  COMPONENT: SurfaceCoachDock (CC-3b)                          ║
 * ║  PURPOSE: The generalized, presentational Swan Coach dock —   ║
 * ║           any surface embeds it with its own copy + context.  ║
 * ║  OWNER: Fable 5 | LAST VALIDATED: 2026-07-22                  ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Generalization of the SHIPPED planner dock visual (props-compatible; the planner
 * component is now a thin wrapper over this). Presentational only — state/transport
 * live in `useSurfaceCoachDock`. STATES: missing-context bar (optional) · collapsed
 * bar · open (empty/busy receipts) · listening (interim renders as hint BELOW the
 * textarea, never as its value). Receipts feed is role="log" aria-live="polite" so
 * Coach tool executions are announced (Kimi a11y law).
 */
import React, { useEffect, useRef } from 'react';
import { Mic, Speech } from 'lucide-react';
import {
  ClientChip, DockBar, DockFooterRow, DockTextarea, DockTitle, DockWrap,
  InputRow, InterimHint, MicBtn, OpenBtn, ReceiptActionBtn, ReceiptFeed, ReceiptRow, SendBtn,
} from './SurfaceCoachDock.styles';
import type { CoachDockReceiptAction } from './useSurfaceCoachDock';

export interface SurfaceCoachDockProps {
  /** Collapsed-bar invitation, e.g. "Swan Coach — talk to build this class". */
  title: string;
  /** Context chip when open (e.g. "client: Alex" or "class: 4 stations"); null hides it. */
  contextChip: string | null;
  /** When set, the dock renders ONLY this muted bar (e.g. "Select a client…"); null = ready. */
  missingContextMessage?: string | null;
  /** Muted example prompts shown while the feed is empty. */
  examplePrompts: string;
  open: boolean;
  toggleOpen: () => void;
  dockText: string;
  setDockText: (t: string) => void;
  listening: boolean;
  interim: string;
  handleVoice: () => void;
  voiceOverlay: React.ReactNode;
  submitting: boolean;
  handleSubmit: () => Promise<void> | void;
  onReceiptAction: (receiptId: string, action: CoachDockReceiptAction) => void;
  receipts: Array<{ id: string; ok: boolean; text: string; action?: CoachDockReceiptAction }>;
}

const SurfaceCoachDock: React.FC<SurfaceCoachDockProps> = ({
  title, contextChip, missingContextMessage = null, examplePrompts,
  open, toggleOpen, dockText, setDockText, listening, interim,
  handleVoice, voiceOverlay, submitting, handleSubmit, onReceiptAction, receipts,
}) => {
  const feedRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [receipts.length, submitting]);

  if (missingContextMessage) {
    return (
      <DockWrap>
        <DockBar>
          <DockTitle $muted>
            <Speech size={18} aria-hidden="true" />
            {missingContextMessage}
          </DockTitle>
        </DockBar>
      </DockWrap>
    );
  }

  if (!open) {
    return (
      <DockWrap>
        <DockBar>
          <DockTitle>
            <Speech size={18} aria-hidden="true" />
            {title}
          </DockTitle>
          <OpenBtn type="button" aria-expanded={false} onClick={toggleOpen}>
            Open Coach ▲
          </OpenBtn>
        </DockBar>
      </DockWrap>
    );
  }

  return (
    <DockWrap>
      <DockBar>
        <DockTitle>
          <Speech size={18} aria-hidden="true" />
          Swan Coach
        </DockTitle>
        {contextChip ? <ClientChip>{contextChip}</ClientChip> : null}
      </DockBar>
      <ReceiptFeed ref={feedRef} role="log" aria-live="polite" aria-label="Swan Coach receipts">
        {receipts.length === 0 && !submitting ? (
          <ReceiptRow $muted>{examplePrompts}</ReceiptRow>
        ) : null}
        {receipts.map((receipt) => (
          <ReceiptRow key={receipt.id} $ok={receipt.ok}>
            <span aria-hidden="true">{receipt.ok ? '✓' : '✗'}</span>
            {receipt.text}
            {receipt.action ? (
              <ReceiptActionBtn
                type="button"
                onClick={() => onReceiptAction(receipt.id, receipt.action!)}
              >
                {receipt.action.label}
              </ReceiptActionBtn>
            ) : null}
          </ReceiptRow>
        ))}
        {submitting ? <ReceiptRow $muted>Swan Coach is thinking…</ReceiptRow> : null}
      </ReceiptFeed>
      <form
        aria-label="Talk to Swan Coach"
        onSubmit={(event) => { event.preventDefault(); void handleSubmit(); }}
      >
        <InputRow>
          <DockTextarea
            value={dockText}
            onChange={(event) => setDockText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              if (event.nativeEvent.isComposing) return;
              if (event.shiftKey && !event.metaKey && !event.ctrlKey) return;
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }}
            placeholder="Tell Swan Coach what to change…"
            aria-label="Tell Swan Coach what to change"
            rows={2}
          />
          <MicBtn
            type="button"
            aria-label="Dictate to Swan Coach"
            aria-pressed={listening}
            onClick={handleVoice}
          >
            <Mic size={20} aria-hidden="true" />
          </MicBtn>
          <SendBtn
            type="submit"
            aria-label="Send to Swan Coach"
            disabled={submitting || !dockText.trim()}
          >
            {submitting ? 'Working…' : 'Send'}
          </SendBtn>
        </InputRow>
        <DockFooterRow>
          <InterimHint aria-live="polite">
            {listening ? `listening…${interim ? ` "${interim}"` : ''}` : ''}
          </InterimHint>
          <OpenBtn type="button" aria-expanded onClick={toggleOpen}>
            Collapse ▼
          </OpenBtn>
        </DockFooterRow>
      </form>
      {voiceOverlay}
    </DockWrap>
  );
};

export default SurfaceCoachDock;
