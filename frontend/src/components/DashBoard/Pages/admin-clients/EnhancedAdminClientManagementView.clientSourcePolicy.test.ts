import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SOURCE = readFileSync(resolve(__dirname, './EnhancedAdminClientManagementView.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/[^\n]*/g, '');

describe('EnhancedAdminClientManagementView client source policy', () => {
  it('uses source-aware session policy copy in the admin client table', () => {
    expect(SOURCE).toContain('getClientSessionSignal');
    expect(SOURCE).toContain('const sessionSignal = getClientSessionSignal(client);');
    expect(SOURCE).toContain('sessionSignal.label');
    expect(SOURCE).toContain('sessionSignal.note');
    expect(SOURCE).not.toContain('<CaptionText>Sessions</CaptionText>');
  });

  it('uses the same source-aware policy in the admin client CSV export', () => {
    expect(SOURCE).toContain("const csvHeaders = 'Name,Email,Phone,Session Policy,Billing Note,Created\\n';");
    expect(SOURCE).toContain('const csvSessionSignal = getClientSessionSignal(c);');
    expect(SOURCE).toContain('csvSessionSignal.label');
    expect(SOURCE).toContain('csvSessionSignal.note');
    expect(SOURCE).not.toContain("const csvHeaders = 'Name,Email,Phone,Sessions,Created\\n';");
    expect(SOURCE).not.toContain('c.availableSessions || 0');
  });
});
