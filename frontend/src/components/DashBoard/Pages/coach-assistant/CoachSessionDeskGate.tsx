/**
 * FILE: CoachSessionDeskGate.tsx
 * PURPOSE: Feature-gate wrapper for the Session Desk. The desk mounts only while the
 *          page has verified the actor is staff (trainer/admin) and the capability is
 *          enabled; otherwise the legacy ChatTranscript remains the only surface.
 *
 *          Wraps the desk in CoachSurfaceProvider so the desk can derive its surface
 *          identity (route/surface token + shell generation) without a second draft store.
 */
import React from 'react';
import CoachSessionDesk, { type CoachSessionDeskProps } from './CoachSessionDesk';
import { CoachSurfaceProvider } from './useCoachSurfaceContext';

interface CoachSessionDeskGateProps extends CoachSessionDeskProps {
  /** Page-verified: actor is staff and the desk capability is enabled. */
  enabled: boolean;
  routeKey?: string;
  surfaceKey?: string;
  targetUserId?: number | null;
}

const CoachSessionDeskGate: React.FC<CoachSessionDeskGateProps> = ({
  enabled,
  routeKey = 'coach-assistant',
  surfaceKey = 'coach-session-desk',
  targetUserId = null,
  onOpenLogger,
  ...deskProps
}) => {
  if (!enabled) return null;
  return (
    <CoachSurfaceProvider routeKey={routeKey} surfaceKey={surfaceKey} targetUserId={targetUserId}>
      <CoachSessionDesk {...deskProps} onOpenLogger={onOpenLogger} />
    </CoachSurfaceProvider>
  );
};

export default CoachSessionDeskGate;
