export interface RecurringTimeRow {
  id: string;
  value: string;
}

export interface TrainerOption {
  value: string;
  label: string;
}

export function createRecurringTimeRow(sequence: number, value = ''): RecurringTimeRow {
  return {
    id: `recurring-time-row-${sequence}`,
    value,
  };
}

export function updateRecurringTimeRow(
  rows: RecurringTimeRow[],
  rowId: string,
  value: string
): RecurringTimeRow[] {
  return rows.map((row) => (row.id === rowId ? { ...row, value } : row));
}

export function removeRecurringTimeRow(
  rows: RecurringTimeRow[],
  rowId: string
): RecurringTimeRow[] {
  if (rows.length <= 1) {
    return rows;
  }

  const nextRows = rows.filter((row) => row.id !== rowId);
  return nextRows.length ? nextRows : rows;
}

export function getRecurringTimeValues(rows: RecurringTimeRow[]): string[] {
  return rows
    .map((row) => row.value.trim())
    .filter(Boolean);
}
