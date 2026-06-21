import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { normalizeRealtimeXp } from './useGamificationRealtime';

const hookPath = join(process.cwd(), 'src/hooks/gamification/useGamificationRealtime.ts');
const hookSource = () => readFileSync(hookPath, 'utf8');

describe('useGamificationRealtime production contract', () => {
  it('does not simulate gamification events through window mock triggers', () => {
    const source = hookSource();

    expect(source).not.toContain('mockTriggerPointsAwarded');
    expect(source).not.toContain('mockTriggerAchievementUnlocked');
    expect(source).not.toContain('triggerMockEvent');
    expect(source).not.toContain('For demo purposes');
  });

  it('connects through the shared authenticated realtime socket resolver', () => {
    const source = hookSource();

    expect(source).toContain('resolveRealtimeSocketUrl');
    expect(source).toContain('resolveRealtimeSocketTransportOptions');
    expect(source).toContain('ProductionTokenManager.getToken()');
    expect(source).toContain("auth: { token }");
    expect(source).toContain("socket.emit('authenticate', { token })");
  });

  it('normalizes malformed realtime XP before toast copy is built', () => {
    const source = hookSource();

    expect(normalizeRealtimeXp(25)).toBe(25);
    expect(normalizeRealtimeXp('30')).toBe(30);
    expect(normalizeRealtimeXp([45])).toBe(0);
    expect(normalizeRealtimeXp({ valueOf: () => 60 })).toBe(0);
    expect(normalizeRealtimeXp(Number.NaN)).toBe(0);
    expect(normalizeRealtimeXp(Number.POSITIVE_INFINITY)).toBe(0);
    expect(normalizeRealtimeXp(-10)).toBe(0);
    expect(source).toContain('const points = normalizeRealtimeXp(data.points ?? data.xpEarned);');
    expect(source).not.toContain('const points = Number(data.points ?? data.xpEarned ?? 0);');
  });
});
