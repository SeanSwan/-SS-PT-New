import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const LOGGER_SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/WorkoutLogger/WorkoutLogger.tsx'),
  'utf8'
);
const OFFLINE_QUEUE_SOURCE = readFileSync(
  resolve(process.cwd(), 'src/components/WorkoutLogger/useOfflineQueue.ts'),
  'utf8'
);

describe('WorkoutLogger local identity truth contract', () => {
  it('does not use Math.random for active workout logger or offline queue IDs', () => {
    expect(LOGGER_SOURCE).not.toMatch(/Math\.random/);
    expect(OFFLINE_QUEUE_SOURCE).not.toMatch(/Math\.random/);
    expect(LOGGER_SOURCE).toContain('createWorkoutLoggerLocalId');
    expect(OFFLINE_QUEUE_SOURCE).toContain('createOfflineQueueId');
  });
});
