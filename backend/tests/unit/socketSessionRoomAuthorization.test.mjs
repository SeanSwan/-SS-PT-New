import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SOURCE = readFileSync(resolve(process.cwd(), 'socket/socketManager.mjs'), 'utf8');

describe('socket session-room authorization contract', () => {
  it('normalizes admin roles before allowing a session-room join', () => {
    expect(SOURCE).toContain("String(user.role || '').toUpperCase() === 'ADMIN'");
  });

  it('rejects malformed session identifiers instead of parseInt prefix matches', () => {
    expect(SOURCE).toContain('Number(sessionId)');
    expect(SOURCE).toContain('Number.isSafeInteger');
    expect(SOURCE).not.toContain('Number.parseInt(String(sessionId), 10)');
  });
});
