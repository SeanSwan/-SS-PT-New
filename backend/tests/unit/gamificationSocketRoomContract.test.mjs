import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

const socketManagerSource = () =>
  readFileSync(resolve(__dirname, '../../socket/socketManager.mjs'), 'utf8');

const gamificationEventsSource = () =>
  readFileSync(resolve(__dirname, '../../socket/gamificationEvents.mjs'), 'utf8');

describe('gamification socket room contract', () => {
  it('puts authenticated sockets into user rooms used by gamification event broadcasts', () => {
    const source = socketManagerSource();
    const joinUserRoom = source.slice(
      source.indexOf('async function joinUserRoom'),
      source.indexOf('/**\n * Join user to role-based rooms')
    );
    const joinDashboardRooms = source.slice(
      source.indexOf('async function joinDashboardRooms'),
      source.indexOf('/**\n   * Join user to a specific session room')
    );

    expect(source).toContain("const GAMIFICATION_ROOM = 'gamification';");
    expect(joinUserRoom).toContain('const roomName = `user:${userId}`;');
    expect(joinDashboardRooms).toContain('const dashboardRooms = [GAMIFICATION_ROOM];');
    expect(gamificationEventsSource()).toContain("const targetRoom = userId ? `user:${userId}` : 'gamification';");
    expect(gamificationEventsSource()).toContain('io.to(targetRoom).emit');
  });
});
