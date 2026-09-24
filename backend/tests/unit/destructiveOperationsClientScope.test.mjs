import { describe, expect, it } from 'vitest';
import {
  cancelOperation,
  prepareDestructiveOperation,
} from '../../services/ai/destructiveOperations.mjs';

describe('destructive operation client scope', () => {
  it('allows clientId as an explicit DELETE scope for soft client deactivation', async () => {
    const pending = await prepareDestructiveOperation({
      type: 'DELETE',
      endpoint: '/api/admin/clients/:clientId',
      commandType: 'deactivate_client',
      commandParams: { clientId: 42, softDelete: true },
      userId: 1,
      description: 'Deactivate client account',
      affectedRecords: [{ id: 42, name: 'Client #42' }],
    });

    expect(pending.operationId).toBeTruthy();
    expect(pending.type).toBe('DELETE');
    expect(pending.affectedCount).toBe(1);

    await cancelOperation(pending.operationId, 1);
  });
});
