import { describe, expect, it } from 'vitest';
import onboardingCommands from '../../services/ai/commandRegistry/onboardingCommands.mjs';

const orientationQueueCommand = onboardingCommands.find(
  (command) => command.type === 'view_orientation_queue',
);

describe('Swan Coach onboarding command schemas', () => {
  it('preserves orientation queue filters through validation', () => {
    const parsed = orientationQueueCommand.inputSchema.parse({
      page: 2,
      limit: 10,
      status: 'draft',
      package: 'Swan Studios',
    });

    expect(parsed).toEqual({
      page: 2,
      limit: 10,
      status: 'draft',
      package: 'Swan Studios',
    });
  });
});
