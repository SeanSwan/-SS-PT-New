/**
 * FILE: CoachFreestyleControl.tsx
 * PURPOSE: The render site CoachFreestyleOverlay never had, plus the dock
 *          control that opens it.
 * PARENT:  CoachConsoleDock (talk tab of CoachCommandCenterPage).
 *
 * TWO MICROPHONES, ON PURPOSE
 * ---------------------------
 * The dock's existing Mic is one short spoken command, transcribed and dropped
 * into the composer. This is the other thing: hands-free long-form dictation
 * for a coach talking on a gym floor for minutes with their hands busy. They
 * are different interactions with different failure modes, so they get
 * different affordances rather than one overloaded button.
 *
 * ALWAYS MOUNTED
 * --------------
 * The overlay is rendered unconditionally and hidden with `isOpen`, never
 * conditionally rendered. useFreestyleSession purges its buffer on unmount —
 * `{open ? <Overlay/> : null}` would destroy the session every time the
 * surface was dismissed, which is exactly the data loss this whole slice
 * exists to prevent. The overlay is `position: fixed; inset: 0` with
 * `pointer-events: none` while closed, so mounting it here costs no layout.
 */
import React from 'react';
import { AudioLines } from 'lucide-react';
import CoachFreestyleOverlay from './CoachFreestyleOverlay';
import {
  useCoachFreestyleDraft,
  type FreestyleDraftReceipt,
} from './hooks/useCoachFreestyleDraft';

export interface CoachFreestyleControlProps {
  /**
   * Account that owns the dictation buffer. A change purges it — the
   * shared-gym-tablet guarantee enforced inside useFreestyleSession.
   */
  accountKey: string | number | null;
  /** Current composer text; dictation is appended, never substituted. */
  commandText: string;
  onCommandTextChange: (value: string) => void;
  composerRef?: React.RefObject<HTMLTextAreaElement>;
  disabled?: boolean;
  onReceipt?: (receipt: FreestyleDraftReceipt) => void;
}

const CoachFreestyleControl: React.FC<CoachFreestyleControlProps> = ({
  accountKey,
  commandText,
  onCommandTextChange,
  composerRef,
  disabled = false,
  onReceipt,
}) => {
  const freestyle = useCoachFreestyleDraft({
    commandText,
    onCommandTextChange,
    composerRef,
    onReceipt,
  });

  return (
    <>
      <button
        type="button"
        className={`dock-freestyle ${freestyle.isOpen ? 'is-live' : ''}`}
        aria-pressed={freestyle.isOpen}
        disabled={disabled}
        onClick={freestyle.open}
        title="Just talk — hands-free dictation that lands in the composer as a draft"
        aria-label={
          freestyle.isOpen
            ? 'Freestyle dictation open'
            : 'Start freestyle dictation'
        }
      >
        <AudioLines size={22} aria-hidden="true" />
      </button>

      <CoachFreestyleOverlay
        isOpen={freestyle.isOpen}
        accountKey={accountKey}
        onClose={freestyle.close}
        onStopped={freestyle.handleStopped}
        onPurge={freestyle.handlePurge}
      />
    </>
  );
};

export default CoachFreestyleControl;
