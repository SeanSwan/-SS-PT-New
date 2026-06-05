import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-clients/components/LongHorizonContent.tsx'),
  'utf8',
);

describe('LongHorizonContent style extraction', () => {
  it('keeps local styled-components outside the long-horizon state machine', () => {
    expect(source).not.toContain("import styled from 'styled-components'");
    expect(source).not.toContain('const HorizonRadioGroup = styled.div');
    expect(source).not.toContain('const SavedMetaStrong = styled.strong');
  });
});
