import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const controllerPath = resolve(__dirname, '../../controllers/adminSettingsController.mjs');

describe('admin settings audit truth contract', () => {
  it('does not return fabricated settings audit logs', () => {
    const source = readFileSync(controllerPath, 'utf8');

    expect(source).not.toContain('mockAuditLogs');
    expect(source).not.toContain('admin@swanstudios.com');
    expect(source).not.toContain('admin2@swanstudios.com');
    expect(source).not.toContain('192.168.1.100');
    expect(source).not.toContain('192.168.1.101');
    expect(source).toContain("'audit_logs'");
    expect(source).toContain('appendSettingsAuditLog');
  });
});
