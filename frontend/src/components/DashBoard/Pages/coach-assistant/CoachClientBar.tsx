/**
 * COMPONENT: CoachClientBar
 * PURPOSE: Compact Floor Mode header with one persistent, client-safe coaching scope.
 *
 * The main-client selector binds new conversations, notes, and downstream draft
 * requests to one canonical client ID. Existing conversation records are never rebound.
 */
import React from 'react';
import { MoreHorizontal, Plus } from 'lucide-react';
import type { CoachPinnedClientBarProps } from './hooks/useCoachPinnedClient';

type CoachClientBarProps = {
  selectedClientLabel: string;
  opsOpen: boolean;
  showOps?: boolean;
  contextLabel?: string;
  newConversationLabel?: string;
  clientPin?: CoachPinnedClientBarProps;
  /** One-tap rebind chips for the most recently coached clients. */
  recentIds?: number[];
  onNewConversation: () => void;
  onOpenOps: (event: React.MouseEvent<HTMLButtonElement>) => void;
};

const CoachClientBar: React.FC<CoachClientBarProps> = ({
  selectedClientLabel,
  opsOpen,
  showOps = true,
  contextLabel = 'Now coaching',
  newConversationLabel = 'New chat',
  clientPin,
  recentIds,
  onNewConversation,
  onOpenOps,
}) => (
  <header className="client-bar glass">
    <div className="now-coaching" aria-label="Current coach context">
      <span className="now-label">{contextLabel}</span>
      <strong className="client-name">{selectedClientLabel}</strong>
      {showOps && clientPin && recentIds?.length ? (
        <div className="recent-client-chips" aria-label="Recently coached clients">
          {recentIds.map((id) => {
            const label = clientPin.clients.find((client) => client.id === id)?.label || `Client #${id}`;
            return (
              <button type="button" key={id} onClick={() => clientPin.onSelectClient(id)} aria-label={`Coach ${label}`}>
                {label}
              </button>
            );
          })}
        </div>
      ) : null}
      {showOps && clientPin ? (
        <label className="main-client-picker">
          <span>Main client</span>
          <select
            aria-label="Main client"
            value={clientPin.selectedClientId ?? ''}
            disabled={clientPin.loadingClients}
            onChange={(event) => {
              const nextId = Number(event.target.value);
              clientPin.onSelectClient(Number.isSafeInteger(nextId) && nextId > 0 ? nextId : null);
            }}
          >
            <option value="">{clientPin.loadingClients ? 'Loading clients...' : 'No main client'}</option>
            {clientPin.clients.map((client) => (
              <option key={client.id} value={client.id}>{client.label}</option>
            ))}
          </select>
        </label>
      ) : null}
    </div>

    <div className="client-bar-tools">
      <button type="button" className="new-client-button" onClick={onNewConversation} aria-label={newConversationLabel}>
        <Plus size={18} aria-hidden="true" />
        <span>New</span>
      </button>
      {showOps ? (
        <button
          type="button"
          className="ops-button"
          onClick={onOpenOps}
          aria-controls="coach-command-ops"
          aria-haspopup="dialog"
          aria-expanded={opsOpen}
          aria-label="More coach actions"
        >
          <MoreHorizontal size={20} aria-hidden="true" />
          <span>More</span>
        </button>
      ) : null}
    </div>
  </header>
);

export default CoachClientBar;
