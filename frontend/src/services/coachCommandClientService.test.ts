import { describe, expect, it, vi } from 'vitest';
import {
  createCoachCommandClientService,
  splitCoachCommandClientName,
} from './coachCommandClientService';

describe('coachCommandClientService', () => {
  it('splits a full name into backend-required first and last name fields', () => {
    expect(splitCoachCommandClientName('Ava Stone')).toEqual({ firstName: 'Ava', lastName: 'Stone' });
    expect(splitCoachCommandClientName('  Ava   Marie   Stone  ')).toEqual({ firstName: 'Ava', lastName: 'Marie Stone' });
    expect(splitCoachCommandClientName('Ava')).toEqual({ firstName: 'Ava', lastName: 'TBD' });
  });

  it('creates a minimal review-gated client through the existing onboarding endpoint', async () => {
    const post = vi.fn().mockResolvedValue({
      data: {
        success: true,
        data: {
          client: {
            id: 77,
            firstName: 'Ava',
            lastName: 'Stone',
            clientSource: 'move_fitness',
          },
          claimCode: 'claim-77',
          claimUrl: 'https://sswanstudios.com/claim/claim-77',
          isMoveFitness: true,
        },
      },
    });

    const service = createCoachCommandClientService({ post });
    const result = await service.createQuickClient({
      fullName: 'Ava Stone',
      clientSource: 'move_fitness',
    });

    expect(post).toHaveBeenCalledWith('/api/clients/onboard', {
      firstName: 'Ava',
      lastName: 'Stone',
      clientSource: 'move_fitness',
      assignToSelf: true,
      generateClaimCode: true,
      availableSessions: 0,
      trainerNotes: 'Created from Coach Command Center quick capture. Operator approval still required before workout writes.',
    });
    expect(result.client.id).toBe(77);
    expect(result.claimCode).toBe('claim-77');
  });

  it('rejects an empty client name before hitting the network', async () => {
    const post = vi.fn();
    const service = createCoachCommandClientService({ post });

    await expect(service.createQuickClient({ fullName: '   ', clientSource: 'swanstudios' })).rejects.toThrow(
      'Client name is required',
    );
    expect(post).not.toHaveBeenCalled();
  });
});
