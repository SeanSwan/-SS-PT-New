import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildAvatarHomeFurnitureUpdate } from '../../utils/avatarHomeFurniture.mjs';

const routeSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../../routes/avatarHomeRoutes.mjs'),
  'utf8'
);

describe('buildAvatarHomeFurnitureUpdate', () => {
  it('builds a valid nested furniture update without dropping existing room data', () => {
    expect(buildAvatarHomeFurnitureUpdate({
      payload: { room: 'training_room', slot: 'mat', item: 'premium_mat' },
      homeTier: 'premium',
      currentFurniture: { training_room: { equipment: 'starter_rack' } },
    })).toEqual({
      error: null,
      status: 200,
      updates: {
        furniture: {
          training_room: {
            equipment: 'starter_rack',
            mat: 'premium_mat',
          },
        },
      },
    });
  });

  it('rejects missing or object-shaped selectors with safe copy', () => {
    expect(buildAvatarHomeFurnitureUpdate({ payload: { room: '', slot: 'mat', item: 'basic_mat' } })).toMatchObject({
      error: 'room, slot, and item are required',
      status: 400,
    });
    expect(buildAvatarHomeFurnitureUpdate({
      payload: { room: 'training_room', slot: 'mat', item: { id: 'basic_mat' } },
    })).toMatchObject({
      error: 'Invalid furniture item',
      status: 400,
    });
  });

  it('rejects invalid room, slot, and item values without echoing raw payloads', () => {
    expect(buildAvatarHomeFurnitureUpdate({
      payload: { room: 'training_room/<script>', slot: 'mat', item: 'basic_mat' },
    }).error).toBe('Invalid room or slot');
    expect(buildAvatarHomeFurnitureUpdate({
      payload: { room: 'training_room', slot: 'unknown', item: 'basic_mat' },
    }).error).toBe('Invalid room or slot');
    expect(buildAvatarHomeFurnitureUpdate({
      payload: { room: 'training_room', slot: 'mat', item: 'unknown_item' },
    }).error).toBe('Invalid furniture item');
  });

  it('enforces the home-tier ceiling with safe copy', () => {
    expect(buildAvatarHomeFurnitureUpdate({
      payload: { room: 'training_room', slot: 'mat', item: 'pro_mat' },
      homeTier: 'starter',
    })).toMatchObject({
      error: 'Item requires a higher home tier',
      status: 403,
    });
  });

  it('keeps the live Avatar Home furniture route wired through the validator', () => {
    expect(routeSource).toContain("import { buildAvatarHomeFurnitureUpdate } from '../utils/avatarHomeFurniture.mjs';");
    expect(routeSource).toContain('const { updates, error, status } = buildAvatarHomeFurnitureUpdate({');
    expect(routeSource).not.toContain('message: `Invalid room/slot: ${room}/${slot}`');
    expect(routeSource).not.toContain('message: `Invalid item: ${item}`');
  });
});
