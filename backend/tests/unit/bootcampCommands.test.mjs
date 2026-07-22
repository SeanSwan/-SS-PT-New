/**
 * CC-3c bootcamp command registry contracts — schemas mirror the frontend executor's
 * real-option validation (belt and suspenders: server rejects before dispatch, browser
 * re-validates before applying). All commands are FRONTEND_DISPATCH, non-destructive,
 * trainer/admin-only, class-level (no client ref).
 */
import { describe, expect, it } from 'vitest';
import commands from '../../services/ai/commandRegistry/bootcampCommands.mjs';

const byType = Object.fromEntries(commands.map((c) => [c.type, c]));

describe('bootcamp command registry', () => {
  it('registers exactly the three v1 tools as FRONTEND_DISPATCH, non-destructive, no client ref', () => {
    expect(Object.keys(byType).sort()).toEqual([
      'bootcamp_set_duration', 'bootcamp_set_format', 'bootcamp_set_structure',
    ]);
    for (const cmd of commands) {
      expect(cmd.method).toBe('FRONTEND_DISPATCH');
      expect(cmd.destructive).toBe(false);
      expect(cmd.requiresClientRef).toBe(false);
      expect(cmd.roleRequired).toEqual(['admin', 'trainer']);
      expect(cmd.frontendEvent).toBe(cmd.endpoint);
      expect(cmd.frontendEvent.startsWith('AI_BOOTCAMP_')).toBe(true);
    }
  });

  it('structure schema accepts real builder options and rejects out-of-range', () => {
    const schema = byType.bootcamp_set_structure.inputSchema;
    expect(schema.safeParse({ stations: 5, exercisesPerStation: 3 }).success).toBe(true);
    expect(schema.safeParse({ stations: 99 }).success).toBe(false);
    expect(schema.safeParse({ exercisesPerStation: 0 }).success).toBe(false);
    expect(schema.safeParse({ stations: 4, rogue: true }).success).toBe(false); // strict
  });

  it('duration schema clamps to the builder range 10..120', () => {
    const schema = byType.bootcamp_set_duration.inputSchema;
    expect(schema.safeParse({ minutes: 45 }).success).toBe(true);
    expect(schema.safeParse({ minutes: 5 }).success).toBe(false);
    expect(schema.safeParse({ minutes: 500 }).success).toBe(false);
    expect(schema.safeParse({}).success).toBe(false);
  });

  it('format schema bounds OPT phase 1..5', () => {
    const schema = byType.bootcamp_set_format.inputSchema;
    expect(schema.safeParse({ optPhase: 2 }).success).toBe(true);
    expect(schema.safeParse({ optPhase: 9 }).success).toBe(false);
    expect(schema.safeParse({ classStyle: 'low_impact' }).success).toBe(true);
  });
});
