import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourceRoot = resolve(__dirname);
const pagePath = resolve(sourceRoot, './enhanced-admin-sessions-view.tsx');
const dialogStackPath = resolve(sourceRoot, './AdminSessionsDialogStack.tsx');
const deleteDialogsPath = resolve(sourceRoot, './AdminSessionsDeleteDialogs.tsx');
const addSessionsDialogPath = resolve(sourceRoot, './AdminSessionsAddSessionsDialog.tsx');
const editSessionDialogPath = resolve(sourceRoot, './AdminSessionsEditSessionDialog.tsx');
const newSessionDialogPath = resolve(sourceRoot, './AdminSessionsNewSessionDialog.tsx');

const readSource = (path: string) => readFileSync(path, 'utf8');
const lineCount = (source: string) => source.split(/\r?\n/).length;

describe('Admin sessions dialog extraction', () => {
  it('keeps destructive delete dialogs extracted from the canonical page', () => {
    const pageSource = readSource(pagePath);
    const stackSource = readSource(dialogStackPath);
    const dialogsSource = readSource(deleteDialogsPath);

    expect(existsSync(deleteDialogsPath), 'AdminSessionsDeleteDialogs.tsx should exist').toBe(true);
    expect(stackSource).toContain("import AdminSessionsDeleteDialogs from './AdminSessionsDeleteDialogs'");
    expect(stackSource).toContain('<AdminSessionsDeleteDialogs');
    expect(pageSource).not.toContain('{/* Delete Confirmation Dialog */}');
    expect(pageSource).not.toContain('{/* Bulk Delete Confirmation Dialog */}');
    expect(dialogsSource).toContain('Confirm Delete');
    expect(dialogsSource).toContain('Bulk Delete Sessions');
    expect(dialogsSource).not.toContain("import styled from 'styled-components'");
    expect(dialogsSource).not.toMatch(/const [A-Z][A-Za-z0-9]+ = styled\./);
    expect(lineCount(dialogsSource)).toBeLessThanOrEqual(220);
  });

  it('keeps add-sessions dialog extracted with client-source labels intact', () => {
    const pageSource = readSource(pagePath);
    const stackSource = readSource(dialogStackPath);
    const dialogSource = readSource(addSessionsDialogPath);

    expect(existsSync(addSessionsDialogPath), 'AdminSessionsAddSessionsDialog.tsx should exist').toBe(true);
    expect(stackSource).toContain("import AdminSessionsAddSessionsDialog from './AdminSessionsAddSessionsDialog'");
    expect(stackSource).toContain('<AdminSessionsAddSessionsDialog');
    expect(pageSource).not.toContain('{/* Add Sessions Dialog */}');
    expect(dialogSource).toContain('Add Sessions to Client');
    expect(dialogSource).toContain('const addSessionClientSignal = getClientSessionSignal(client);');
    expect(dialogSource).not.toContain("import styled from 'styled-components'");
    expect(dialogSource).not.toMatch(/const [A-Z][A-Za-z0-9]+ = styled\./);
    expect(lineCount(dialogSource)).toBeLessThanOrEqual(220);
  });

  it('keeps edit-session dialog extracted from the canonical page', () => {
    const pageSource = readSource(pagePath);
    const stackSource = readSource(dialogStackPath);
    const dialogSource = readSource(editSessionDialogPath);

    expect(existsSync(editSessionDialogPath), 'AdminSessionsEditSessionDialog.tsx should exist').toBe(true);
    expect(stackSource).toContain("import AdminSessionsEditSessionDialog from './AdminSessionsEditSessionDialog'");
    expect(stackSource).toContain('<AdminSessionsEditSessionDialog');
    expect(pageSource).not.toContain('{/* Edit Session Dialog */}');
    expect(dialogSource).toContain('Edit Session');
    expect(dialogSource).toContain('Save Changes');
    expect(dialogSource).not.toContain("import styled from 'styled-components'");
    expect(dialogSource).not.toMatch(/const [A-Z][A-Za-z0-9]+ = styled\./);
    expect(lineCount(dialogSource)).toBeLessThanOrEqual(240);
  });

  it('keeps new-session dialog extracted from the canonical page', () => {
    const pageSource = readSource(pagePath);
    const stackSource = readSource(dialogStackPath);
    const dialogSource = readSource(newSessionDialogPath);

    expect(existsSync(newSessionDialogPath), 'AdminSessionsNewSessionDialog.tsx should exist').toBe(true);
    expect(stackSource).toContain("import AdminSessionsNewSessionDialog from './AdminSessionsNewSessionDialog'");
    expect(stackSource).toContain('<AdminSessionsNewSessionDialog');
    expect(pageSource).not.toContain('{/* New Session Dialog */}');
    expect(dialogSource).toContain('Schedule New Session Slot');
    expect(dialogSource).toContain('Create Session Slot');
    expect(dialogSource).not.toContain("import styled from 'styled-components'");
    expect(dialogSource).not.toMatch(/const [A-Z][A-Za-z0-9]+ = styled\./);
    expect(lineCount(dialogSource)).toBeLessThanOrEqual(220);
  });

  it('keeps the admin session dialog stack extracted from the canonical page', () => {
    const pageSource = readSource(pagePath);
    const stackSource = readSource(dialogStackPath);

    expect(existsSync(dialogStackPath), 'AdminSessionsDialogStack.tsx should exist').toBe(true);
    expect(pageSource).toContain("import AdminSessionsDialogStack from './AdminSessionsDialogStack'");
    expect(pageSource).toContain('<AdminSessionsDialogStack');
    expect(pageSource).not.toContain('<ViewSessionModal');
    expect(pageSource).not.toContain('<AdminSessionsEditSessionDialog');
    expect(pageSource).not.toContain('<AdminSessionsNewSessionDialog');
    expect(pageSource).not.toContain('<AdminSessionsAddSessionsDialog');
    expect(pageSource).not.toContain('<AdminSessionsDeleteDialogs');
    expect(stackSource).toContain("from './ViewSessionModal'");
    expect(stackSource).toContain("from './AdminSessionsEditSessionDialog'");
    expect(stackSource).toContain("from './AdminSessionsNewSessionDialog'");
    expect(stackSource).toContain("from './AdminSessionsAddSessionsDialog'");
    expect(stackSource).toContain("from './AdminSessionsDeleteDialogs'");
    expect(stackSource).not.toContain("import styled from 'styled-components'");
    expect(stackSource).not.toMatch(/const [A-Z][A-Za-z0-9]+ = styled\./);
    expect(lineCount(stackSource)).toBeLessThanOrEqual(300);
  });
});
