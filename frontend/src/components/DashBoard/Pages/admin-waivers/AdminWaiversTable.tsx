import React from 'react';
import type { WaiverRecordSummary } from './adminWaivers.types';
import {
  Table, Th, Td, Tr, StatusBadge, ActionButton, EmptyState,
} from './adminWaivers.styles';

interface Props {
  records: WaiverRecordSummary[];
  onView: (record: WaiverRecordSummary) => void;
}

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch {
    return iso;
  }
};

const AdminWaiversTable: React.FC<Props> = ({ records, onView }) => {
  if (records.length === 0) {
    return <EmptyState>No waiver records found.</EmptyState>;
  }

  return (
    <Table>
      <thead>
        <tr>
          <Th>Name</Th>
          <Th>Contact</Th>
          <Th>Status</Th>
          <Th>Source</Th>
          <Th>Signed</Th>
          <Th>Matches</Th>
          <Th>Linked User</Th>
          <Th />
        </tr>
      </thead>
      <tbody>
        {records.map((r) => (
          <Tr key={r.id}>
            <Td>{r.fullName}</Td>
            <Td>{r.email || r.phone || '—'}</Td>
            <Td><StatusBadge $status={r.status}>{r.status.replace('_', ' ')}</StatusBadge></Td>
            <Td>{r.source.replace('_', ' ')}</Td>
            <Td>{formatDate(r.signedAt)}</Td>
            <Td>{r.pendingMatches?.length || 0}</Td>
            <Td>
              {r.user
                ? `${r.user.firstName} ${r.user.lastName}`
                : '—'}
            </Td>
            <Td>
              <ActionButton $variant="view" onClick={() => onView(r)}>
                View
              </ActionButton>
            </Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  );
};

export default AdminWaiversTable;
