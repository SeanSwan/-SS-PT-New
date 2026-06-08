import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CreateExternalClientSchema } from '../../schemas/clientSource.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const controllerSource = readFileSync(resolve(__dirname, '../../controllers/adminClientController.mjs'), 'utf8');
const clientSourceSchema = readFileSync(resolve(__dirname, '../../schemas/clientSource.mjs'), 'utf8');

describe('admin client assign-trainer clientSource boundary', () => {
  it('keeps the external-client create schema out of SwanStudios paid-client creation', () => {
    expect(CreateExternalClientSchema.safeParse({
      firstName: 'Mia',
      lastName: 'Reed',
      email: 'mia@example.test',
      clientSource: ' Move Fitness ',
    }).data?.clientSource).toBe('move_fitness');

    expect(CreateExternalClientSchema.safeParse({
      firstName: 'Ari',
      lastName: 'Lane',
      email: 'ari@example.test',
      clientSource: 'external',
    }).data?.clientSource).toBe('external');

    expect(CreateExternalClientSchema.safeParse({
      firstName: 'Paid',
      lastName: 'Client',
      email: 'paid@example.test',
      clientSource: 'swanstudios',
    }).success).toBe(false);
  });

  it('does not create paid session inventory for non-deducting client sources', () => {
    const start = controllerSource.indexOf('async createClient');
    const end = controllerSource.indexOf('async updateClient', start);
    const source = controllerSource.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(source).toContain('const requestedAvailableSessions = parseNonNegativeSessionCount(availableSessions);');
    expect(source).toContain('const normalizedClientSource = parseClientSource(clientSource);');
    expect(source).toContain('const normalizedAvailableSessions = NON_DEDUCTING_CLIENT_SOURCES.has(normalizedClientSource)');
    expect(source).toContain('availableSessions: normalizedAvailableSessions');
    expect(source).toContain('clientSource: normalizedClientSource');
    expect(source).toContain('await createClientTrainerAssignmentIfRequested({');
    expect(source).toContain('if (trainerIdValue && normalizedAvailableSessions > 0)');
    expect(source.indexOf('await createClientTrainerAssignmentIfRequested({')).toBeLessThan(
      source.indexOf('if (trainerIdValue && normalizedAvailableSessions > 0)')
    );
    expect(source).not.toContain('availableSessions,\n        clientSource');
    expect(source).not.toContain('if (trainerId && availableSessions > 0)');
  });

  it('carries external-client trainer assignment without minting paid inventory', () => {
    const start = controllerSource.indexOf('async createExternalClient');
    const end = controllerSource.indexOf('export default', start);
    const source = controllerSource.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(clientSourceSchema).toContain('trainerId:');
    expect(source).toContain('trainerId,');
    expect(source).toContain('const normalizedClientSource = parseClientSource(clientSource);');
    expect(source).toContain('await createClientTrainerAssignmentIfRequested({');
    expect(source).toContain('clientId: newClient.id,');
    expect(source).toContain('clientSource: normalizedClientSource');
    expect(source).not.toContain('Session.bulkCreate');
    expect(source).not.toContain("client.increment('availableSessions'");
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
