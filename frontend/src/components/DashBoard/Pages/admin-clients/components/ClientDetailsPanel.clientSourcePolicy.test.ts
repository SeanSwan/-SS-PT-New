import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SOURCE = readFileSync(resolve(__dirname, './ClientDetailsPanel.tsx'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/[^\n]*/g, '');

describe('ClientDetailsPanel client source policy', () => {
  it('keeps billing/session purchase controls out of every non-deducting client source', () => {
    expect(SOURCE).toContain("clientSource === 'move_fitness' || clientSource === 'external'");
    expect(SOURCE).toContain('!isNonDeductingClient');
    expect(SOURCE).not.toContain('!isMoveFitness');
  });

  it('routes non-deducting clients to workout tracking copy instead of paid sessions copy', () => {
    expect(SOURCE).toContain("label: isNonDeductingClient ? 'Workout Log' : 'Sessions'");
    expect(SOURCE).toContain('isNonDeductingClient ? renderNonDeductingWorkouts() : renderSessions()');
    expect(SOURCE).toContain('${clientSourceLabel} Client');
  });

  it('normalizes available-session counts before rendering session status chips', () => {
    expect(SOURCE).toContain('normalizeAvailableSessions');
    expect(SOURCE).toContain('const availableSessions = normalizeAvailableSessions(client.availableSessions);');
    expect(SOURCE).toContain("$status={availableSessions > 0 ? 'success' : 'error'}");
    expect(SOURCE).toContain('{availableSessions} Available');
    expect(SOURCE).not.toContain('client.availableSessions > 0');
    expect(SOURCE).not.toContain('{client.availableSessions} Available');
  });
});
