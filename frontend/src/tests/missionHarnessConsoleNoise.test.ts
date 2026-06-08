import { describe, expect, it } from 'vitest';
import { isExpectedMissionConsoleNoise } from '../../e2e/mission/missionHarness';

describe('mission console noise filtering', () => {
  it('treats transient Google Fonts connection failures as external mission noise', () => {
    const message = [
      'Failed to load resource: net::ERR_CONNECTION_FAILED',
      '(https://fonts.googleapis.com/css2?family=Source+Sans+3&display=swap)',
    ].join(' ');

    expect(isExpectedMissionConsoleNoise(message)).toBe(true);
  });

  it('does not hide generic connection failures without external font evidence', () => {
    expect(isExpectedMissionConsoleNoise('Failed to load resource: net::ERR_CONNECTION_FAILED')).toBe(false);
  });
});
