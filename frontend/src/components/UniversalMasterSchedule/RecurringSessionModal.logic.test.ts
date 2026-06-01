import { describe, expect, it } from 'vitest';
import {
  createRecurringTimeRow,
  getRecurringTimeValues,
  removeRecurringTimeRow,
  updateRecurringTimeRow,
} from './RecurringSessionModal.logic';

describe('RecurringSessionModal time row identity', () => {
  it('keeps editable time rows keyed by row identity instead of array order', () => {
    const first = createRecurringTimeRow(1, '09:00');
    const second = createRecurringTimeRow(2, '10:00');

    const updated = updateRecurringTimeRow([first, second], first.id, '09:30');
    expect(updated).toEqual([
      { id: first.id, value: '09:30' },
      second,
    ]);

    const removed = removeRecurringTimeRow(updated, first.id);
    expect(removed).toEqual([second]);
  });

  it('keeps at least one time row and trims payload values', () => {
    const onlyRow = createRecurringTimeRow(1, '  ');

    expect(removeRecurringTimeRow([onlyRow], onlyRow.id)).toEqual([onlyRow]);
    expect(getRecurringTimeValues([
      createRecurringTimeRow(1, ' 09:00 '),
      createRecurringTimeRow(2, ''),
      createRecurringTimeRow(3, '10:30'),
    ])).toEqual(['09:00', '10:30']);
  });
});
