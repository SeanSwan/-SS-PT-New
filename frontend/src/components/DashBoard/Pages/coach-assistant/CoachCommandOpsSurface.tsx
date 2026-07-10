/**
 * COMPONENT: CoachCommandOpsSurface
 * SURFACE: Coach Command Center operations rail and modal drawer layer.
 * PRIMARY JOB: Keep desktop operations inline while portaling open drawers above global chrome.
 * ACCESSIBILITY: The portal preserves the modal scrim, focus trap, and trigger restoration contract.
 */
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { CommandBridgeShell } from './CoachCommandCenter.bridgeStyles';
import CoachCommandOpsRail from './CoachCommandOpsRail';

type CoachCommandOpsSurfaceProps = React.ComponentProps<typeof CoachCommandOpsRail>;
const DRAWER_MEDIA_QUERY = '(max-width: 1279px)';

const CoachCommandOpsSurface: React.FC<CoachCommandOpsSurfaceProps> = (props) => {
  const [drawerViewport, setDrawerViewport] = useState(
    () => typeof window.matchMedia === 'function' && window.matchMedia(DRAWER_MEDIA_QUERY).matches,
  );
  const rail = <CoachCommandOpsRail {...props} />;

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const mediaQuery = window.matchMedia(DRAWER_MEDIA_QUERY);
    const syncViewport = () => setDrawerViewport(mediaQuery.matches);
    syncViewport();
    mediaQuery.addEventListener('change', syncViewport);
    return () => mediaQuery.removeEventListener('change', syncViewport);
  }, []);

  if (props.drawer !== 'right' || !drawerViewport || typeof document === 'undefined') return rail;

  return createPortal(
    <CommandBridgeShell>
      <button
        type="button"
        className="drawer-scrim is-open"
        aria-label="Close operator tools"
        onClick={props.onClose}
      />
      {rail}
    </CommandBridgeShell>,
    document.body,
  );
};

export default CoachCommandOpsSurface;
