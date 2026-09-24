/**
 * Blueprint: FloorView (Floor mode)
 * Parent: CoachWorkspacePage, when the header view is "Floor" — one click from
 * Chat or Today. It decides WHOSE session this is (the client pinned by ID, or
 * the signed-in client), then mounts FloorLive keyed by that id: a client switch
 * is a fresh session with that client's own plan and stored sets, never a carry-
 * over of the previous client's list. No one pinned → a "who are you training?"
 * screen that keeps the composer (the @ chip pins a client).
 *
 * Admission first: FloorLive (which reads this device's stored sets) mounts only
 * after the SAME selection admission the chat uses has accepted that client.
 * While it is checking, or when access is refused, nothing stored is shown and
 * no save control exists — the drafts wait in storage for access to return.
 */
import React from 'react';
import { FloorRoot } from './CoachWorkspace.floor.styles';
import WorkspaceComposer from './WorkspaceComposer';
import FloorLive from './FloorLive';
import { floorAccess, localDateISO } from './floorSession';
import type { CoachWorkspaceModel } from './useCoachWorkspaceModel';

type Props = { model: CoachWorkspaceModel };

const FloorView: React.FC<Props> = ({ model }) => {
  const { controller, isClientMode } = model;
  const clientId = isClientMode ? (Number(model.user?.id) || null) : (controller.clientPin.selectedClientId ?? null);
  const who = isClientMode ? 'My session' : model.scopeLabel;
  const access = floorAccess({
    clientMode: isClientMode, clientId,
    phase: controller.selectionPhase, acceptedTargetUserId: controller.selection?.accepted?.targetUserId ?? null,
  });

  if (!clientId || access !== 'open') {
    return (
      <FloorRoot aria-label="Floor mode">
        <div className="ws-floor-pick" role={clientId && access === 'checking' ? 'status' : undefined}>
          {!clientId ? (
            <>
              <h1>Who are you training?</h1>
              <p>Pick the client with the @ chip, or start their session from Today. Floor mode logs their sets.</p>
            </>
          ) : access === 'checking' ? (
            <>
              <h1>Checking access…</h1>
              <p>Floor opens once this client is confirmed. Nothing saved on this device is shown until then.</p>
            </>
          ) : (
            <>
              <h1>Floor is closed for this client</h1>
              <p>Access to this client was not confirmed, so their sets on this device stay hidden and nothing can be saved. Pick another client with @, or check their access.</p>
            </>
          )}
          <button type="button" className="ws-floor-btn" onClick={() => model.showView('today')}>Open Today</button>
        </div>
        <WorkspaceComposer model={model} />
      </FloorRoot>
    );
  }

  // Today only offers today's bookings; one from another day is stale and never reaches the save.
  const offered = model.floorLink && model.floorLink.clientId === clientId ? model.floorLink.link : null;
  const link = offered && offered.date === localDateISO() ? offered : null;
  return (
    <FloorRoot aria-label={`Floor mode — ${who}`}>
      <FloorLive key={clientId} model={model} clientId={clientId} who={who} link={link} />
    </FloorRoot>
  );
};

export default FloorView;
