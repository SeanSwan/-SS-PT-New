import { describe, expect, it } from 'vitest';
import { coachWorkspaceV4Enabled } from './coachWorkspaceFlag';

describe('coach workspace flag', () => {
  it('defaults ON when the env var is absent', () => {
    expect(coachWorkspaceV4Enabled({}, '')).toBe(true);
    expect(coachWorkspaceV4Enabled({ VITE_COACH_WORKSPACE_V4: 'true' }, '?threadId=4')).toBe(true);
  });
  it('the build flag turns it off', () => {
    for (const off of ['false', 'FALSE', ' 0 ', 'off']) expect(coachWorkspaceV4Enabled({ VITE_COACH_WORKSPACE_V4: off }, '')).toBe(false);
    expect(coachWorkspaceV4Enabled({ VITE_COACH_WORKSPACE_V4: false }, '')).toBe(false);
  });
  it('?coachLegacy=1 opens the legacy page for one visit', () => {
    expect(coachWorkspaceV4Enabled({}, '?coachLegacy=1')).toBe(false);
    expect(coachWorkspaceV4Enabled({}, '?workspace=plaud&coachLegacy=true')).toBe(false);
    expect(coachWorkspaceV4Enabled({}, '?coachLegacy=0')).toBe(true);
  });
});
