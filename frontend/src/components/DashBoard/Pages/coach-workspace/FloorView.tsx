/**
 * Blueprint: FloorView (Floor mode)
 * Parent: CoachWorkspacePage, when the header view is "Floor" — one click from
 * Chat or Today. It decides WHOSE session this is (the client pinned by ID, or
 * the signed-in client), then mounts FloorLive keyed by that id: a client switch
 * is a fresh session with that client's own plan and stored sets, never a carry-
 * over of the previous client's list. No one pinned → a "who are you training?"
 * screen that keeps the composer (the @ chip pins a client).
 */
import React from 'react';
import { FloorRoot } from './CoachWorkspace.floor.styles';
import WorkspaceComposer from './WorkspaceComposer';
import FloorLive from './FloorLive';
import type { CoachWorkspaceModel } from './useCoachWorkspaceModel';

type Props = { model: CoachWorkspaceModel };

const FloorView: React.FC<Props> = ({ model }) => {
  const { controller, isClientMode } = model;
  const clientId = isClientMode ? (Number(model.user?.id) || null) : (controller.clientPin.selectedClientId ?? null);
  const who = isClientMode ? 'My session' : model.scopeLabel;

  if (!clientId) {
    return (
      <FloorRoot aria-label="Floor mode">
        <div className="ws-floor-pick">
          <h1>Who are you training?</h1>
          <p>Pick the client with the @ chip, or start their session from Today. Floor mode logs their sets.</p>
          <button type="button" className="ws-floor-btn" onClick={() => model.showView('today')}>Open Today</button>
        </div>
        <WorkspaceComposer model={model} />
      </FloorRoot>
    );
  }

  return (
    <FloorRoot aria-label={`Floor mode — ${who}`}>
      <FloorLive key={clientId} model={model} clientId={clientId} who={who} />
    </FloorRoot>
  );
};

export default FloorView;
