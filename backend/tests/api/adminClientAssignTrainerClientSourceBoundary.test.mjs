import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const controllerSource = readFileSync(resolve(__dirname, '../../controllers/adminClientController.mjs'), 'utf8');

describe('admin client assign-trainer clientSource boundary', () => {
  it('does not create paid session inventory for non-deducting client sources', () => {
    const start = controllerSource.indexOf('async createClient');
    const end = controllerSource.indexOf('async updateClient', start);
    const source = controllerSource.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(source).toContain('const requestedAvailableSessions = parseNonNegativeSessionCount(availableSessions);');
    expect(source).toContain('const normalizedAvailableSessions = NON_DEDUCTING_CLIENT_SOURCES.has(clientSource)');
    expect(source).toContain('availableSessions: normalizedAvailableSessions');
    expect(source).toContain('if (trainerId && normalizedAvailableSessions > 0)');
    expect(source).not.toContain('availableSessions,\n        clientSource');
    expect(source).not.toContain('if (trainerId && availableSessions > 0)');
  });

  it('does not mint paid session inventory for non-deducting client sources', () => {
    const start = controllerSource.indexOf('async assignTrainer');
    const end = controllerSource.indexOf('async getClientWorkoutStats', start);
    const source = controllerSource.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(controllerSource).toContain("import { NON_DEDUCTING_CLIENT_SOURCES } from '../services/sessionBillingPolicy.mjs';");
    expect(source).toContain('NON_DEDUCTING_CLIENT_SOURCES.has(client.clientSource)');
    expect(source).toContain('Trainer session assignment is disabled for free-tracking clients');
    expect(source.indexOf('NON_DEDUCTING_CLIENT_SOURCES.has(client.clientSource)')).toBeLessThan(
      source.indexOf("client.increment('availableSessions'")
    );
  });
});
