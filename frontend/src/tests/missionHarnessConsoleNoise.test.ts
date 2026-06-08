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

  it('treats Render Socket.IO polling cleanup as production read-only mission noise when Chromium includes the URL', () => {
    const originalMode = process.env.SWAN_MISSION_QA_MODE;
    process.env.SWAN_MISSION_QA_MODE = 'prod-readonly';

    try {
      expect(isExpectedMissionConsoleNoise(
        'Failed to load resource: the server responded with a status of 400 () '
          + '(https://ss-pt-new.onrender.com/socket.io/?EIO=4&transport=polling&t=2h5175rq&sid=abc)'
      )).toBe(true);
    } finally {
      process.env.SWAN_MISSION_QA_MODE = originalMode;
    }
  });

  it('does not hide production API 400 errors when Chromium includes the URL', () => {
    const originalMode = process.env.SWAN_MISSION_QA_MODE;
    process.env.SWAN_MISSION_QA_MODE = 'prod-readonly';

    try {
      expect(isExpectedMissionConsoleNoise(
        'Failed to load resource: the server responded with a status of 400 () '
          + '(https://sswanstudios.com/api/workout/recommendations)'
      )).toBe(false);
    } finally {
      process.env.SWAN_MISSION_QA_MODE = originalMode;
    }
  });
});
