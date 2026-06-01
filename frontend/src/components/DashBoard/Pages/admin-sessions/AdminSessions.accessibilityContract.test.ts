import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pageSource = readFileSync(resolve(__dirname, './enhanced-admin-sessions-view.tsx'), 'utf8');
const filtersPanelSource = readFileSync(resolve(__dirname, './AdminSessionsFiltersPanel.tsx'), 'utf8');
const tablePanelSource = readFileSync(resolve(__dirname, './AdminSessionsTablePanel.tsx'), 'utf8');
const tableRowSource = readFileSync(resolve(__dirname, './AdminSessionsTableRow.tsx'), 'utf8');
const tableBaseStylesSource = readFileSync(resolve(__dirname, './AdminSessionsTableBase.styles.ts'), 'utf8');
const tableStylesSource = readFileSync(resolve(__dirname, './AdminSessionsTable.styles.ts'), 'utf8');

describe('Admin sessions accessibility contract', () => {
  it('keeps table sorting keyboard reachable with semantic header cells', () => {
    expect(tableBaseStylesSource).toContain('export const StyledTableHeadCell = styled.th');
    expect(tableStylesSource).toMatch(/export const SortableHeaderCell[\s\S]*&:focus-visible/);
    expect(pageSource).toContain('const handleSortHeaderKeyDown = (event: React.KeyboardEvent, key: SortKey) =>');
    expect(pageSource).toContain('const getSortHeaderProps = (key: SortKey): React.ThHTMLAttributes<HTMLTableCellElement> =>');
    expect(pageSource).toContain("'aria-sort': getSortAriaState(key)");
    expect(pageSource).toContain('getSortHeaderProps={getSortHeaderProps}');
    expect(tablePanelSource).toContain('{...getSortHeaderProps(key)}');
  });

  it('names icon-only actions and exposes active filter state', () => {
    expect(filtersPanelSource).toContain('aria-pressed={statusFilter === status}');
    expect(filtersPanelSource).toContain('aria-label={`Filter sessions by ${getStatusFilterLabel(status)}`}');
    expect(tableRowSource).toContain('aria-label="View session details"');
    expect(tableRowSource).toContain('aria-label="Edit session"');
    expect(tableRowSource).toContain('aria-label="Delete session"');
  });
});
