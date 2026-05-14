import { describe, expect, it } from 'vitest';
import { ADMIN_ALWAYS_ENABLED_COACH_COMMAND_FLAGS } from '../config/coachCommandFlags';
import { buildAdminFeatureFlags } from './FeatureAccessContext';

describe('FeatureAccessContext coach command flags', () => {
  it('enables every coach command rollout flag for admins', () => {
    const flags = buildAdminFeatureFlags();

    expect(flags['content-studio']).toBe(true);
    expect(flags['workout-planner-pro']).toBe(true);

    for (const flag of ADMIN_ALWAYS_ENABLED_COACH_COMMAND_FLAGS) {
      expect(flags[flag]).toBe(true);
    }
  });
});
