import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SOURCE = [
  './ClientTrainerAssignments.tsx',
  './ClientTrainerAssignments.types.ts',
  './ClientTrainerAssignments.logic.ts',
  './ClientTrainerAssignments.panels.tsx',
].map((fileName) => readFileSync(resolve(__dirname, fileName), 'utf8')).join('\n');

describe('ClientTrainerAssignments client source policy', () => {
  it('uses source-aware session labels instead of raw available-session copy', () => {
    expect(SOURCE).toContain('getClientSessionSignal');
    expect(SOURCE).toContain('clientSource?: string;');
    expect(SOURCE).toContain('clientSource: client.clientSource ||');
    expect(SOURCE).toContain('const unassignedClientSessionSignal = getClientSessionSignal(client);');
    expect(SOURCE).toContain('const assignedClientSessionSignal = getClientSessionSignal(client);');
    expect(SOURCE).toContain('unassignedClientSessionSignal.label');
    expect(SOURCE).toContain('assignedClientSessionSignal.label');
    expect(SOURCE).not.toContain('{client.availableSessions} sessions available');
    expect(SOURCE).not.toContain('{Number(client.availableSessions || 0)} sessions available');
  });
});
