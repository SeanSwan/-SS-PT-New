/**
 * ChartExpandDataTable
 * ====================
 * The screen-reader-accessible tabular alternative inside the chart expand
 * modal (Phase 2.2a): a semantic <table> over the same drill-down rows the
 * chart visualizes — honest data, no fabrication, capped for sanity.
 */
import React from 'react';
import type { ProgressChartDrilldownRow } from './progressChartActions';
import { DataTable, TableWrap } from './ChartExpandModal.styles';

const MAX_ROWS = 60;

const ChartExpandDataTable: React.FC<{ title: string; rows: ProgressChartDrilldownRow[] }> = ({ title, rows }) => {
  if (!rows || rows.length === 0) return null;
  const visible = rows.slice(0, MAX_ROWS);
  const hasDetail = visible.some((row) => Boolean(row.detail));
  return (
    <TableWrap>
      <DataTable>
        <caption>{title} data table</caption>
        <thead>
          <tr>
            <th scope="col">Label</th>
            <th scope="col">Value</th>
            {hasDetail && <th scope="col">Detail</th>}
          </tr>
        </thead>
        <tbody>
          {visible.map((row) => (
            <tr key={row.id}>
              <td>{row.label}</td>
              <td>{row.value}</td>
              {hasDetail && <td>{row.detail ?? ''}</td>}
            </tr>
          ))}
        </tbody>
      </DataTable>
    </TableWrap>
  );
};

export default ChartExpandDataTable;
