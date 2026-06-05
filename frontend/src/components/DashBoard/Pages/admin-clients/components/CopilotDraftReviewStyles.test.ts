import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-clients/components/CopilotDraftReview.tsx'),
  'utf8',
);

describe('CopilotDraftReview style extraction', () => {
  it('keeps local styled-components outside the draft review renderer', () => {
    expect(source).toContain("from './CopilotDraftReview.styles'");
    expect(source).not.toContain("import styled from 'styled-components'");
    expect(source).not.toContain('const RecommendationTable = styled.table');
    expect(source).not.toContain('const DayExerciseCount = styled.span');
  });
});
