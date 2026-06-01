import React from 'react';
import { FileAudio, Mic, Paperclip, ShieldCheck, Volume2 } from 'lucide-react';

import type { DrawerSide } from './CoachCommandCenter.types';

type CoachCommandComposerProps = {
  commandFormRef: React.RefObject<HTMLFormElement>;
  commandText: string;
  commandTextRef: React.RefObject<HTMLTextAreaElement>;
  drawer: DrawerSide | null;
  selectedStatus: string;
  voiceActive: boolean;
  voiceSupported?: boolean;
  onAttach: () => void;
  onCommandTextChange: (value: string) => void;
  onOpenDrawer: (side: DrawerSide, event: React.MouseEvent<HTMLButtonElement>) => void;
  onReadback: () => void;
  onStartPlaudUpload: () => void;
  onSubmit: (event: React.FormEvent) => void;
  onVoice: () => void;
};

const CoachCommandComposer: React.FC<CoachCommandComposerProps> = ({
  commandFormRef,
  commandText,
  commandTextRef,
  drawer,
  selectedStatus,
  voiceActive,
  voiceSupported = true,
  onAttach,
  onCommandTextChange,
  onOpenDrawer,
  onReadback,
  onStartPlaudUpload,
  onSubmit,
  onVoice,
}) => (
  <form
    className="composer command-dock"
    ref={commandFormRef}
    onSubmit={onSubmit}
    aria-label="Swan Coach command composer"
  >
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
    <div className="composer-header">
      <div className="composer-heading">
        <span className="mini-chip gold">recorder intake</span>
        <strong>Upload saved PLAUD clips into Swan Coach</strong>
        <span>Starts the existing upload, merge, and approval workflow.</span>
      </div>
      <button type="button" className="primary-button plaud-start-button" onClick={onStartPlaudUpload}>
        <FileAudio size={17} aria-hidden="true" />
        <span>Start PLAUD Upload</span>
      </button>
    </div>
    <textarea
      ref={commandTextRef}
      value={commandText}
      onChange={(event) => onCommandTextChange(event.target.value)}
      placeholder="Ask Swan Coach, paste notes, or attach audio/transcript..."
      aria-describedby="composerStatus"
    />
    <div className="composer-actions">
      <button type="button" className="secondary-button" onClick={onAttach}>
        <Paperclip size={16} aria-hidden="true" />
        <span className="desktop-label">Attach</span>
        <span className="mobile-label">Attach</span>
      </button>
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
      <button type="button" className="secondary-button" onClick={onReadback}>
        <Volume2 size={16} aria-hidden="true" />
        <span>Readback</span>
      </button>
      <button type="submit" className="primary-button">
        <ShieldCheck size={16} aria-hidden="true" />
        <span>Prepare</span>
      </button>
    </div>
    <span id="composerStatus" className="panel-subtitle">
      {selectedStatus}
    </span>
  </form>
);

export default CoachCommandComposer;
