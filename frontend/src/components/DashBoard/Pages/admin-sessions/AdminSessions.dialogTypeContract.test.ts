import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

const readSource = (fileName: string) =>
  readFileSync(resolve(__dirname, fileName), 'utf8');

describe('Admin sessions dialog type contract', () => {
  it('keeps canonical session dialogs on the shared admin session types', () => {
    const dialogFiles = [
      './AdminSessionsAddSessionsDialog.tsx',
      './AdminSessionsNewSessionDialog.tsx',
      './AdminSessionsEditSessionDialog.tsx',
    ];

    dialogFiles.forEach((fileName) => {
      const source = readSource(fileName);

      expect(source).toContain("from './ViewSessionModal.types'");
      expect(source).not.toMatch(/interface\s+(Client|Trainer|Session)\b/);
    });

    const editSource = readSource('./AdminSessionsEditSessionDialog.tsx');
    expect(editSource).toContain('SessionStatus');
    expect(editSource).not.toMatch(/type\s+SessionStatus\s*=\s*'available'/);
  });
});
