/**
 * AlertArchiveView — the "Archived" tab of the Business Intelligence Alerts
 * widget (SWA-138 S14). Renders from the snapshot captured at archive time, so
 * an entry stays readable even when its source alert is no longer emitted.
 * Nothing here destroys data; Restore puts an entry back on the active list.
 */
import React from 'react';
import {
  ArchiveBody, ArchiveMeta, ArchiveRow, ArchiveTitle, RestoreButton,
} from './ContactNotifications.controls.styles';
import { EmptyCheckIcon, EmptyState, NotificationsList } from './ContactNotifications.styles';
import type { ArchivedAlert } from './ContactNotifications.alertState';

interface AlertArchiveViewProps {
  entries: ArchivedAlert[];
  onRestore: (entry: ArchivedAlert) => void;
}

const AlertArchiveView: React.FC<AlertArchiveViewProps> = ({ entries, onRestore }) => (
  <NotificationsList>
    {entries.length === 0 ? (
      <EmptyState>
        <EmptyCheckIcon size={48} />
        <div>Nothing archived yet.</div>
      </EmptyState>
    ) : (
      entries.map((entry) => (
        <ArchiveRow key={`${entry.refType}:${entry.refId}`}>
          <ArchiveBody>
            <ArchiveTitle>{entry.snapshot?.title || 'Archived alert'}</ArchiveTitle>
            <ArchiveMeta>
              {entry.snapshot?.message || `${entry.refType} #${entry.refId}`}
            </ArchiveMeta>
            <ArchiveMeta>Archived {new Date(entry.archivedAt).toLocaleString()}</ArchiveMeta>
          </ArchiveBody>
          <RestoreButton
            type="button"
            onClick={() => onRestore(entry)}
            aria-label={`Restore ${entry.snapshot?.title || 'this alert'} to the active list`}
          >
            Restore
          </RestoreButton>
        </ArchiveRow>
      ))
    )}
  </NotificationsList>
);

export default AlertArchiveView;
