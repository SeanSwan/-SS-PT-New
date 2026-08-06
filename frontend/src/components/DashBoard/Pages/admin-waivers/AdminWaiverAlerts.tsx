/**
 * ============================================================================
 * FILE: AdminWaiverAlerts.tsx
 * PURPOSE: Renders the admin waiver surface's dismissible feedback banners.
 * AUTHOR: Claude Opus 5 | LAST MODIFIED: 2026-08-05
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Presentational only — takes the alert list produced by
 * `useAdminWaiverFeedback` and paints it above the waiver list. Failure
 * banners stay until the admin dismisses them.
 *
 * A11Y: the region is rendered unconditionally (collapsed via `:empty` when
 * there is nothing to show) so it is a STABLE assertive live region. Screen
 * readers announce nodes inserted into an existing live region reliably;
 * inserting the live region itself is not reliable. Banners are therefore
 * plain nodes — adding `role="alert"` on top would double-announce. Each
 * carries a 44px dismiss control.
 */

import React from 'react';
import { AlertTriangle, CheckCircle, X } from 'lucide-react';
import type { WaiverAlert } from './useAdminWaiverFeedback';
import {
  AlertRegion, AlertBanner, AlertIcon, AlertBody, AlertTitle, AlertMessage, AlertDismiss,
} from './adminWaivers.styles';

interface Props {
  alerts: WaiverAlert[];
  onDismiss: (id: string) => void;
}

const AdminWaiverAlerts: React.FC<Props> = ({ alerts, onDismiss }) => (
  <AlertRegion aria-live="assertive" aria-atomic="false">
    {alerts.map((alert) => (
      <AlertBanner key={alert.id} $tone={alert.tone}>
        <AlertIcon $tone={alert.tone} aria-hidden="true">
          {alert.tone === 'error' ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
        </AlertIcon>
        <AlertBody>
          <AlertTitle>{alert.title}</AlertTitle>
          <AlertMessage>{alert.message}</AlertMessage>
        </AlertBody>
        <AlertDismiss
          type="button"
          onClick={() => onDismiss(alert.id)}
          aria-label={`Dismiss: ${alert.title}`}
        >
          <X size={16} />
        </AlertDismiss>
      </AlertBanner>
    ))}
  </AlertRegion>
);

export default AdminWaiverAlerts;
