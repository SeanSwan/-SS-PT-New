import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const hookPath = join(__dirname, '..', 'hooks', 'use-socket.ts');

describe('legacy admin websocket truth contract', () => {
  it('does not convert missing websocket support into a mock connected socket', () => {
    const source = readFileSync(hookPath, 'utf8');

    expect(source).not.toMatch(/createMockWebSocket/);
    expect(source).not.toMatch(/REACT_APP_FORCE_MOCK_WEBSOCKET/);
    expect(source).not.toMatch(/REACT_APP_MOCK_WEBSOCKET/);
    expect(source).not.toMatch(/Using mock WebSocket/i);
    expect(source).not.toMatch(/Using mock data/i);
    expect(source).not.toMatch(/setIsConnected\(true\);\s*\/\/[^\n]*mock/i);
    expect(source).toMatch(/isLegacyWsEndpoint/);
    expect(source).toMatch(/Legacy WebSocket endpoint/);
  });
});
