import { describe, expect, it } from 'vitest';
import { getAllCommands, initializeRegistry } from '../../services/ai/commandRegistry/index.mjs';

const EFFECTS = new Set(['read', 'draft', 'write', 'external', 'destructive']);
const SCOPES = new Set(['self', 'client', 'entity', 'global']);
const REVERSIBILITY = new Set(['none', 'inverse', 'compensation']);

describe('S2 server-owned command policy', () => {
  it('normalizes every registered command into an explicit conservative policy', () => {
    initializeRegistry();
    const commands = getAllCommands();

    expect(commands.length).toBeGreaterThan(0);
    for (const command of commands) {
      expect(command.policy).toMatchObject({
        policyVersion: 1,
        capabilityVersion: 1,
        requiredDomainStates: [],
      });
      expect(SCOPES.has(command.policy.scopeKind)).toBe(true);
      expect(EFFECTS.has(command.policy.effect)).toBe(true);
      expect(REVERSIBILITY.has(command.policy.reversibility)).toBe(true);
      expect(typeof command.policy.ownerResolverKey).toBe('string');
    }
  });

  it('marks client-scoped and destructive commands without promising undo', () => {
    initializeRegistry();
    const commands = getAllCommands();
    const clientMutation = commands.find((command) => command.requiresClientRef && command.requiresConfirmation);
    const destructive = commands.find((command) => command.destructive);

    expect(clientMutation.policy).toMatchObject({ scopeKind: 'client', ownerResolverKey: 'client_assignment' });
    expect(destructive.policy).toMatchObject({ effect: 'destructive', reversibility: 'none' });
  });

  it('classifies browser-dispatch commands as drafts rather than server writes', () => {
    initializeRegistry();
    const browserCommand = getAllCommands().find((command) => command.method === 'FRONTEND_DISPATCH');
    expect(browserCommand.policy).toMatchObject({ effect: 'draft', reversibility: 'none' });
  });
});
