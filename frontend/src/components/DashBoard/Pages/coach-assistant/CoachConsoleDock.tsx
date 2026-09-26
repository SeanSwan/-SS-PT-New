/**
 * COMPONENT: CoachConsoleDock
 * PURPOSE: Bottom command dock for talk-first Swan Coach Floor Mode.
 *
 * The trainer-floor path is intentionally sparse: More, Mic, Send, and a clear
 * confirmation promise. Attachment, audio import, readback, logger, and plan
 * tools live behind More so talking stays the primary action.
 *
 * THE MIC IS INLINE (2026-09-25)
 * ------------------------------
 * The dock used to render a full-screen VoiceRecordingOverlay whenever the
 * browser lacked the Web Speech API — which is most browsers, since Brave
 * strips it and WebViews withhold it. Finishing a single spoken sentence there
 * cost four gestures: press the mic, press "Stop & Send", read the transcript
 * preview, press "Send to Swan Coach", then press Send to reach the model.
 *
 * Dictation now happens in the composer it belongs to. CoachDictationStrip
 * appears above the textarea while the microphone is open, and the words land
 * in the textarea itself. Nothing covers the composer, and nothing is confirmed
 * twice.
 */
import React, { useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowUp, Mic } from 'lucide-react';
import CoachDictationStrip, { type CoachDockVoice } from './CoachDictationStrip';
import CoachDockMoreMenu from './CoachDockMoreMenu';
import CoachFreestyleControl from './CoachFreestyleControl';

type CoachConsoleDockProps = {
  commandFormRef: React.RefObject<HTMLFormElement>;
  commandText: string;
  commandTextRef: React.RefObject<HTMLTextAreaElement>;
  nextActionLabel?: string | null;
  selectedStatus: string;
  /** Everything dictation-related, including the mic's own state. */
  voice: CoachDockVoice;
  voiceReplyEnabled?: boolean;
  voiceReplySpeaking?: boolean;
  /**
   * Long-form hands-free dictation, distinct from the short-command Mic.
   * Opt-in: defaults off so surfaces that have not reviewed the draft-handoff
   * behaviour keep their current dock exactly as it is.
   */
  showFreestyle?: boolean;
  /** Account owning the freestyle buffer; a change purges it. */
  freestyleAccountKey?: string | number | null;
  workoutLoggerRoute?: string | null;
  workoutLoggerLabel?: string;
  workoutLoggerAriaLabel?: string;
  workoutPlannerRoute?: string | null;
  workoutPlannerLabel?: string;
  workoutPlannerAriaLabel?: string;
  showPlaudAction?: boolean;
  workflowReturnLabel?: string | null;
  workflowReturnTo?: string | null;
  onCommandTextChange: (value: string) => void;
  onAttach: () => void;
  onStartPlaudUpload: () => void;
  onReadback: () => void;
  onSubmit: (event: React.FormEvent) => void;
  onToggleVoiceReplies?: () => void;
  onVoice: () => void;
};

const CoachConsoleDock: React.FC<CoachConsoleDockProps> = ({
  commandFormRef,
  commandText,
  commandTextRef,
  nextActionLabel,
  selectedStatus,
  voice,
  voiceReplyEnabled = false,
  voiceReplySpeaking = false,
  showFreestyle = false,
  freestyleAccountKey = null,
  workoutLoggerRoute,
  workoutLoggerLabel = 'Logger',
  workoutLoggerAriaLabel = 'Open workout logger',
  workoutPlannerRoute,
  workoutPlannerLabel = 'Planner',
  workoutPlannerAriaLabel = 'Open workout planner',
  showPlaudAction = true,
  workflowReturnLabel,
  workflowReturnTo,
  onCommandTextChange,
  onAttach,
  onStartPlaudUpload,
  onReadback,
  onSubmit,
  onToggleVoiceReplies,
  onVoice,
}) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const menuId = useId();
  const moreButtonRef = useRef<HTMLButtonElement>(null);

  const { active: voiceActive, captureMode, phase, supported } = voice;
  const voiceTitle = !supported
    ? 'Voice dictation is not available in this browser'
    : phase === 'transcribing'
      ? 'Transcribing your voice'
      : phase === 'listening'
        ? 'Stop and keep the words'
        : captureMode === 'recorder' ? 'Record and transcribe voice' : 'Voice dictation';
  /**
   * When voice is unavailable the label must not promise the action the button
   * is disabled for — a screen reader would announce "Start voice dictation"
   * over a control that cannot start anything.
   */
  const voiceLabel = !supported
    ? 'Voice dictation is not available in this browser'
    : phase === 'listening'
      ? captureMode === 'recorder' ? 'Recording - tap to stop' : 'Listening - tap to stop'
      : phase === 'transcribing'
        ? 'Transcribing voice'
        : captureMode === 'recorder' ? 'Start voice recording' : 'Start voice dictation';

  return (
    <>
      <div className="console-dock">
        {workflowReturnTo && workflowReturnLabel ? (
          <Link className="next-action-chip workflow-return-link" to={workflowReturnTo}>
            <ArrowLeft size={16} aria-hidden="true" />
            <span className="next-action-text">{workflowReturnLabel}</span>
          </Link>
        ) : null}

        <form
          className="dock-form"
          ref={commandFormRef}
          onSubmit={(event) => {
            /**
             * Only when this submit will actually send something. Cancelling
             * unconditionally destroyed an in-flight transcript on an EMPTY
             * composer — the RECORD branch holds the audio until the transcript
             * arrives, so the speaker's words were discarded and `handleSubmit`
             * then returned early on `!trimmed`, with nothing written to the
             * status line to explain it. Leaving the microphone alone means the
             * transcript still lands, and Send works on the second press.
             */
            if (voiceActive && commandText.trim()) voice.cancel();
            onSubmit(event);
          }}
          aria-label="Talk to Swan Coach"
        >
          {phase !== 'idle' ? (
            <CoachDictationStrip
              elapsedSeconds={voice.elapsedSeconds}
              levels={voice.levels}
              metering={voice.metering}
              phase={phase}
            />
          ) : null}

          <textarea
            className="dock-textarea"
            ref={commandTextRef}
            value={commandText}
            onChange={(event) => onCommandTextChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              if (event.nativeEvent.isComposing) return;
              if (event.shiftKey && !event.metaKey && !event.ctrlKey) return;

              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }}
            placeholder={phase === 'listening' ? 'Listening...' : 'Talk or type to Swan Coach...'}
            aria-label="Talk or type to Swan Coach"
            aria-describedby="coach-dock-status coach-dock-trust"
            rows={2}
          />

          <div className="dock-primary-row">
            <div className="dock-safety-stack">
              <span id="coach-dock-trust" className="dock-trust-pill">Confirm before save</span>
              {nextActionLabel ? (
                <span className="dock-next-pill" role="status" aria-label="Recommended coach action">
                  Next: {nextActionLabel}
                </span>
              ) : null}
              <span id="coach-dock-status" className="dock-status">
                {voiceReplySpeaking ? 'Swan Coach is speaking' : selectedStatus}
              </span>
            </div>

            <div className="dock-main-actions">
              <CoachDockMoreMenu
                advancedOpen={advancedOpen}
                menuId={menuId}
                moreButtonRef={moreButtonRef}
                moreOpen={moreOpen}
                onAttach={onAttach}
                onDismiss={() => { setMoreOpen(false); setAdvancedOpen(false); }}
                onDismissAndRefocus={() => {
                  setMoreOpen(false);
                  setAdvancedOpen(false);
                  moreButtonRef.current?.focus();
                }}
                onReadback={onReadback}
                onStartPlaudUpload={onStartPlaudUpload}
                onToggleAdvanced={() => setAdvancedOpen((open) => !open)}
                onToggleMenu={() => setMoreOpen((open) => !open)}
                onToggleVoiceReplies={onToggleVoiceReplies}
                showPlaudAction={showPlaudAction}
                voiceReplyEnabled={voiceReplyEnabled}
                workoutLoggerAriaLabel={workoutLoggerAriaLabel}
                workoutLoggerLabel={workoutLoggerLabel}
                workoutLoggerRoute={workoutLoggerRoute}
                workoutPlannerAriaLabel={workoutPlannerAriaLabel}
                workoutPlannerLabel={workoutPlannerLabel}
                workoutPlannerRoute={workoutPlannerRoute}
              />

              {showFreestyle ? (
                <CoachFreestyleControl
                  accountKey={freestyleAccountKey}
                  commandText={commandText}
                  onCommandTextChange={onCommandTextChange}
                  composerRef={commandTextRef}
                />
              ) : null}

              <button
                type="button"
                className={`dock-mic ${voiceActive ? 'is-listening' : ''}`}
                aria-pressed={voiceActive}
                disabled={!supported}
                onClick={onVoice}
                title={voiceTitle}
                aria-label={voiceLabel}
              >
                <Mic size={22} aria-hidden="true" />
              </button>
              <button type="submit" className="dock-send" aria-label="Send to Swan Coach">
                <ArrowUp size={22} aria-hidden="true" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
};

export default CoachConsoleDock;
