import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (fileName: string) => readFileSync(resolve(__dirname, fileName), 'utf8');

describe('UserDashboard V3 Teach Me Coach handoff', () => {
  it('passes a Coach prompt handoff into every mounted Teach Me guide', () => {
    const source = read('./UserDashboard.V3.tsx');

    expect(source).toContain("import { buildUserDashboardTeachCoachRoute } from './UserDashboardTeachCoachRoute'");
    expect(source).toContain('const handleTeachMeCoachPrompt = React.useCallback');
    expect(source).toContain('navigate(buildUserDashboardTeachCoachRoute(prompt))');
    expect((source.match(/onAskCoach={handleTeachMeCoachPrompt}/g) || [])).toHaveLength(2);
  });
});
