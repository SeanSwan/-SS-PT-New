import React from 'react';
import { RefreshCw } from 'lucide-react';

import type { CommandLogConfirmation, CommandLogEntry } from './CoachCommandCenter.data';
import CoachCommandLogEntry from './CoachCommandLogEntry';

type CoachCommandLogPanelProps = {
  logs: CommandLogEntry[];
  onCancelCommand?: (confirmation: CommandLogConfirmation) => Promise<void>;
  onConfirmCommand?: (confirmation: CommandLogConfirmation) => Promise<{ success: boolean; error?: string }>;
  onReset: () => void;
};

const CoachCommandLogPanel: React.FC<CoachCommandLogPanelProps> = ({
  logs,
  onCancelCommand,
  onConfirmCommand,
  onReset,
}) => (
  <section className="log-card command-log-primary">
    <div className="log-top">
      <div>
        <h2 className="panel-title">Command log</h2>
        <p className="panel-subtitle">Prepared recommendations, readbacks, attachments, and approval holds.</p>
      </div>
      <button type="button" className="ghost-button" onClick={onReset}>
        <RefreshCw size={16} aria-hidden="true" />
        Reset
      </button>
    </div>
    <div className="log-stream" aria-live="polite">
      {logs.map((entry) => (
        <CoachCommandLogEntry
          entry={entry}
          key={entry.id}
          onCancelCommand={onCancelCommand}
          onConfirmCommand={onConfirmCommand}
        />
      ))}
    </div>
  </section>
);

export default CoachCommandLogPanel;
