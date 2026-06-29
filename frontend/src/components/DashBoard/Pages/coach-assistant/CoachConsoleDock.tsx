/**
 * COMPONENT: CoachConsoleDock
 * PURPOSE: Bottom command dock for the chat-first Swan Coach terminal.
 *
 * Voice-forward, floor-legible input: a slim next-best-action chip, real route
 * links, a large dictation/typing box, and big mic + send targets. Talking is
 * the primary action (the trainer is on the
 * floor, phone discouraged), so the mic is a first-class 56px control.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowUp, ClipboardList, Dumbbell, FileAudio, Mic, Paperclip, Volume2 } from 'lucide-react';

type CoachConsoleDockProps = {
  commandFormRef: React.RefObject<HTMLFormElement>;
  commandText: string;
  commandTextRef: React.RefObject<HTMLTextAreaElement>;
  nextActionLabel?: string | null;
  selectedStatus: string;
  voiceActive: boolean;
  voiceSupported: boolean;
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
  onVoice: () => void;
};

const CoachConsoleDock: React.FC<CoachConsoleDockProps> = ({
  commandFormRef,
  commandText,
  commandTextRef,
  nextActionLabel,
  selectedStatus,
  voiceActive,
  voiceSupported,
  workoutLoggerRoute,
  workoutLoggerLabel = 'Logger',
  workoutLoggerAriaLabel = 'Open workout logger',
  workoutPlannerRoute,
  workoutPlannerLabel = 'Build Plan',
  workoutPlannerAriaLabel = 'Open Build Plan',
  showPlaudAction = true,
  workflowReturnLabel,
  workflowReturnTo,
  onCommandTextChange,
  onAttach,
  onStartPlaudUpload,
  onReadback,
  onSubmit,
  onVoice,
}) => (
  <div className="console-dock">
    {workflowReturnTo && workflowReturnLabel ? (
      <Link className="next-action-chip workflow-return-link" to={workflowReturnTo}>
        <ArrowLeft size={16} aria-hidden="true" />
        <span className="next-action-text">{workflowReturnLabel}</span>
      </Link>
    ) : null}

    {nextActionLabel ? (
      <div className="next-action-chip" role="status" aria-label="Recommended coach action">
        <span aria-hidden="true">&gt;</span>
        <span className="next-action-text">Next: {nextActionLabel}</span>
      </div>
    ) : null}
    {(workoutLoggerRoute || workoutPlannerRoute) ? (
      <div className="workout-route-actions" role="group" aria-label="Workout surfaces">
        {workoutLoggerRoute ? (
          <Link className="workout-route-link" to={workoutLoggerRoute} aria-label={workoutLoggerAriaLabel}>
            <Dumbbell size={16} aria-hidden="true" />
            <span>{workoutLoggerLabel}</span>
          </Link>
        ) : null}
        {workoutPlannerRoute ? (
          <Link className="workout-route-link" to={workoutPlannerRoute} aria-label={workoutPlannerAriaLabel}>
            <ClipboardList size={16} aria-hidden="true" />
            <span>{workoutPlannerLabel}</span>
          </Link>
        ) : null}
      </div>
    ) : null}

    <form className="dock-form" ref={commandFormRef} onSubmit={onSubmit} aria-label="Talk to Swan Coach">
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
        placeholder="Talk or type to Swan Coach…"
        aria-describedby="coach-dock-status coach-dock-trust"
        rows={2}
      />
      <span id="coach-dock-trust" className="dock-trust-line">
        Actions are prepared for review and saved only after confirmation.
      </span>
      <div className="dock-actions">
        <div className="dock-actions-left">
          <button type="button" className="dock-action" onClick={onAttach} aria-label="Attach">
            <Paperclip size={18} aria-hidden="true" />
            <span className="dock-action-label">Attach</span>
          </button>
          {showPlaudAction ? (
            <button type="button" className="dock-action" onClick={onStartPlaudUpload} aria-label="Import PLAUD">
              <FileAudio size={18} aria-hidden="true" />
              <span className="dock-action-label">PLAUD</span>
            </button>
          ) : null}
          <button type="button" className="dock-action" onClick={onReadback} aria-label="Readback">
            <Volume2 size={18} aria-hidden="true" />
            <span className="dock-action-label">Readback</span>
          </button>
        </div>
        <div className="dock-actions-right">
          <button
            type="button"
            className={`dock-mic ${voiceActive ? 'is-listening' : ''}`}
            aria-pressed={voiceActive}
            disabled={!voiceSupported}
            onClick={onVoice}
            title={voiceSupported ? 'Voice dictation' : 'Voice dictation is not available in this browser'}
            aria-label={voiceActive ? 'Listening — tap to stop' : 'Start voice dictation'}
          >
            <Mic size={20} aria-hidden="true" />
          </button>
          <button type="submit" className="dock-send" aria-label="Send to Swan Coach">
            <ArrowUp size={20} aria-hidden="true" />
          </button>
        </div>
      </div>
      <span id="coach-dock-status" className="dock-status">
        {selectedStatus}
      </span>
    </form>
  </div>
);

export default CoachConsoleDock;
