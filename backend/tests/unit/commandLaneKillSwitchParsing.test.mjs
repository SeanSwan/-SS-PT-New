/**
 * Card 1.5 / finding FF23 — a kill switch must actually kill.
 *
 * The original check was `!== 'false'`, and its own comment celebrated that a
 * typo could never cause an outage. The inverted property is the dangerous one:
 * a typo could never STOP one. An operator reaching for the switch mid-incident
 * types whatever their fingers produce — `False`, `FALSE`, `0`, a trailing
 * space — and every one of those left the lane hot while the operator believed
 * writes were paused.
 *
 * For a kill switch, availability-of-DISABLE dominates availability-of-service.
 */
import { describe, it, expect, afterEach } from 'vitest';
import {
  isCommandLaneEnabled, areCommandWritesEnabled,
  parsesAsDisabled, isNonCanonicalFlagValue, describeLaneControls,
} from '../../services/ai/commandLaneControls.mjs';

const ORIGINAL = {
  commands: process.env.AI_COMMANDS_ENABLED,
  writes: process.env.AI_COMMAND_WRITES_ENABLED,
};

afterEach(() => {
  if (ORIGINAL.commands === undefined) delete process.env.AI_COMMANDS_ENABLED;
  else process.env.AI_COMMANDS_ENABLED = ORIGINAL.commands;
  if (ORIGINAL.writes === undefined) delete process.env.AI_COMMAND_WRITES_ENABLED;
  else process.env.AI_COMMAND_WRITES_ENABLED = ORIGINAL.writes;
});

describe('the switch disables on what an operator actually types', () => {
  for (const value of ['false', 'False', 'FALSE', ' false ', '0', 'no', 'off', 'OFF']) {
    it(`AI_COMMANDS_ENABLED=${JSON.stringify(value)} disables the lane`, () => {
      process.env.AI_COMMANDS_ENABLED = value;
      expect(isCommandLaneEnabled()).toBe(false);
    });
    it(`AI_COMMAND_WRITES_ENABLED=${JSON.stringify(value)} disables writes`, () => {
      process.env.AI_COMMAND_WRITES_ENABLED = value;
      expect(areCommandWritesEnabled()).toBe(false);
    });
  }
});

describe('the switch stays ON for everything else — default-enabled is preserved', () => {
  for (const value of [undefined, '', 'true', 'TRUE', '1', 'yes', 'on']) {
    it(`AI_COMMANDS_ENABLED=${JSON.stringify(value)} leaves the lane enabled`, () => {
      if (value === undefined) delete process.env.AI_COMMANDS_ENABLED;
      else process.env.AI_COMMANDS_ENABLED = value;
      expect(isCommandLaneEnabled()).toBe(true);
    });
  }

  it('a TYPO does not disable — but it is reported, so the operator finds out from the logs', () => {
    process.env.AI_COMMANDS_ENABLED = 'flase';
    expect(isCommandLaneEnabled()).toBe(true);          // fail-open on garbage
    expect(isNonCanonicalFlagValue('flase')).toBe(true); // ...and say so
    expect(describeLaneControls().nonCanonicalValues).toContain('AI_COMMANDS_ENABLED');
  });

  it('canonical values are never reported as non-canonical', () => {
    for (const v of ['true', 'false', '1', '0', 'YES', 'off', '', undefined]) {
      expect(isNonCanonicalFlagValue(v)).toBe(false);
    }
  });
});

describe('describeLaneControls reports EFFECTIVE state', () => {
  it('reflects the switches rather than the raw env strings', () => {
    process.env.AI_COMMANDS_ENABLED = 'False';
    process.env.AI_COMMAND_WRITES_ENABLED = 'on';
    expect(describeLaneControls()).toMatchObject({ commandsEnabled: false, writesEnabled: true });
  });

  it('parsesAsDisabled ignores non-strings rather than coercing them', () => {
    expect(parsesAsDisabled(false)).toBe(false);
    expect(parsesAsDisabled(0)).toBe(false);
    expect(parsesAsDisabled(null)).toBe(false);
  });
});
