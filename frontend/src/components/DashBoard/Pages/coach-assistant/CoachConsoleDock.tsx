/**
 * COMPONENT: CoachConsoleDock
 * PURPOSE: Bottom command dock for talk-first Swan Coach Floor Mode.
 *
 * The trainer-floor path is intentionally sparse: More, Mic, Send, and a clear
 * confirmation promise. Review intake, audio import, voice-read toggle, logger, and
 * plan tools live behind More so talking stays the primary action.
 */
import React, { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUp,
  ClipboardList,
  Dumbbell,
  FileAudio,
  Inbox,
  Mic,
  MoreHorizontal,
  Volume2,
} from 'lucide-react';
import VoiceRecordingOverlay from './VoiceRecordingOverlay';
import CoachNotebookMenuItems from './CoachNotebookMenuItems';
import CoachVoiceLevelMeter from './CoachVoiceLevelMeter';
import { createMoreMenuKeyDownHandler } from './CoachConsoleDock.menuKeys';
import type { CoachNotebookControls } from './hooks/useCoachClientNotebook';
type VoiceOverlayProps = {
  isOpen: boolean;
  onClose: () => void;
  onEditTranscript?: (text: string) => void;
  onTranscribed: (text: string) => void;
};
type CoachConsoleDockProps = {
  commandBusy?: boolean;
  commandFormRef: React.RefObject<HTMLFormElement>;
  commandText: string;
  commandTextRef: React.RefObject<HTMLTextAreaElement>;
  notebook?: CoachNotebookControls;
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
  onReviewIntake?: () => void;
  onStartPlaudUpload: () => void;
  onSubmit: (event: React.FormEvent) => void;
  onToggleVoiceReplies?: () => void;
  onVoice: () => void;
};
/** Codex-chat-style composer: one row that grows with content, capped so the thread keeps the viewport. */
function autogrowCoachTextarea(el: HTMLTextAreaElement, hasText: boolean) {
  if (!hasText) {
    el.style.height = '';
    return;
  }
  el.style.height = 'auto';
  el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
}

const CoachConsoleDock: React.FC<CoachConsoleDockProps> = ({
  commandBusy = false,
  commandFormRef,
  commandText,
  commandTextRef,
  notebook,
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
  workoutPlannerLabel = 'Workout Planner',
  workoutPlannerAriaLabel = 'Open Workout Planner',
  showPlaudAction = true,
  workflowReturnLabel,
  workflowReturnTo,
  onCommandTextChange,
  onReviewIntake,
  onStartPlaudUpload,
  onSubmit,
  onToggleVoiceReplies,
  onVoice,
}) => {
  const [moreOpen, setMoreOpen] = useState(false);
  useEffect(() => {
    const el = commandTextRef.current;
    if (el) autogrowCoachTextarea(el, Boolean(commandText));
  }, [commandText, commandTextRef]);
  const dockBusy = commandBusy || Boolean(notebook?.saving);
  const sendDisabled = dockBusy || !commandText.trim();
  // Inline dictation only — the recorder path shows its own level-reactive overlay.
  const listeningInline = voiceActive && voiceCaptureMode === 'browser' && !voiceOverlay?.isOpen;
  const menuId = useId();
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
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
  useEffect(() => {
    if (!moreOpen) return;
    Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"], [role="menuitemcheckbox"]') || [])
      .find((item) => !(item instanceof HTMLButtonElement && item.disabled))?.focus();
  }, [moreOpen]);
  useEffect(() => {
    if (!moreOpen) return undefined;
    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setMoreOpen(false);
      moreButtonRef.current?.focus();
    };
    window.addEventListener('keydown', handleWindowKeyDown);
    return () => window.removeEventListener('keydown', handleWindowKeyDown);
  }, [moreOpen]);
  const handleMoreMenuKeyDown = createMoreMenuKeyDownHandler(closeMoreMenu);
  const handleMoreWrapBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    const nextFocus = event.relatedTarget instanceof Node ? event.relatedTarget : null;
    if (!nextFocus || !event.currentTarget.contains(nextFocus)) setMoreOpen(false);
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
        <form
          className={`dock-form ${notebook?.active ? 'is-notebook' : ''} ${listeningInline ? 'is-listening-form' : ''}`}
          ref={commandFormRef}
          onSubmit={dockBusy ? (event) => event.preventDefault() : onSubmit}
          aria-label={notebook?.active ? 'Capture client note' : 'Talk to Swan Coach'}
        >
          <CoachVoiceLevelMeter active={listeningInline} />
          <div className="dock-status-line">
            <span id="coach-dock-status" className="dock-status" role="status">
              {voiceReplySpeaking ? 'Swan Coach is speaking' : selectedStatus}
            </span>
            <span id="coach-dock-trust" className="dock-trust">
              {notebook?.active ? 'Saves to client profile' : 'Confirm before save'}
            </span>
          </div>
          <div className="dock-composer-row">
            <div className="dock-more-wrap" onBlur={handleMoreWrapBlur}>
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
                  <div className="dock-more-menu" id={menuId} ref={menuRef} role="menu" aria-label="More command tools" onKeyDown={handleMoreMenuKeyDown}>
                    {notebook ? <CoachNotebookMenuItems controls={notebook} onSelect={runMoreAction} /> : null}
                    {onReviewIntake ? (
                      <button type="button" role="menuitem" onClick={() => runMoreAction(onReviewIntake)}>
                        <Inbox size={17} aria-hidden="true" />
                        <span>Review intake</span>
                      </button>
                    ) : null}
                    {showPlaudAction ? (
                      <button type="button" role="menuitem" onClick={() => runMoreAction(onStartPlaudUpload)}>
                        <FileAudio size={17} aria-hidden="true" />
                        <span>Import audio</span>
                      </button>
                    ) : null}
                    {onToggleVoiceReplies ? (
                      <button
                        type="button"
                        role="menuitemcheckbox"
                        aria-checked={voiceReplyEnabled}
                        onClick={() => runMoreAction(onToggleVoiceReplies)}
                      >
                        <Volume2 size={17} aria-hidden="true" />
                        <span>{voiceReplyEnabled ? 'Reading replies aloud' : 'Read replies aloud'}</span>
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
              placeholder={notebook?.active ? 'Dictate or type a client note...' : 'Talk or type to Swan Coach...'}
              aria-label={notebook?.active ? 'Client note' : 'Message Swan Coach'}
              aria-describedby="coach-dock-status coach-dock-trust"
              readOnly={Boolean(notebook?.saving)}
              rows={1}
            />
            <button
              type="button"
              className={`dock-mic ${voiceActive ? 'is-listening' : ''}`}
              aria-pressed={voiceActive}
              disabled={!voiceSupported || dockBusy}
              onClick={onVoice}
              title={voiceTitle}
              aria-label={voiceLabel}
            >
              <Mic size={22} aria-hidden="true" />
            </button>
            <button
              type="submit"
              className="dock-send"
              disabled={sendDisabled}
              aria-label={notebook?.active ? (notebook.saving ? 'Saving client note' : 'Save client note') : (commandBusy ? 'Sending to Swan Coach' : 'Send to Swan Coach')}
            >
              <ArrowUp size={22} aria-hidden="true" />
            </button>
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
