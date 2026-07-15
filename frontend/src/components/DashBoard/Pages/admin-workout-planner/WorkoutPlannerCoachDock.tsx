/**
 * COMPONENT: WorkoutPlannerCoachDock
 * PURPOSE: Collapsible Swan Coach dock at the bottom of the Workout Planner —
 * the trainer dictates or types plan edits and receipts stream back in plain
 * sentences. Presentational only: all state/transport lives in
 * `useWorkoutPlannerCoachDock` (mimics the CoachConsoleDock textarea/mic/
 * submit wiring WITHOUT importing it — blueprint 06-bans §4).
 * STATES: no-client bar · collapsed bar · open (empty/busy/error receipts) ·
 * listening (interim renders as hint BELOW the textarea, never as its value).
 */
import React, { useEffect, useRef } from 'react';
import { Mic, Speech } from 'lucide-react';
import {
  ClientChip, DockBar, DockFooterRow, DockTextarea, DockTitle, DockWrap,
  InputRow, InterimHint, MicBtn, OpenBtn, ReceiptFeed, ReceiptRow, SendBtn,
} from './WorkoutPlannerCoachDock.styles';

export interface WorkoutPlannerCoachDockProps {
  /** Selected client display name; null = no client selected (dock disabled). */
  clientName: string | null;
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
  receipts: Array<{ id: string; ok: boolean; text: string }>;
}

const EXAMPLE_PROMPTS =
  'Try: "Add goblet squats, three sets of twelve" · "Swap leg press for box squat" · "Make day two lighter"';

const WorkoutPlannerCoachDock: React.FC<WorkoutPlannerCoachDockProps> = ({
  clientName, open, toggleOpen, dockText, setDockText, listening, interim,
  handleVoice, voiceOverlay, submitting, handleSubmit, receipts,
}) => {
  const feedRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [receipts.length, submitting]);

  if (!clientName) {
    return (
      <DockWrap>
        <DockBar>
          <DockTitle $muted>
            <Speech size={18} aria-hidden="true" />
            Select a client to talk to Swan Coach.
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
            Swan Coach — talk to build this plan
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
        <ClientChip>client: {clientName}</ClientChip>
      </DockBar>
      <ReceiptFeed ref={feedRef} role="log" aria-live="polite" aria-label="Swan Coach receipts">
        {receipts.length === 0 && !submitting ? (
          <ReceiptRow $muted>{EXAMPLE_PROMPTS}</ReceiptRow>
        ) : null}
        {receipts.map((receipt) => (
          <ReceiptRow key={receipt.id} $ok={receipt.ok}>
            <span aria-hidden="true">{receipt.ok ? '✓' : '✗'}</span>
            {receipt.text}
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

export default WorkoutPlannerCoachDock;
