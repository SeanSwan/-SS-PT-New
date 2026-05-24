import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const managerSource = readFileSync(resolve(__dirname, 'SessionAllocationManager.tsx'), 'utf8');
const serviceSource = readFileSync(resolve(__dirname, '../../services/sessionService.ts'), 'utf8');

describe('SessionAllocationManager live data contract', () => {
  it('uses live session allocation endpoints instead of seeded allocation fixtures', () => {
    expect(managerSource).toContain('sessionService.getClients()');
    expect(managerSource).toContain('sessionService.getUserSessionSummary(client.id)');
    expect(managerSource).toContain('sessionService.addSessionsToClient(');
    expect(managerSource).not.toContain('mockAllocations');
    expect(managerSource).not.toContain('Sarah');
    expect(managerSource).not.toContain('Michael');
    expect(managerSource).not.toContain('Emma');
  });

  it('keeps the service pointed at the canonical allocation compatibility API', () => {
    expect(serviceSource).toContain("'/api/sessions/add-to-user'");
    expect(serviceSource).toContain('`/api/sessions/user-summary/${userId}`');
    expect(serviceSource).toContain("'/api/sessions/allocation-health'");
  });
});
