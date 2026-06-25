import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { getSourceAwareSessionsRemaining } from '../../controllers/userCreditsController.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const controllerSource = readFileSync(resolve(__dirname, '../../controllers/userCreditsController.mjs'), 'utf8');

describe('user credits clientSource boundary', () => {
  it('returns clientSource with session credits so client schedule copy can respect source policy', () => {
    expect(controllerSource).toContain("attributes: ['id', 'availableSessions', 'clientSource', 'sessionBillingMode', 'masterPromptJson']");
    expect(controllerSource).toContain('clientSource: user.clientSource');
    expect(controllerSource).toContain('sessionBillingMode: user.sessionBillingMode');
  });

  it('masks stale paid credits for free-tracking clients in the client schedule credits endpoint', () => {
    expect(getSourceAwareSessionsRemaining({
      clientSource: 'move_fitness',
      availableSessions: 12,
    })).toBe(0);

    expect(getSourceAwareSessionsRemaining({
      clientSource: 'external',
      availableSessions: 6,
    })).toBe(0);

    expect(getSourceAwareSessionsRemaining({
      clientSource: 'swanstudios',
      sessionBillingMode: 'no_session_required',
      availableSessions: 12,
    })).toBe(0);

    expect(getSourceAwareSessionsRemaining({
      clientSource: 'swanstudios',
      availableSessions: 12,
    })).toBe(12);
  });

  it('normalizes malformed paid-credit balances to non-negative whole sessions', () => {
    expect(getSourceAwareSessionsRemaining({
      clientSource: 'swanstudios',
      availableSessions: 'unknown',
    })).toBe(0);

    expect(getSourceAwareSessionsRemaining({
      clientSource: 'swanstudios',
      availableSessions: -3,
    })).toBe(0);

    expect(getSourceAwareSessionsRemaining({
      clientSource: 'swanstudios',
      availableSessions: 7.8,
    })).toBe(7);
  });
});
