/**
 * ============================================================================
 * FILE: AdminWaiversTable.tsx
 * PURPOSE: Waiver record list — 8-column table on desktop, stacked cards on
 *          phones.
 * AUTHOR: Claude Sonnet 4.6 | LAST MODIFIED: 2026-08-05
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Renders one row per waiver record (Name, Contact,
 * Status, Source, Signed, Matches, Linked User, View).
 *
 * RESPONSIVE CONTRACT: below 768px `adminWaivers.styles.table.ts` re-flows
 * this same DOM into one card per record. Each data cell therefore carries a
 * `data-label`, which the stylesheet renders as the field label via
 * `content: attr(data-label)`. A cell without a `data-label` (the action cell)
 * renders label-less and full-width. If you add a column, add its label here
 * or it will appear unlabelled on phones.
 */

import React from 'react';
import type { WaiverRecordSummary } from './adminWaivers.types';
import {
  Table, TableScroller, Th, Td, Tr, StatusBadge, ActionButton, EmptyState,
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
    <TableScroller tabIndex={0} role="region" aria-label="Waiver records table">
    <Table>
      {/* Hidden on phones by the stylesheet; the per-cell data-label
          pseudo-elements carry the same headers there. */}
      <thead>
        <tr>
          <Th scope="col">Name</Th>
          <Th scope="col">Contact</Th>
          <Th scope="col">Status</Th>
          <Th scope="col">Source</Th>
          <Th scope="col">Signed</Th>
          <Th scope="col">Matches</Th>
          <Th scope="col">Linked User</Th>
          {/* Intentionally text-free (matches the original design); the
              accessible name comes from aria-label, not visible copy. */}
          <Th scope="col" aria-label="Actions" />
        </tr>
      </thead>
      <tbody>
        {records.map((r) => (
          <Tr key={r.id}>
            <Td data-label="Name">{r.fullName}</Td>
            <Td data-label="Contact">{r.email || r.phone || '—'}</Td>
            <Td data-label="Status">
              <StatusBadge $status={r.status}>{r.status.replace('_', ' ')}</StatusBadge>
            </Td>
            <Td data-label="Source">{r.source.replace('_', ' ')}</Td>
            <Td data-label="Signed">{formatDate(r.signedAt)}</Td>
            <Td data-label="Matches">{r.pendingMatches?.length || 0}</Td>
            <Td data-label="Linked User">
              {r.user
                ? `${r.user.firstName} ${r.user.lastName}`
                : '—'}
            </Td>
            <Td>
              <ActionButton
                $variant="view"
                onClick={() => onView(r)}
                aria-label={`View waiver record for ${r.fullName}`}
              >
                View
              </ActionButton>
            </Td>
          </Tr>
        ))}
      </tbody>
    </Table>
    </TableScroller>
  );
};

export default AdminWaiversTable;
