/**
 * Dashboards v2 — DataTable (KIMI-DASHBOARDS §2.4). Session rows; collapses to card rows on hand/lap
 * (via [data-viewport] on <html>). Masked refs only (server-side). EmptyState when no rows.
 */
import styled from 'styled-components';
import type { SessionRow } from '../types';
import { EmptyState, type EmptyStateProps } from './EmptyState';

export interface DataTableProps {
  columns: { key: keyof SessionRow | 'ref'; label: string; width: string }[];
  rows: SessionRow[];
  emptyState: EmptyStateProps;
}

const STATUS_TONE: Record<SessionRow['status'], string> = {
  upcoming: 'var(--dash-ink-2)',
  active: 'var(--dash-accent)',
  done: 'var(--dash-good)',
  missed: 'var(--dash-bad)',
};

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  color: var(--dash-ink);
  th {
    text-align: left;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--dash-ink-2);
    padding: 8px 10px;
    border-bottom: 1px solid var(--dash-line);
  }
  td {
    padding: 10px;
    border-bottom: 1px solid var(--dash-line);
    min-height: var(--dash-target, 44px);
  }
  /* hand/lap → card rows (the lens owns the cut) */
  :root[data-viewport='hand'] &,
  :root[data-viewport='lap'] & {
    thead {
      display: none;
    }
    tr {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2px 12px;
      padding: 8px 0;
      border-bottom: 1px solid var(--dash-line);
    }
    td {
      border: 0;
      padding: 4px 0;
    }
  }
`;
const Chip = styled.span<{ $tone: string }>`
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  color: ${(p) => p.$tone};
  border: 1px solid currentColor;
`;

const cell = (row: SessionRow, key: DataTableProps['columns'][number]['key']): string => {
  if (key === 'ref') return row.clientRef;
  return String(row[key as keyof SessionRow] ?? '');
};

export function DataTable({ columns, rows, emptyState }: DataTableProps) {
  if (rows.length === 0) return <EmptyState {...emptyState} />;
  return (
    <Table data-testid="dash-table">
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={String(c.key)}>{c.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            {columns.map((c) =>
              c.key === 'status' ? (
                <td key="status">
                  <Chip $tone={STATUS_TONE[row.status]}>{row.status}</Chip>
                </td>
              ) : (
                <td key={String(c.key)}>{cell(row, c.key)}</td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
