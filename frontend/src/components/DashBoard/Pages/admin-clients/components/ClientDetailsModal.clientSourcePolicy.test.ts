import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SOURCE = readFileSync(resolve(__dirname, './ClientDetailsModal.tsx'), 'utf8');

describe('ClientDetailsModal client source policy', () => {
  it('uses source-aware session policy copy in the quick-view summary', () => {
    expect(SOURCE).toContain('getClientSessionSignal');
    expect(SOURCE).toContain('const sessionSignal = getClientSessionSignal(client);');
    expect(SOURCE).toContain('<DetailLabel>Session Policy</DetailLabel>');
    expect(SOURCE).toContain('sessionSignal.label');
    expect(SOURCE).toContain('sessionSignal.note');
    expect(SOURCE).not.toContain('<DetailLabel>Available Sessions</DetailLabel>');
    expect(SOURCE).not.toContain('{client.availableSessions ?? 0}');
  });
});
