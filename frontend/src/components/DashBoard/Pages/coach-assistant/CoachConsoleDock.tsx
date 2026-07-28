/**
 * COMPONENT: CoachConsoleDock
 * PURPOSE: Bottom command dock for talk-first Swan Coach Floor Mode.
 *
 * The trainer-floor path is intentionally sparse: More, Mic, Send, and a clear
 * confirmation promise. Attachment, audio import, readback, logger, and plan
 * tools live behind More so talking stays the primary action.
 */
import React, { useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUp,
  ClipboardList,
  Dumbbell,
  FileAudio,
  Mic,
  MoreHorizontal,
  Paperclip,
  Volume2,
} from 'lucide-react';
import VoiceRecordingOverlay from './VoiceRecordingOverlay';

type VoiceOverlayProps = {
  isOpen: boolean;
  onClose: () => void;
  onEditTranscript?: (text: string) => void;
  onTranscribed: (text: string) => void;
};

type CoachConsoleDockProps = {
  commandFormRef: React.RefObject<HTMLFormElement>;
  commandText: string;
  commandTextRef: React.RefObject<HTMLTextAreaElement>;
  nextActionLabel?: string | null;
  selectedStatus: string;
  voiceActive: boolean;
  voiceCaptureMode?: 'browser' | 'recorder' | 'none';
  voiceOverlay?: VoiceOverlayProps;
  voiceReplyEnabled?: boolean;
  voiceReplySpeaking?: boolean;
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
  onToggleVoiceReplies?: () => void;
  onVoice: () => void;
};

const CoachConsoleDock: React.FC<CoachConsoleDockProps> = ({
  commandFormRef,
  commandText,
  commandTextRef,
  nextActionLabel,
  selectedStatus,
  voiceActive,
  voiceCaptureMode = 'browser',
  voiceOverlay,
  voiceReplyEnabled = false,
  voiceReplySpeaking = false,
  voiceSupported,
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
  const menuId = useId();
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const voiceTitle = voiceSupported
    ? voiceCaptureMode === 'recorder' ? 'Record and transcribe voice' : 'Voice dictation'
    : 'Voice dictation is not available in this browser';
  const voiceLabel = voiceActive
    ? voiceCaptureMode === 'recorder' ? 'Voice recorder open' : 'Listening - tap to stop'
    : voiceCaptureMode === 'recorder' ? 'Start voice recording' : 'Start voice dictation';

  const closeMoreMenu = () => {
    setMoreOpen(false);
    moreButtonRef.current?.focus();
  };

  const handleMoreMenuKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    closeMoreMenu();
  };

  const runMoreAction = (action: () => void) => {
    setMoreOpen(false);
    action();
  };

  return (
    <>
      <div className="console-dock">
        {workflowReturnTo && workflowReturnLabel ? (
          <Link className="next-action-chip workflow-return-link" to={workflowReturnTo}>
            <ArrowLeft size={16} aria-hidden="true" />
            <span className="next-action-text">{workflowReturnLabel}</span>
          </Link>
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
            placeholder="Talk or type to Swan Coach..."
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
              <div className="dock-more-wrap">
                <button
                  ref={moreButtonRef}
                  type="button"
                  className="dock-more"
                  aria-controls={menuId}
                  aria-expanded={moreOpen}
                  aria-haspopup="menu"
                  aria-label="More command tools"
                  onClick={() => setMoreOpen((open) => !open)}
                >
                  <MoreHorizontal size={20} aria-hidden="true" />
                </button>
                {moreOpen ? (
                  <div className="dock-more-menu" id={menuId} role="menu" aria-label="More command tools" onKeyDown={handleMoreMenuKeyDown}>
                    <button type="button" role="menuitem" onClick={() => runMoreAction(onAttach)}>
                      <Paperclip size={17} aria-hidden="true" />
                      <span>Attach</span>
                    </button>
                    {showPlaudAction ? (
                      <button type="button" role="menuitem" onClick={() => runMoreAction(onStartPlaudUpload)}>
                        <FileAudio size={17} aria-hidden="true" />
                        <span>Audio</span>
                      </button>
                    ) : null}
                    <button type="button" role="menuitem" onClick={() => runMoreAction(onReadback)}>
                      <Volume2 size={17} aria-hidden="true" />
                      <span>Readback</span>
                    </button>
                    {onToggleVoiceReplies ? (
                      <button
                        type="button"
                        role="menuitemcheckbox"
                        aria-checked={voiceReplyEnabled}
                        onClick={() => runMoreAction(onToggleVoiceReplies)}
                      >
                        <Volume2 size={17} aria-hidden="true" />
                        <span>{voiceReplyEnabled ? 'Voice replies on' : 'Voice replies off'}</span>
                      </button>
                    ) : null}
                    {workoutLoggerRoute ? (
                      <Link role="menuitem" to={workoutLoggerRoute} aria-label={workoutLoggerAriaLabel} onClick={() => setMoreOpen(false)}>
                        <Dumbbell size={17} aria-hidden="true" />
                        <span>{workoutLoggerLabel}</span>
                      </Link>
                    ) : null}
                    {workoutPlannerRoute ? (
                      <Link role="menuitem" to={workoutPlannerRoute} aria-label={workoutPlannerAriaLabel} onClick={() => setMoreOpen(false)}>
                        <ClipboardList size={17} aria-hidden="true" />
                        <span>{workoutPlannerLabel}</span>
                      </Link>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                className={`dock-mic ${voiceActive ? 'is-listening' : ''}`}
                aria-pressed={voiceActive}
                disabled={!voiceSupported}
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
      {voiceOverlay?.isOpen ? (
        <VoiceRecordingOverlay
          isOpen={voiceOverlay.isOpen}
          onClose={voiceOverlay.onClose}
          onEditTranscript={voiceOverlay.onEditTranscript}
          onTranscribed={voiceOverlay.onTranscribed}
        />
      ) : null}
    </>
  );
};

export default CoachConsoleDock;
