/**
 * COMPONENT: CoachCommandComposerParts
 * PURPOSE: Small presentational parts for the Swan Coach command composer.
 * FLOW: CoachCommandComposer owns the form; these helpers render low-branch controls.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileAudio, Mic, Paperclip, Sparkles, Volume2 } from 'lucide-react';
import type { DrawerSide } from './CoachCommandCenter.types';

type MobileCommandStripProps = {
  drawer: DrawerSide | null;
  selectedStatus: string;
  onOpenDrawer: (side: DrawerSide, event: React.MouseEvent<HTMLButtonElement>) => void;
};

type ComposerHeaderProps = {
  onStartPlaudUpload: () => void;
};

type WorkflowReturnLinkProps = {
  workflowReturnLabel?: string | null;
  workflowReturnTo?: string | null;
};

type ComposerActionsProps = {
  voiceActive: boolean;
  voiceSupported: boolean;
  onAttach: () => void;
  onReadback: () => void;
  onVoice: () => void;
};

export function MobileCommandStrip({ drawer, selectedStatus, onOpenDrawer }: MobileCommandStripProps) {
  return (
    <div className="mobile-command-strip">
      <button
        type="button"
        aria-controls="coach-command-threads"
        aria-expanded={drawer === 'left'}
        onClick={(event) => onOpenDrawer('left', event)}
      >
        Threads
      </button>
      <span className="mobile-command-client">{selectedStatus}</span>
      <button
        type="button"
        aria-controls="coach-command-ops"
        aria-expanded={drawer === 'right'}
        onClick={(event) => onOpenDrawer('right', event)}
      >
        Ops
      </button>
    </div>
  );
}

export function ComposerHeader({ onStartPlaudUpload }: ComposerHeaderProps) {
  return (
    <div className="composer-header command-first-header">
      <div className="composer-heading">
        <span className="mini-chip gold">Command input</span>
        <strong>One reviewed instruction at a time</strong>
        <span>Swan Coach prepares the next safe step, then waits for operator approval.</span>
      </div>
      <button type="button" className="secondary-button plaud-start-button" onClick={onStartPlaudUpload}>
        <FileAudio size={17} aria-hidden="true" />
        <span>Import PLAUD</span>
      </button>
    </div>
  );
}

export function WorkflowReturnLink({ workflowReturnLabel, workflowReturnTo }: WorkflowReturnLinkProps) {
  if (!workflowReturnTo || !workflowReturnLabel) return null;
  return (
    <Link className="secondary-button workflow-return-link" to={workflowReturnTo}>
      <ArrowLeft size={16} aria-hidden="true" />
      <span>{workflowReturnLabel}</span>
    </Link>
  );
}

function VoiceButton({ voiceActive, voiceSupported, onVoice }: Pick<ComposerActionsProps, 'voiceActive' | 'voiceSupported' | 'onVoice'>) {
  return (
    <button
      type="button"
      className={`secondary-button ${voiceActive ? 'is-listening' : ''}`}
      aria-pressed={voiceActive}
      disabled={!voiceSupported}
      onClick={onVoice}
      title={voiceSupported ? 'Start voice dictation' : 'Voice dictation is not available in this browser'}
    >
      <Mic size={16} aria-hidden="true" />
      <span className="desktop-label">{voiceActive ? 'Listening' : 'Mic'}</span>
      <span className="mobile-label">Mic</span>
    </button>
  );
}

export function ComposerActions({ voiceActive, voiceSupported, onAttach, onReadback, onVoice }: ComposerActionsProps) {
  return (
    <div className="composer-actions">
      <button type="button" className="secondary-button" onClick={onAttach}>
        <Paperclip size={16} aria-hidden="true" />
        <span className="desktop-label">Attach</span>
        <span className="mobile-label">Attach</span>
      </button>
      <VoiceButton voiceActive={voiceActive} voiceSupported={voiceSupported} onVoice={onVoice} />
      <button type="button" className="secondary-button" onClick={onReadback}>
        <Volume2 size={16} aria-hidden="true" />
        <span>Readback</span>
      </button>
      <button type="submit" className="primary-button">
        <Sparkles size={16} aria-hidden="true" />
        <span>Prepare review</span>
      </button>
    </div>
  );
}
