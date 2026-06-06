import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SOURCE = readFileSync(resolve(process.cwd(), 'src/services/enhancedClientDashboardService.ts'), 'utf8');

describe('enhancedClientDashboardService realtime origin contract', () => {
  it('uses the shared Socket.IO origin resolver for realtime dashboard connections', () => {
    expect(SOURCE).toContain('resolveRealtimeSocketTransportOptions');
    expect(SOURCE).toContain('resolveRealtimeSocketUrl');
    expect(SOURCE).toContain('const WEBSOCKET_URL = resolveRealtimeSocketUrl({');
    expect(SOURCE).toContain('const WEBSOCKET_TRANSPORT_OPTIONS = resolveRealtimeSocketTransportOptions(WEBSOCKET_URL)');
    expect(SOURCE).not.toContain("transports: ['websocket', 'polling']");
    expect(SOURCE).not.toContain('? PRODUCTION_URL // WebSocket integrated into main backend');
  });
});
