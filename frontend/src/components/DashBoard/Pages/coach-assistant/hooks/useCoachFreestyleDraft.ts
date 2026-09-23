/**
 * FILE: useCoachFreestyleDraft.ts
 * PURPOSE: S4-minimal consolidation — the first consumer CoachFreestyleOverlay
 *          has ever had.
 *
 * WHY THIS EXISTS
 * ---------------
 * CoachFreestyleOverlay (605 lines) + useFreestyleSession (624) +
 * useFreestyleSpeech (358) were built, tested, and then left with no render
 * site for one honest reason, stated in the overlay's own header: stopping a
 * session hands the buffer to "consolidation (S4), which does not exist yet,
 * so `onStopped` is currently the end of the road."
 *
 * Mounting the overlay without building that consumer would have shipped a
 * microphone that listens for ten minutes on a gym floor and then silently
 * throws the transcript away. This hook is the consumer, and it is deliberately
 * the SMALLEST one that is honest:
 *
 *     frozen snapshot  ->  text  ->  the composer, as an EDITABLE DRAFT
 *
 * WHAT IT DOES NOT DO (on purpose)
 * --------------------------------
 * It does not summarise, classify, call a model, or write to any client
 * record. The Coach Command Center is review-gated — Swan Coach prepares
 * operator drafts and a human approves every write. Dictation lands in the
 * same textarea the coach was already going to type into, so the existing
 * approval path is unchanged and unbypassed. Full S4 (summary / consolidating
 * states, already declared in FreestyleState) remains unbuilt and is NOT
 * claimed here.
 */
import { useCallback, useRef, useState } from 'react';
import type {
  FreestylePurgeReason,
  FreestyleSnapshot,
} from './useFreestyleSession';

/**
 * Collapse a frozen snapshot into one dictated block.
 *
 * Fragments arrive from the speech recogniser already phrase-sized, with no
 * trailing punctuation and inconsistent leading space. Joining on a single
 * space and squeezing runs keeps the draft readable without inventing sentence
 * boundaries the speaker did not say — guessing punctuation here would put
 * words in a coach's mouth that they then approve without re-reading.
 */
export const freestyleSnapshotToText = (snapshot: FreestyleSnapshot): string =>
  snapshot.fragments
    .map((fragment) => fragment.text.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Append dictation to whatever the coach had already typed.
 *
 * REPLACING would destroy a half-written command the moment someone taps
 * "just talk" to add a thought to it. Blank-line separation makes the seam
 * between typed and dictated text visible, so the coach can see what the mic
 * contributed before approving anything.
 */
export const appendFreestyleDraft = (existing: string, addition: string): string => {
  if (!addition) return existing;
  const base = existing.trimEnd();
  return base ? `${base}\n\n${addition}` : addition;
};

export interface FreestyleDraftReceipt {
  reason: FreestylePurgeReason;
  wordCount: number;
  elapsedMs: number;
}

export interface UseCoachFreestyleDraftOptions {
  /** Current composer contents. Mirrored to a ref — see `commandTextRef`. */
  commandText: string;
  /** Composer setter. The only write this hook performs. */
  onCommandTextChange: (value: string) => void;
  /** Focused after a draft lands so the coach can edit immediately. */
  composerRef?: React.RefObject<HTMLTextAreaElement>;
  /**
   * Purge/handoff receipts. The session hook emits a receipt for every buffer
   * destruction (discard, TTL, account switch, logout, unmount) precisely so
   * retention is auditable; dropping them on the floor would make that audit
   * fiction. There is no durable sink for these yet — see the note in the
   * returned `handlePurge`.
   */
  onReceipt?: (receipt: FreestyleDraftReceipt) => void;
}

export interface UseCoachFreestyleDraftReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  /** Hand to CoachFreestyleOverlay's `onStopped`. */
  handleStopped: (snapshot: FreestyleSnapshot) => void;
  /** Hand to CoachFreestyleOverlay's `onPurge`. */
  handlePurge: (reason: FreestylePurgeReason) => void;
  /** Words delivered by the most recent session; 0 before any. */
  lastDraftWordCount: number;
}

export function useCoachFreestyleDraft(
  options: UseCoachFreestyleDraftOptions,
): UseCoachFreestyleDraftReturn {
  const { commandText, onCommandTextChange, composerRef, onReceipt } = options;

  const [isOpen, setIsOpen] = useState(false);
  const [lastDraftWordCount, setLastDraftWordCount] = useState(0);

  /**
   * Synchronous mirror of the composer text, refreshed every render.
   *
   * `handleStopped` is handed to the overlay once and then lives inside it for
   * the whole session. Reading `commandText` from the creating closure would
   * append to whatever the composer held when the mic opened, silently
   * discarding anything typed during a ten-minute dictation. useFreestyleSession
   * keeps a `fragmentsRef` for the same class of reason.
   */
  const commandTextRef = useRef(commandText);
  commandTextRef.current = commandText;

  const onCommandTextChangeRef = useRef(onCommandTextChange);
  onCommandTextChangeRef.current = onCommandTextChange;

  const onReceiptRef = useRef(onReceipt);
  onReceiptRef.current = onReceipt;

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const handleStopped = useCallback((snapshot: FreestyleSnapshot) => {
    const dictated = freestyleSnapshotToText(snapshot);

    /**
     * An empty snapshot still closes the overlay, but must not emit a draft.
     * Appending "" would leave the coach staring at an unchanged composer with
     * no signal that the recogniser never heard anything — and, worse, the
     * blank-line separator would make it look like something arrived.
     */
    if (dictated) {
      onCommandTextChangeRef.current(
        appendFreestyleDraft(commandTextRef.current, dictated),
      );
      setLastDraftWordCount(snapshot.wordCount);
    } else {
      setLastDraftWordCount(0);
    }

    onReceiptRef.current?.({
      reason: 'completed',
      wordCount: snapshot.wordCount,
      elapsedMs: snapshot.elapsedMs,
    });

    setIsOpen(false);

    /**
     * Focus after the overlay's close transition commits. Focusing in the same
     * tick lands on a node the overlay still covers, so the caret is invisible
     * and the on-screen keyboard does not raise on a tablet.
     */
    if (composerRef?.current) {
      const node = composerRef.current;
      window.requestAnimationFrame(() => {
        node.focus();
        node.setSelectionRange(node.value.length, node.value.length);
      });
    }
  }, [composerRef]);

  const handlePurge = useCallback((reason: FreestylePurgeReason) => {
    /**
     * NOT YET DURABLE. These receipts currently terminate here plus whatever
     * the caller passes in `onReceipt`. The retention audit the session hook
     * promises needs a real sink (server-side or a persisted local log); that
     * is an open item, not something this hook satisfies.
     */
    onReceiptRef.current?.({ reason, wordCount: 0, elapsedMs: 0 });
    if (reason === 'discard' || reason === 'account-switch' || reason === 'logout') {
      setLastDraftWordCount(0);
    }
  }, []);

  return { isOpen, open, close, handleStopped, handlePurge, lastDraftWordCount };
}

export default useCoachFreestyleDraft;
