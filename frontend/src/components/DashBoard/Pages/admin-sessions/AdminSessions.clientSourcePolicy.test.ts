import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pageSource = readFileSync(resolve(__dirname, './enhanced-admin-sessions-view.tsx'), 'utf8');
const modalSource = readFileSync(resolve(__dirname, './ViewSessionModal.tsx'), 'utf8');
const modalTypesSource = readFileSync(resolve(__dirname, './ViewSessionModal.types.ts'), 'utf8');
const assignmentSource = readFileSync(resolve(__dirname, './TrainerAssignmentSection.tsx'), 'utf8');
const addSessionsDialogSource = readFileSync(resolve(__dirname, './AdminSessionsAddSessionsDialog.tsx'), 'utf8');
const tableRowSource = readFileSync(resolve(__dirname, './AdminSessionsTableRow.tsx'), 'utf8');
const dataHookSource = readFileSync(resolve(__dirname, './useAdminSessionsData.ts'), 'utf8');

describe('Admin sessions client source policy', () => {
  it('uses source-aware client session labels in the active admin sessions table', () => {
    expect(tableRowSource).toContain('getClientSessionSignal');
    expect(dataHookSource).toContain("import type { Client, Trainer, Session } from './ViewSessionModal.types';");
    expect(modalTypesSource).toContain('clientSource?: string;');
    expect(tableRowSource).toContain('const clientSessionSignal = session.client ? getClientSessionSignal(session.client) : null;');
    expect(addSessionsDialogSource).toContain('const addSessionClientSignal = getClientSessionSignal(client);');
    expect(assignmentSource).toContain('const assignClientSessionSignal = getClientSessionSignal(client);');
    expect(tableRowSource).toContain('clientSessionSignal?.label');
    expect(pageSource).not.toContain('{session.client.availableSessions ?? 0} sessions');
    expect(pageSource).not.toContain('{selectedSession.client.availableSessions ?? 0} sessions');
    expect(pageSource).not.toContain('({client.availableSessions || 0} current sessions)');
    expect(pageSource).not.toContain('{client.availableSessions} sessions available');
  });

  it('uses source-aware client session labels in the view-session modal', () => {
    expect(modalSource).toContain('getClientSessionSignal');
    expect(modalTypesSource).toContain('clientSource?: string;');
    expect(modalSource).toContain('const clientSessionSignal = getClientSessionSignal(session.client);');
    expect(modalSource).toContain('clientSessionSignal.label');
    expect(modalSource).not.toContain('{session.client.availableSessions ?? 0} sessions');
  });
});
