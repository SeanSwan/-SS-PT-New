import React from 'react';

import {
  ComposerActions,
  ComposerHeader,
  MobileCommandStrip,
  WorkflowReturnLink,
} from './CoachCommandComposerParts';
import type { DrawerSide } from './CoachCommandCenter.types';

type CoachCommandComposerProps = {
  commandFormRef: React.RefObject<HTMLFormElement>;
  commandText: string;
  commandTextRef: React.RefObject<HTMLTextAreaElement>;
  drawer: DrawerSide | null;
  selectedStatus: string;
  voiceActive: boolean;
  voiceSupported?: boolean;
  workflowReturnLabel?: string | null;
  workflowReturnTo?: string | null;
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
  workflowReturnLabel,
  workflowReturnTo,
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
    <MobileCommandStrip drawer={drawer} selectedStatus={selectedStatus} onOpenDrawer={onOpenDrawer} />
    <ComposerHeader onStartPlaudUpload={onStartPlaudUpload} />
    <WorkflowReturnLink workflowReturnLabel={workflowReturnLabel} workflowReturnTo={workflowReturnTo} />
    <textarea
      ref={commandTextRef}
      value={commandText}
      onChange={(event) => onCommandTextChange(event.target.value)}
      placeholder="Ask Swan Coach, paste notes, or attach audio/transcript..."
      aria-describedby="composerStatus"
    />
    <ComposerActions
      voiceActive={voiceActive}
      voiceSupported={voiceSupported}
      onAttach={onAttach}
      onReadback={onReadback}
      onVoice={onVoice}
    />
    <span id="composerStatus" className="panel-subtitle">
      {selectedStatus}
    </span>
  </form>
);

export default CoachCommandComposer;
