/**
 * COMPONENT: CoachDockMoreMenu
 * PARENT: CoachConsoleDock
 * PURPOSE: The dock's "More" disclosure — logger, planner, audio import,
 *          attach, readback, and the voice-reply toggle.
 *
 * Split out of CoachConsoleDock to keep that file inside the project's
 * 300-line section cap once the inline dictation strip was added to it.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ClipboardList, Dumbbell, FileAudio, MoreHorizontal, Paperclip, Volume2 } from 'lucide-react';

export interface CoachDockMoreMenuProps {
  advancedOpen: boolean;
  menuId: string;
  moreButtonRef: React.RefObject<HTMLButtonElement>;
  moreOpen: boolean;
  onAttach: () => void;
  /** Collapse without moving focus — used after running a menu action. */
  onDismiss: () => void;
  /** Collapse and return focus to the trigger — used for Escape. */
  onDismissAndRefocus: () => void;
  onReadback: () => void;
  onStartPlaudUpload: () => void;
  onToggleAdvanced: () => void;
  onToggleMenu: () => void;
  onToggleVoiceReplies?: () => void;
  showPlaudAction: boolean;
  voiceReplyEnabled: boolean;
  workoutLoggerAriaLabel: string;
  workoutLoggerLabel: string;
  workoutLoggerRoute?: string | null;
  workoutPlannerAriaLabel: string;
  workoutPlannerLabel: string;
  workoutPlannerRoute?: string | null;
}

const CoachDockMoreMenu: React.FC<CoachDockMoreMenuProps> = ({
  advancedOpen,
  menuId,
  moreButtonRef,
  moreOpen,
  onAttach,
  onDismiss,
  onDismissAndRefocus,
  onReadback,
  onStartPlaudUpload,
  onToggleAdvanced,
  onToggleMenu,
  onToggleVoiceReplies,
  showPlaudAction,
  voiceReplyEnabled,
  workoutLoggerAriaLabel,
  workoutLoggerLabel,
  workoutLoggerRoute,
  workoutPlannerAriaLabel,
  workoutPlannerLabel,
  workoutPlannerRoute,
}) => {
  const runAction = (action: () => void) => {
    onDismiss();
    action();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    onDismissAndRefocus();
  };

  return (
    <div className="dock-more-wrap">
      <button
        ref={moreButtonRef}
        type="button"
        className="dock-more"
        aria-controls={menuId}
        aria-expanded={moreOpen}
        aria-haspopup="menu"
        aria-label="More command tools"
        onClick={onToggleMenu}
      >
        <MoreHorizontal size={20} aria-hidden="true" />
      </button>
      {moreOpen ? (
        <div className="dock-more-menu" id={menuId} role="menu" tabIndex={-1} aria-label="More command tools" onKeyDown={handleKeyDown}>
          {workoutLoggerRoute ? (
            <Link role="menuitem" to={workoutLoggerRoute} aria-label={workoutLoggerAriaLabel} onClick={onDismiss}>
              <Dumbbell size={17} aria-hidden="true" />
              <span>{workoutLoggerLabel}</span>
            </Link>
          ) : null}
          {workoutPlannerRoute ? (
            <Link role="menuitem" to={workoutPlannerRoute} aria-label={workoutPlannerAriaLabel} onClick={onDismiss}>
              <ClipboardList size={17} aria-hidden="true" />
              <span>{workoutPlannerLabel}</span>
            </Link>
          ) : null}
          {showPlaudAction ? (
            <button type="button" role="menuitem" onClick={() => runAction(onStartPlaudUpload)}>
              <FileAudio size={17} aria-hidden="true" />
              <span>Audio</span>
            </button>
          ) : null}
          <button
            type="button"
            role="menuitem"
            aria-controls={`${menuId}-advanced`}
            aria-expanded={advancedOpen}
            aria-label="Show advanced coach tools"
            onClick={onToggleAdvanced}
          >
            <ChevronDown size={17} aria-hidden="true" />
            <span>Advanced tools</span>
          </button>
          {advancedOpen ? (
            <div className="dock-advanced-tools" id={`${menuId}-advanced`} role="group" aria-label="Advanced coach tools">
              <button type="button" role="menuitem" onClick={() => runAction(onAttach)}>
                <Paperclip size={17} aria-hidden="true" />
                <span>Attach</span>
              </button>
              <button type="button" role="menuitem" onClick={() => runAction(onReadback)}>
                <Volume2 size={17} aria-hidden="true" />
                <span>Readback</span>
              </button>
              {onToggleVoiceReplies ? (
                <button
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={voiceReplyEnabled}
                  onClick={() => runAction(onToggleVoiceReplies)}
                >
                  <Volume2 size={17} aria-hidden="true" />
                  <span>{voiceReplyEnabled ? 'Voice replies on' : 'Voice replies off'}</span>
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default CoachDockMoreMenu;
